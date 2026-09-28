import type { UserRole } from "@/types/user";

export type Permission =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "reports"
  | "audit"
  | "manage_users";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "view",
    "create",
    "update",
    "delete",
    "reports",
    "audit",
    "manage_users",
  ],
  accountant: [
    "view",
    "create",
    "update",
    "delete",
    "reports",
    "audit",
  ],
  viewer: ["view", "reports"],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getRolePermissions(role: UserRole) {
  return ROLE_PERMISSIONS[role];
}
