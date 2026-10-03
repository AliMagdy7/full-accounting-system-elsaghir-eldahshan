import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import type {
  WorkerMonthlyPayrollSummary,
  WorkerMonthlyProjectPayrollSummary,
} from "@/types/worker-payroll";

const PROJECT_KEY = "elsaghir-eldahshan-worker-monthly-project-payroll";
const LEGACY_KEY = "elsaghir-eldahshan-worker-monthly-payroll";

function canUseStorage() {
  return typeof window !== "undefined";
}

function readArray<T>(key: string): T[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveArray<T>(key: string, items: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

function normalizeSummary<T extends WorkerMonthlyPayrollSummary>(input: T): T {
  return {
    ...input,
    workerId: input.workerId,
    month: input.month,
    present: Math.max(0, Number(input.present) || 0),
    absent: Math.max(0, Number(input.absent) || 0),
    overtime: Math.max(0, Number(input.overtime) || 0),
    deduction: Math.max(0, Number(input.deduction) || 0),
    transport: Math.max(0, Number(input.transport) || 0),
    notes: String(input.notes ?? "").trim(),
    updatedAt: new Date().toISOString(),
  } as T;
}

export function getWorkerMonthlyProjectPayrollSummaries(): WorkerMonthlyProjectPayrollSummary[] {
  return readArray<WorkerMonthlyProjectPayrollSummary>(PROJECT_KEY);
}

export function getWorkerMonthlyProjectPayrollSummary(
  workerId: string,
  month: string,
  projectId: string,
) {
  return getWorkerMonthlyProjectPayrollSummaries().find(
    (item) => item.workerId === workerId && item.month === month && item.projectId === projectId,
  );
}

export function saveWorkerMonthlyProjectPayrollSummary(
  input: WorkerMonthlyProjectPayrollSummary,
) {
  assertCurrentUserPermission("update");
  if (!input.workerId || !input.month || !input.projectId) {
    throw new Error("بيانات كشف المرتب الشهرية غير مكتملة.");
  }

  const summary = normalizeSummary(input);
  const items = getWorkerMonthlyProjectPayrollSummaries();
  const index = items.findIndex(
    (item) => item.workerId === summary.workerId && item.month === summary.month && item.projectId === summary.projectId,
  );

  if (index === -1) items.push(summary);
  else items[index] = summary;

  saveArray(PROJECT_KEY, items);
  addAuditLog({
    action: "update",
    entity: "worker_financial_movement",
    entityId: `${summary.workerId}:${summary.month}:${summary.projectId}`,
    description: `تم تحديث بيانات حضور ومرتبات العامل للشهر ${summary.month}.`,
    notificationTitle: "تحديث بيانات المرتب",
    notificationType: "info",
    notificationHref: `/workers/${summary.workerId}`,
    metadata: { summary },
    notify: false,
  });

  return summary;
}

export function getWorkerMonthlyPayrollSummaries(): WorkerMonthlyPayrollSummary[] {
  return readArray<WorkerMonthlyPayrollSummary>(LEGACY_KEY);
}

export function getWorkerMonthlyPayrollSummary(workerId: string, month: string) {
  return getWorkerMonthlyPayrollSummaries().find(
    (item) => item.workerId === workerId && item.month === month,
  );
}

export function saveWorkerMonthlyPayrollSummary(input: WorkerMonthlyPayrollSummary) {
  assertCurrentUserPermission("update");
  if (!input.workerId || !input.month) throw new Error("بيانات كشف المرتب الشهرية غير مكتملة.");

  const summary = normalizeSummary(input);
  const items = getWorkerMonthlyPayrollSummaries();
  const index = items.findIndex((item) => item.workerId === summary.workerId && item.month === summary.month);
  if (index === -1) items.push(summary);
  else items[index] = summary;
  saveArray(LEGACY_KEY, items);
  return summary;
}
