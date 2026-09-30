import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import type { ProjectSite } from "@/types/project-site";
import { getExpenses } from "@/lib/data/expenses";

const STORAGE_KEY = "elsaghir-eldahshan-project-sites";
const CHANGE_EVENT = "elsaghir-eldahshan-project-sites-changed";

function canUseStorage() {
  return typeof window !== "undefined";
}

function parseArray(raw: string | null): unknown[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;

    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      for (const key of ["sites", "projectSites", "items", "data"]) {
        if (Array.isArray(record[key])) return record[key] as unknown[];
      }
    }

    return [];
  } catch {
    return [];
  }
}

function normalizeProjectSite(value: unknown): ProjectSite | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<ProjectSite> & Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : "";
  const projectId = typeof item.projectId === "string" ? item.projectId : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";

  if (!id || !projectId || !name) return null;

  const now = new Date().toISOString();
  return {
    id,
    projectId,
    name,
    address: typeof item.address === "string" ? item.address : undefined,
    responsiblePerson:
      typeof item.responsiblePerson === "string"
        ? item.responsiblePerson
        : undefined,
    notes: typeof item.notes === "string" ? item.notes : undefined,
    active: typeof item.active === "boolean" ? item.active : true,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
  };
}

/**
 * Reads the canonical key and also performs a one-time defensive migration
 * from older/local variants. Older builds did not always use exactly the same
 * storage key or object wrapper, which could make a site visible in the
 * Projects page but unavailable to other modules.
 */
function migrateLegacySites() {
  if (!canUseStorage()) return;

  const candidates: unknown[] = [];
  const seenKeys = new Set<string>();

  const collect = (key: string) => {
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    candidates.push(...parseArray(window.localStorage.getItem(key)));
  };

  collect(STORAGE_KEY);

  const knownLegacyKeys = [
    "elsaghir-eldahshan-sites",
    "elsaghir-eldahshan-projectSites",
    "elsaghir-eldahshan-project_sites",
    "accounting-system-project-sites",
    "accounting-project-sites",
    "project-sites",
    "projectSites",
    "sites",
  ];

  for (const key of knownLegacyKeys) collect(key);

  // Also recover from any older key whose stored value actually contains
  // project-site shaped records. This is intentionally shape-based so it does
  // not depend on a hard-coded legacy key name.
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || seenKeys.has(key)) continue;

    const raw = window.localStorage.getItem(key);
    const parsed = parseArray(raw);
    if (parsed.some((item) => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return (
        typeof record.id === "string" &&
        typeof record.projectId === "string" &&
        typeof record.name === "string"
      );
    })) {
      collect(key);
    }
  }

  const recovered: ProjectSite[] = [];
  const existingIds = new Set<string>();

  for (const value of candidates) {
    const site = normalizeProjectSite(value);
    if (!site || existingIds.has(site.id)) continue;
    recovered.push(site);
    existingIds.add(site.id);
  }

  const currentRaw = window.localStorage.getItem(STORAGE_KEY);
  const current = parseArray(currentRaw)
    .map(normalizeProjectSite)
    .filter((item): item is ProjectSite => Boolean(item));

  const needsRewrite =
    recovered.length !== current.length ||
    recovered.some((site, index) => {
      const currentSite = current[index];
      return (
        !currentSite ||
        currentSite.id !== site.id ||
        currentSite.projectId !== site.projectId ||
        currentSite.name !== site.name
      );
    });

  if (needsRewrite) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recovered));
  }
}

function read(): ProjectSite[] {
  if (!canUseStorage()) return [];

  try {
    migrateLegacySites();
    return parseArray(window.localStorage.getItem(STORAGE_KEY))
      .map(normalizeProjectSite)
      .filter((item): item is ProjectSite => Boolean(item));
  } catch {
    return [];
  }
}

