import type {
  AuditAction,
  AuditActor,
  AuditActorRole,
  AuditEntity,
  AuditLog,
} from "@/types/audit-log";
import { addNotification } from "@/lib/data/notifications";
import { getCurrentAuditActor as getSessionAuditActor } from "@/lib/data/users";

const STORAGE_KEY = "elsaghir-eldahshan-audit-logs";
const ACTOR_STORAGE_KEY = "elsaghir-eldahshan-current-actor";
const EVENT_NAME = "elsaghir-audit-updated";

const DEFAULT_ACTOR: AuditActor = {
  userId: "admin",
  userName: "المدير",
  role: "admin",
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function dispatchAuditUpdated() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(EVENT_NAME));
  window.dispatchEvent(new Event("elsaghir-data-updated"));
}

function readLogs(): AuditLog[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditLog[]) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: AuditLog[]) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function getCurrentAuditActor(): AuditActor {
  if (!canUseStorage()) return DEFAULT_ACTOR;

  return getSessionAuditActor();
}

export function setCurrentAuditActor(actor: AuditActor) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(
    ACTOR_STORAGE_KEY,
    JSON.stringify(actor),
  );

  dispatchAuditUpdated();
}

export function getAuditLogs(): AuditLog[] {
  return readLogs().sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
}

export function getAuditLogsByEntity(
  entity: AuditEntity,
  entityId?: string,
): AuditLog[] {
  return getAuditLogs().filter((log) => {
    if (log.entity !== entity) return false;
    return entityId ? log.entityId === entityId : true;
  });
}

export function addAuditLog(input: {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  actor?: AuditActor;
  notify?: boolean;
  notificationTitle?: string;
  notificationType?: "info" | "success" | "warning" | "error";
  notificationHref?: string;
}): AuditLog {
  const log: AuditLog = {
    id: crypto.randomUUID(),
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    description: input.description.trim(),
    actor: input.actor ?? getCurrentAuditActor(),
    createdAt: new Date().toISOString(),
    metadata: input.metadata,
  };

  const logs = readLogs();
  saveLogs([...logs, log]);

  if (input.notify !== false) {
    addNotification({
      title: input.notificationTitle ?? "تحديث جديد في النظام",
      message: log.description,
      type: input.notificationType ?? "info",
      entity: log.entity,
      entityId: log.entityId,
      action: log.action,
      auditLogId: log.id,
      href: input.notificationHref,
    });
  }

  dispatchAuditUpdated();

  return log;
}

export function clearAuditLogs() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  dispatchAuditUpdated();
}
