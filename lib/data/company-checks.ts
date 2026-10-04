import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import { getCompanyById } from "@/lib/data/companies";
import { getSettlementById } from "@/lib/data/settlements";
import type { CompanyCheck, CheckStatus } from "@/types/check";
import { updateCustodyBalance, reverseCustodyBalance } from "@/lib/data/custodies";
import { updateCustodyFinancialAccountBalance, reverseCustodyFinancialAccountBalance } from "@/lib/data/custody-financial-accounts";
import { addCustodyTransaction, deleteCustodyTransaction } from "@/lib/data/custody-transactions";
import { getPartnerFinancialAccountById, updatePartnerFinancialAccountBalance, reversePartnerFinancialAccountBalance } from "@/lib/data/partner-financial-accounts";
import { assertTransactionEditable } from "@/lib/data/system-controls";

const STORAGE_KEY = "elsaghir-eldahshan-company-checks";

const read = (): CompanyCheck[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const save = (items: CompanyCheck[]) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
  }
};

export function normalizeCheckNumber(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

export function getCompanyChecks() {
  return read().sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.createdAt.localeCompare(a.createdAt));
}

export function getCompanyCheckById(id: string) {
  return read().find((item) => item.id === id);
}

export function getCompanyChecksBySettlement(settlementId: string) {
  return getCompanyChecks().filter((item) => item.settlementId === settlementId);
}

function validateDestination(input: Pick<CompanyCheck, "status" | "financialAccountId" | "partnerAccountId">) {
  if (input.status !== "collected") return;
  const hasCentral = Boolean(input.financialAccountId);
  const hasPartner = Boolean(input.partnerAccountId);
  if (hasCentral === hasPartner) {
    throw new Error("حدد مكان تحصيل الشيك: حسابي أنا أو حساب أحد الحجاج.");
  }
  if (hasPartner && !getPartnerFinancialAccountById(input.partnerAccountId!)) {
    throw new Error("حساب الشريك المحدد غير موجود.");
  }
}

