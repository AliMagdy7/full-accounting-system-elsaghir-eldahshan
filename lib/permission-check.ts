import { hasPermission, type Permission } from "@/lib/auth-permissions";
import type { UserRole } from "@/types/user";

const LOCAL_SESSION_STORAGE_KEY = "elsaghir-eldahshan-session";
const TEMP_SESSION_STORAGE_KEY = "elsaghir-eldahshan-session-temp";

function getCurrentRole(): UserRole {
  if (typeof window === "undefined") return "viewer";
  try {
    const raw =
      window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY) ??
      window.sessionStorage.getItem(TEMP_SESSION_STORAGE_KEY);
    if (!raw) return "viewer";
    const session = JSON.parse(raw) as { role?: UserRole };
    return session.role ?? "viewer";
  } catch {
    return "viewer";
  }
}

export function canCurrentUser(permission: Permission): boolean {
  return hasPermission(getCurrentRole(), permission);
}

export function assertCurrentUserPermission(permission: Permission): void {
  if (!canCurrentUser(permission)) throw new Error("ليس لديك صلاحية لتنفيذ هذه العملية.");
}
