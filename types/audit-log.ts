export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "transfer"
  | "reverse"
  | "system"
  | "user"
  | "company"
  | "settlement"
  | "company_check"
  | "asset"

export type AuditEntity =
  | "expense"
  | "project"
  | "worker"
  | "worker_financial_movement"
  | "custody"
  | "custody_transaction"
  | "custody_financial_account"
  | "expense_category"
  | "contractor"
  | "project_site"
  | "transfer"
  | "system"
  | "user"
  | "company"
  | "settlement"
  | "company_check"
  | "partner_financial_account"
  | "company_asset";

export type AuditActorRole =
  | "admin"
  | "accountant"
  | "viewer"
  | "system"
  | "user"
  | "company"
  | "settlement"
  | "company_check"
  | "partner_financial_account"
  | "company_asset";

export interface AuditActor {
  userId: string;
  userName: string;
  role: AuditActorRole;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  description: string;
  actor: AuditActor;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