function collectToDestination(row: CompanyCheck) {
  validateDestination(row);

  if (row.partnerAccountId) {
    updatePartnerFinancialAccountBalance(row.partnerAccountId, row.amount, "in");
    return;
  }

  if (!row.financialAccountId) throw new Error("الحساب المالي الخاص بي غير محدد.");
  let custodyChanged = false;
  let accountChanged = false;
  let transactionId: string | undefined;
  try {
    updateCustodyBalance("central", row.amount, "in");
    custodyChanged = true;
    updateCustodyFinancialAccountBalance(row.financialAccountId, row.amount, "in");
    accountChanged = true;
    const tx = addCustodyTransaction({
      id: crypto.randomUUID(),
      custodyId: "central",
      type: "in",
      amount: row.amount,
      date: row.dueDate,
      description: `تحصيل شيك رقم ${row.number} — ${getCompanyById(row.companyId)?.name ?? "شركة"}`,
      source: "تحصيل شيك شركة",
      financialAccountId: row.financialAccountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    transactionId = tx.id;
    row.custodyTransactionId = tx.id;
  } catch (error) {
    if (transactionId) {
      try { deleteCustodyTransaction(transactionId); } catch { /* preserve original */ }
    }
    if (accountChanged) {
      try { reverseCustodyFinancialAccountBalance(row.financialAccountId, row.amount, "in"); } catch { /* preserve original */ }
    }
    if (custodyChanged) {
      try { reverseCustodyBalance("central", row.amount, "in"); } catch { /* preserve original */ }
    }
    throw error;
  }
}

function reverseCollectedDestination(row: CompanyCheck) {
  if (row.partnerAccountId) {
    reversePartnerFinancialAccountBalance(row.partnerAccountId, row.amount, "in");
    return;
  }
  if (!row.financialAccountId || !row.custodyTransactionId) {
    throw new Error("بيانات تحصيل الشيك المرتبطة بالحركة المالية غير مكتملة.");
  }
  reverseCustodyBalance("central", row.amount, "in");
  reverseCustodyFinancialAccountBalance(row.financialAccountId, row.amount, "in");
  deleteCustodyTransaction(row.custodyTransactionId);
}

function validateCheckInput(input: Omit<CompanyCheck, "id" | "createdAt" | "updatedAt">, existingId?: string) {
  if (!getCompanyById(input.companyId)) throw new Error("الشركة المحددة غير موجودة.");
  const settlement = getSettlementById(input.settlementId);
  if (!settlement || settlement.companyId !== input.companyId) throw new Error("المستخلص المحدد غير موجود أو لا يتبع الشركة.");

  const number = normalizeCheckNumber(input.number);
  if (!number) throw new Error("رقم الشيك مطلوب.");
  if (read().some((item) => item.id !== existingId && normalizeCheckNumber(item.number) === number)) {
    throw new Error(`رقم الشيك ${input.number} مسجل بالفعل ولا يمكن تسجيل شيك آخر بنفس الرقم.`);
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("قيمة الشيك يجب أن تكون أكبر من صفر.");

  const others = read()
    .filter((item) => item.id !== existingId && item.settlementId === input.settlementId && item.status !== "cancelled" && item.status !== "returned")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (others + amount > settlement.netValue + 0.01) {
    throw new Error("إجمالي الشيكات يتجاوز صافي قيمة المستخلص.");
  }

  validateDestination(input);
  return { number, amount };
}

export function addCompanyCheck(input: Omit<CompanyCheck, "id" | "createdAt" | "updatedAt">) {
  assertCurrentUserPermission("create");
  assertTransactionEditable(input.issueDate);
  const { number, amount } = validateCheckInput(input);
  const now = new Date().toISOString();
  const row: CompanyCheck = {
    ...input,
    number,
    amount,
    financialAccountId: input.status === "collected" ? input.financialAccountId : undefined,
    partnerAccountId: input.status === "collected" ? input.partnerAccountId : undefined,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  try {
    if (row.status === "collected") collectToDestination(row);
    save([...read(), row]);
  } catch (error) {
    if (row.status === "collected") {
      try { reverseCollectedDestination(row); } catch { /* preserve original */ }
    }
    throw error;
  }

  addAuditLog({
    action: "create",
    entity: "company_check",
    entityId: row.id,
    description: `تم تسجيل شيك رقم ${input.number} بقيمة ${amount.toLocaleString("en-US")} ج.م.`,
    notificationTitle: "إضافة شيك",
    notificationType: "success",
    notificationHref: "/checks",
  });
  return row;
}

export function updateCompanyCheck(id: string, updates: Partial<Omit<CompanyCheck, "id" | "createdAt" | "updatedAt">>) {
  assertCurrentUserPermission("update");
  assertTransactionEditable(updates.issueDate ?? read().find((item) => item.id === id)?.issueDate ?? new Date().toISOString());
  const items = read();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("الشيك غير موجود.");

  const previous = items[index];
  const nextInput = { ...previous, ...updates };
  const { number, amount } = validateCheckInput(nextInput, id);
  const next: CompanyCheck = {
    ...previous,
    ...updates,
    number,
    amount,
    financialAccountId: nextInput.status === "collected" ? nextInput.financialAccountId : undefined,
    partnerAccountId: nextInput.status === "collected" ? nextInput.partnerAccountId : undefined,
    updatedAt: new Date().toISOString(),
  };

  const wasCollected = previous.status === "collected";
  const willBeCollected = next.status === "collected";
  const destinationChanged = previous.financialAccountId !== next.financialAccountId || previous.partnerAccountId !== next.partnerAccountId || previous.amount !== next.amount;

  if (wasCollected && (!willBeCollected || destinationChanged)) {
    reverseCollectedDestination(previous);
    next.custodyTransactionId = undefined;
  }

  try {
    if (willBeCollected && (!wasCollected || destinationChanged)) {
      collectToDestination(next);
    }
    items[index] = next;
    save(items);
  } catch (error) {
    if (willBeCollected && (!wasCollected || destinationChanged)) {
      try { reverseCollectedDestination(next); } catch { /* preserve original */ }
    }
    if (wasCollected && (!willBeCollected || destinationChanged)) {
      try { collectToDestination(previous); } catch { /* preserve original */ }
    }
    throw error;
  }

  addAuditLog({
    action: "update",
    entity: "company_check",
    entityId: id,
    description: `تم تعديل الشيك رقم ${number}.`,
    notificationTitle: "تعديل شيك",
    notificationType: "info",
    notificationHref: "/checks",
    metadata: { previous, updates },
  });
  return next;
}

export function updateCompanyCheckStatus(id: string, status: CheckStatus, destination?: { financialAccountId?: string; partnerAccountId?: string }) {
  assertCurrentUserPermission("update");
  const row = getCompanyCheckById(id);
  if (!row) throw new Error("الشيك غير موجود.");
  return updateCompanyCheck(id, {
    status,
    financialAccountId: status === "collected" ? destination?.financialAccountId : undefined,
    partnerAccountId: status === "collected" ? destination?.partnerAccountId : undefined,
  });
}

export function deleteCompanyCheck(id: string) {
  assertCurrentUserPermission("delete");
  const row = getCompanyCheckById(id);
  if (!row) throw new Error("الشيك غير موجود.");
  if (row.status === "collected") throw new Error("لا يمكن حذف شيك تم تحصيله. غيّر حالته حسب الإجراء المالي الصحيح.");
  save(read().filter((item) => item.id !== id));
  addAuditLog({ action: "delete", entity: "company_check", entityId: id, description: `تم حذف الشيك رقم ${row.number}.`, notificationTitle: "حذف شيك", notificationType: "warning", notificationHref: "/checks" });
}

export const CHECK_STATUSES: { value: CheckStatus; label: string }[] = [
  { value: "received", label: "مستلم" },
  { value: "due", label: "مستحق" },
  { value: "collected", label: "تم تحصيله" },
  { value: "returned", label: "مرتجع" },
  { value: "cancelled", label: "ملغي" },
];
