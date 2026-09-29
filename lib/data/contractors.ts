import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import type { Contractor } from "@/types/contractor";
import { getExpenses } from "@/lib/data/expenses";

const STORAGE_KEY = "elsaghir-eldahshan-contractors";

function notifyDataUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function read(): Contractor[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as Contractor[] : [];
  } catch {
    return [];
  }
}

function save(items: Contractor[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notifyDataUpdated();

}

export function getContractors() {
  return read().sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function getContractorById(id: string) {
  return read().find((item) => item.id === id);
}

export function addContractor(input: Omit<Contractor, "id" | "createdAt" | "updatedAt">) {
  assertCurrentUserPermission("create");
  const name = input.name.trim();
  if (!name) throw new Error("اسم المقاول مطلوب.");
  if (read().some((item) => item.name.trim() === name)) {
    throw new Error("يوجد مقاول بنفس الاسم بالفعل.");
  }
  const now = new Date().toISOString();
  const contractor: Contractor = { ...input, totalWork: Number(input.totalWork || 0), id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
  save([...read(), contractor]);
  addAuditLog({ action: "create", entity: "contractor", entityId: contractor.id, description: `تمت إضافة المقاول: ${contractor.name}.`, notificationTitle: "إضافة مقاول", notificationType: "success", notificationHref: "/contractors" });
  return contractor;
}

export function updateContractor(id: string, updates: Partial<Omit<Contractor, "id" | "createdAt">>) {
  assertCurrentUserPermission("update");
  const items = read();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("المقاول غير موجود.");
  const previous = items[index];
  const next = { ...previous, ...updates, totalWork: Number(updates.totalWork ?? previous.totalWork ?? 0), name: updates.name?.trim() ?? previous.name, updatedAt: new Date().toISOString() };
  if (!next.name) throw new Error("اسم المقاول مطلوب.");
  if (items.some((item) => item.id !== id && item.name.trim().toLocaleLowerCase() === next.name.trim().toLocaleLowerCase())) {
    throw new Error("يوجد مقاول بنفس الاسم بالفعل.");
  }
  if (next.totalWork < 0) throw new Error("إجمالي الأعمال لا يمكن أن يكون سالبًا.");
  items[index] = next;
  save(items);
  addAuditLog({ action: "update", entity: "contractor", entityId: id, description: `تم تعديل بيانات المقاول: ${next.name}.`, notificationTitle: "تعديل مقاول", notificationType: "info", notificationHref: "/contractors", metadata: { previous, updates } });
  return next;
}

export function deleteContractor(id: string) {
  assertCurrentUserPermission("delete");
  const contractor = getContractorById(id);
  if (!contractor) throw new Error("المقاول غير موجود.");
  const linked = getExpenses().some((expense) => expense.contractorId === id);
  if (linked) throw new Error("لا يمكن حذف مقاول مرتبط بمصروفات أو سلف مسجلة.");

  if (typeof window !== "undefined") {
    try {
      const assignmentRaw = window.localStorage.getItem("elsaghir-eldahshan-contractor-site-assignments");
      const assignments = assignmentRaw ? JSON.parse(assignmentRaw) : [];
      if (Array.isArray(assignments) && assignments.some((item) => item?.contractorId === id)) {
        throw new Error("لا يمكن حذف المقاول لأنه مرتبط بمواقع. أنهِ الفترات الحالية بدلًا من حذف الحساب.");
      }

      const notesRaw = window.localStorage.getItem("elsaghir-eldahshan-contractor-notes");
      const notes = notesRaw ? JSON.parse(notesRaw) : [];
      if (Array.isArray(notes) && notes.some((item) => item?.contractorId === id)) {
        throw new Error("لا يمكن حذف المقاول لأنه لديه ملاحظات أو مستندات محفوظة.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("لا يمكن حذف المقاول")) throw error;
    }
  }

  save(read().filter((item) => item.id !== id));
  addAuditLog({ action: "delete", entity: "contractor", entityId: id, description: `تم حذف المقاول: ${contractor.name}.`, notificationTitle: "حذف مقاول", notificationType: "warning", notificationHref: "/contractors" });
}

export function getContractorFinancialSummary(id: string) {
  const contractor = getContractorById(id);
  const expenses = getExpenses().filter((expense) => expense.contractorId === id);
  const advances = expenses.filter(
    (expense) => expense.movementType === "contractor_advance",
  );
  const totalWork = Number(contractor?.totalWork || 0);
  const totalAdvances = advances.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );
  const remaining = totalWork - totalAdvances;

  return {
    totalWork,
    totalAdvances,
    totalPaid: totalAdvances,
    advances: totalAdvances,
    remaining,
    advanceCount: advances.length,
  };
}
