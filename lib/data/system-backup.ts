import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";

const SESSION_KEYS = new Set([
  "elsaghir-eldahshan-session",
  "elsaghir-eldahshan-session-temp",
  "elsaghir-eldahshan-current-actor",
]);

const BACKUP_VERSION = 2;
const STORAGE_PREFIXES = ["elsaghir-", "accounting-system-"];

export interface SystemBackup {
  version: number;
  exportedAt: string;
  storage: Record<string, string>;
}

function isManagedStorageKey(key: string) {
  return STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function getManagedStorageSnapshot() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  const storage: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || SESSION_KEYS.has(key) || !isManagedStorageKey(key)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) storage[key] = value;
  }
  return storage;
}

export function createSystemBackup(): SystemBackup {
  assertCurrentUserPermission("update");
  if (typeof window === "undefined") throw new Error("النسخ الاحتياطي متاح من المتصفح فقط.");

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    storage: getManagedStorageSnapshot(),
  };
}

function validateBackupStorage(storage: unknown): asserts storage is Record<string, string> {
  if (!storage || typeof storage !== "object" || Array.isArray(storage)) {
    throw new Error("بيانات النسخة الاحتياطية غير صالحة.");
  }

  for (const [key, value] of Object.entries(storage)) {
    if (SESSION_KEYS.has(key) || !isManagedStorageKey(key)) {
      throw new Error(`مفتاح غير مسموح به داخل النسخة الاحتياطية: ${key}`);
    }
    if (typeof value !== "string") {
      throw new Error(`قيمة غير صالحة للمفتاح: ${key}`);
    }
  }
}

export function restoreSystemBackup(backup: unknown) {
  assertCurrentUserPermission("update");
  if (typeof window === "undefined") throw new Error("الاستعادة متاحة من المتصفح فقط.");
  if (!backup || typeof backup !== "object") throw new Error("ملف النسخة الاحتياطية غير صالح.");

  const candidate = backup as Partial<SystemBackup>;
  if (candidate.version !== BACKUP_VERSION) {
    throw new Error(`إصدار النسخة الاحتياطية غير مدعوم. الإصدار المطلوب هو ${BACKUP_VERSION}.`);
  }

  validateBackupStorage(candidate.storage);
  const entries = Object.entries(candidate.storage);
  if (!entries.length) throw new Error("النسخة الاحتياطية لا تحتوي على بيانات.");

  const before = getManagedStorageSnapshot();
  const targetKeys = new Set(entries.map(([key]) => key));

  try {
    // Full restore: remove managed keys that did not exist in the backup.
    for (const key of Object.keys(before)) {
      if (!targetKeys.has(key)) window.localStorage.removeItem(key);
    }

    for (const [key, value] of entries) {
      window.localStorage.setItem(key, value);
    }

    window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
    addAuditLog({
      action: "system",
      entity: "system",
      description: `تمت استعادة نسخة احتياطية تحتوي على ${entries.length} مفتاح بيانات.`,
      notificationTitle: "استعادة نسخة احتياطية",
      notificationType: "warning",
      notificationHref: "/settings",
      notify: false,
    });
    return entries.length;
  } catch (error) {
    // Restore the previous complete state if any write fails.
    for (const key of Object.keys(getManagedStorageSnapshot())) {
      if (!Object.prototype.hasOwnProperty.call(before, key)) window.localStorage.removeItem(key);
    }
    for (const [key, value] of Object.entries(before)) {
      window.localStorage.setItem(key, value);
    }
    window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
    throw error instanceof Error ? error : new Error("فشلت استعادة النسخة الاحتياطية.");
  }
}
