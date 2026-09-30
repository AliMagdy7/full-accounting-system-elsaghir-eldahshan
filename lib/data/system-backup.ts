import { assertCurrentUserPermission } from "@/lib/permission-check";

const SESSION_KEYS = new Set([
  "elsaghir-eldahshan-session",
  "elsaghir-eldahshan-session-temp",
]);

const BACKUP_VERSION = 1;

export interface SystemBackup {
  version: number;
  exportedAt: string;
  storage: Record<string, string>;
}

export function createSystemBackup(): SystemBackup {
  assertCurrentUserPermission("update");
  if (typeof window === "undefined") throw new Error("النسخ الاحتياطي متاح من المتصفح فقط.");

  const storage: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || SESSION_KEYS.has(key)) continue;
    if (!key.startsWith("elsaghir-") && !key.startsWith("accounting-system-")) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) storage[key] = value;
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    storage,
  };
}

export function restoreSystemBackup(backup: unknown) {
  assertCurrentUserPermission("update");
  if (typeof window === "undefined") throw new Error("الاستعادة متاحة من المتصفح فقط.");
  if (!backup || typeof backup !== "object") throw new Error("ملف النسخة الاحتياطية غير صالح.");

  const candidate = backup as Partial<SystemBackup>;
  if (candidate.version !== BACKUP_VERSION || !candidate.storage || typeof candidate.storage !== "object") {
    throw new Error("إصدار النسخة الاحتياطية غير مدعوم.");
  }

  const entries = Object.entries(candidate.storage);
  if (!entries.length) throw new Error("النسخة الاحتياطية لا تحتوي على بيانات.");

  for (const [key, value] of entries) {
    if (SESSION_KEYS.has(key)) continue;
    if (!key.startsWith("elsaghir-") && !key.startsWith("accounting-system-")) continue;
    if (typeof value !== "string") continue;
    window.localStorage.setItem(key, value);
  }

  window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
  return entries.length;
}
