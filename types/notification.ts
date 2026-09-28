import type { AuditAction, AuditEntity } from "@/types/audit-log";

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  entity?: AuditEntity;
  entityId?: string;
  action?: AuditAction;
  auditLogId?: string;
  href?: string;
}