function notifyChanged() {
  if (!canUseStorage()) return;

  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function save(items: ProjectSite[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notifyChanged();
}

export function getProjectSites(projectId?: string) {
  const items = read();
  return projectId ? items.filter((item) => item.projectId === projectId) : items;
}

export function getProjectSiteById(id: string) {
  return read().find((item) => item.id === id);
}

export function addProjectSite(
  input: Omit<ProjectSite, "id" | "createdAt" | "updatedAt">,
) {
  assertCurrentUserPermission("create");
  if (!input.projectId) throw new Error("المشروع مطلوب.");
  if (!input.name.trim()) throw new Error("اسم الموقع مطلوب.");

  const now = new Date().toISOString();
  const site: ProjectSite = {
    ...input,
    id: crypto.randomUUID(),
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
  };

  save([...read(), site]);

  addAuditLog({
    action: "create",
    entity: "project_site",
    entityId: site.id,
    description: `تمت إضافة موقع ${site.name}.`,
    notificationTitle: "إضافة موقع",
    notificationType: "success",
    notificationHref: `/projects/${site.projectId}`,
  });

  return site;
}

export function updateProjectSite(
  id: string,
  updates: Partial<Omit<ProjectSite, "id" | "createdAt">>,
) {
  assertCurrentUserPermission("update");

  const items = read();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("الموقع غير موجود.");

  const previous = items[index];
  const next = {
    ...previous,
    ...updates,
    name: updates.name?.trim() ?? previous.name,
    updatedAt: new Date().toISOString(),
  };

  if (!next.name) throw new Error("اسم الموقع مطلوب.");

  items[index] = next;
  save(items);

  addAuditLog({
    action: "update",
    entity: "project_site",
    entityId: id,
    description: `تم تعديل موقع ${next.name}.`,
    notificationTitle: "تعديل موقع",
    notificationType: "info",
    notificationHref: `/projects/${next.projectId}`,
    metadata: { previous, updates },
  });

  return next;
}

export function deleteProjectSite(id: string) {
  assertCurrentUserPermission("delete");

  const site = getProjectSiteById(id);
  if (!site) throw new Error("الموقع غير موجود.");

  const hasFinancialMovements = getExpenses().some((expense) => expense.siteId === id);
  if (hasFinancialMovements) {
    throw new Error("لا يمكن حذف الموقع لأنه مرتبط بحركات مالية. عطّل الموقع بدلًا من حذفه.");
  }

  if (canUseStorage()) {
    try {
      const raw = window.localStorage.getItem("elsaghir-eldahshan-contractor-site-assignments");
      const assignments = raw ? JSON.parse(raw) : [];
      if (Array.isArray(assignments) && assignments.some((item) => item?.siteId === id)) {
        throw new Error("لا يمكن حذف الموقع لأنه مرتبط بمقاولين. عطّل الموقع بدلًا من حذفه.");
      }
      const workerAssignmentRaw = window.localStorage.getItem("elsaghir-eldahshan-worker-site-assignments");
      const workerAssignments = workerAssignmentRaw ? JSON.parse(workerAssignmentRaw) : [];
      if (Array.isArray(workerAssignments) && workerAssignments.some((item) => item?.siteId === id)) {
        throw new Error("لا يمكن حذف الموقع لأنه مرتبط بفترات عمل للعمال. عطّل الموقع بدلًا من حذفه.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("لا يمكن حذف الموقع")) throw error;
    }
  }

  save(read().filter((item) => item.id !== id));

  addAuditLog({
    action: "delete",
    entity: "project_site",
    entityId: id,
    description: `تم حذف موقع ${site.name}.`,
    notificationTitle: "حذف موقع",
    notificationType: "warning",
    notificationHref: `/projects/${site.projectId}`,
  });
}

export function subscribeToProjectSites(onChange: () => void) {
  if (!canUseStorage()) return () => undefined;

  const handleCustomEvent = () => onChange();
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };

  window.addEventListener(CHANGE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
