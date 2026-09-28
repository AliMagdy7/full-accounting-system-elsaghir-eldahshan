import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import type { ProjectSite } from "@/types/project-site";

const STORAGE_KEY = "elsaghir-eldahshan-project-sites";

function canUseStorage() { return typeof window !== "undefined"; }
function read(): ProjectSite[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as ProjectSite[] : [];
  } catch { return []; }
}
function save(items: ProjectSite[]) { if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export function getProjectSites(projectId?: string) {
  const items = read();
  return projectId ? items.filter((item) => item.projectId === projectId) : items;
}
export function getProjectSiteById(id: string) { return read().find((item) => item.id === id); }
export function addProjectSite(input: Omit<ProjectSite, "id" | "createdAt" | "updatedAt">) {
  assertCurrentUserPermission("create");
  if (!input.projectId) throw new Error("المشروع مطلوب.");
  if (!input.name.trim()) throw new Error("اسم الموقع مطلوب.");
  const now = new Date().toISOString();
  const site: ProjectSite = { ...input, id: crypto.randomUUID(), name: input.name.trim(), createdAt: now, updatedAt: now };
  save([...read(), site]);
  addAuditLog({ action: "create", entity: "project_site", entityId: site.id, description: `تمت إضافة موقع ${site.name}.`, notificationTitle: "إضافة موقع", notificationType: "success", notificationHref: `/projects/${site.projectId}` });
  return site;
}
export function updateProjectSite(id: string, updates: Partial<Omit<ProjectSite, "id" | "createdAt">>) {
  assertCurrentUserPermission("update");
  const items = read(); const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("الموقع غير موجود.");
  const previous = items[index];
  const next = { ...previous, ...updates, name: updates.name?.trim() ?? previous.name, updatedAt: new Date().toISOString() };
  if (!next.name) throw new Error("اسم الموقع مطلوب.");
  items[index] = next; save(items);
  addAuditLog({ action: "update", entity: "project_site", entityId: id, description: `تم تعديل موقع ${next.name}.`, notificationTitle: "تعديل موقع", notificationType: "info", notificationHref: `/projects/${next.projectId}`, metadata: { previous, updates } });
  return next;
}
export function deleteProjectSite(id: string) {
  assertCurrentUserPermission("delete");
  const site = getProjectSiteById(id); if (!site) throw new Error("الموقع غير موجود.");
  save(read().filter((item) => item.id !== id));
  addAuditLog({ action: "delete", entity: "project_site", entityId: id, description: `تم حذف موقع ${site.name}.`, notificationTitle: "حذف موقع", notificationType: "warning", notificationHref: `/projects/${site.projectId}` });
}
