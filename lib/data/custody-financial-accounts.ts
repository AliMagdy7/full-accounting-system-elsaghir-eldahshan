import { assertCurrentUserPermission } from "@/lib/permission-check";
import { getCustodyById, updateCustodyBalance, reverseCustodyBalance } from "@/lib/data/custodies";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";
import { addAuditLog } from "@/lib/data/audit-logs";

const STORAGE_KEY = "elsaghir-eldahshan-custody-financial-accounts";

function notifyDataUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

function readAccounts(): CustodyFinancialAccount[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as CustodyFinancialAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: CustodyFinancialAccount[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  notifyDataUpdated();

}

export function getCustodyFinancialAccounts(custodyId?: string) {
  const accounts = readAccounts();
  return custodyId
    ? accounts.filter((account) => account.custodyId === custodyId)
    : accounts;
}

export function getCustodyFinancialAccountById(id: string) {
  return readAccounts().find((account) => account.id === id);
}

export function addCustodyFinancialAccount(input: {
  custodyId: string;
  name: string;
  openingBalance?: number;
}) {
  assertCurrentUserPermission("create");
  const name = input.name.trim();
  if (!name) throw new Error("اسم وسيلة الدفع مطلوب.");

  const accounts = readAccounts();
  const normalizedName = name.replace(/\s+/g, " ").toLocaleLowerCase();
  if (accounts.some((account) => account.custodyId === input.custodyId && account.name.replace(/\s+/g, " ").trim().toLocaleLowerCase() === normalizedName)) {
    throw new Error("يوجد وسيلة دفع بنفس الاسم داخل هذه العهدة بالفعل.");
  }

  if (!getCustodyById(input.custodyId)) throw new Error("العهدة المحددة غير موجودة.");

  const openingBalance = Number(input.openingBalance ?? 0);
  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    throw new Error("الرصيد الافتتاحي يجب أن يكون صفرًا أو أكبر.");
  }

  const now = new Date().toISOString();
  const account: CustodyFinancialAccount = {
    id: crypto.randomUUID(),
    custodyId: input.custodyId,
    name,
    openingBalance,
    balance: openingBalance,
    totalIn: openingBalance,
    totalOut: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (openingBalance > 0) {
    const updatedCustody = updateCustodyBalance(input.custodyId, openingBalance, "in");
    if (!updatedCustody) throw new Error("تعذر تحديث رصيد العهدة لإنشاء الرصيد الافتتاحي.");
  }

  try {
    saveAccounts([...accounts, account]);
  } catch (error) {
    if (openingBalance > 0) {
      try {
        reverseCustodyBalance(input.custodyId, openingBalance, "in");
      } catch { /* preserve original storage error */ }
    }
    throw error;
  }

  addAuditLog({
    action: "create",
    entity: "custody_financial_account",
    entityId: account.id,
    description: `تمت إضافة حساب مالي: ${account.name}.`,
    notificationTitle: "إضافة حساب مالي",
    notificationType: "success",
    notificationHref: "/custodies/accounts",
  });

  return account;
}

export function updateCustodyFinancialAccountBalance(
  id: string,
  amount: number,
  type: "in" | "out",
) {
  assertCurrentUserPermission("update");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ الحركة غير صحيح.");
  }

  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.id === id);
  if (index === -1) throw new Error("وسيلة الدفع غير موجودة.");

  const account = accounts[index];
  const nextBalance =
    type === "in"
      ? account.balance + amount
      : account.balance - amount;

  if (type === "out" && nextBalance < 0) {
    throw new Error("رصيد وسيلة الدفع غير كافٍ.");
  }

  accounts[index] = {
    ...account,
    balance: nextBalance,
    totalIn:
      type === "in"
        ? account.totalIn + amount
        : account.totalIn,
    totalOut:
      type === "out"
        ? account.totalOut + amount
        : account.totalOut,
    updatedAt: new Date().toISOString(),
  };

  saveAccounts(accounts);

  addAuditLog({
    action: "create",
    entity: "custody_financial_account",
    entityId: account.id,
    description: `تم تحديث رصيد الحساب المالي ${account.name}: ${type === "in" ? "إضافة" : "خصم"} ${amount.toLocaleString("en-US")} ج.م.`,
    notificationTitle: "حركة على حساب مالي",
    notificationType: "info",
    notificationHref: "/custodies/accounts",
    notify: false,
  });

  return accounts[index];
}

export function reverseCustodyFinancialAccountBalance(
  id: string,
  amount: number,
  originalType: "in" | "out",
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ عكس حركة وسيلة الدفع غير صحيح.");
  }

  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.id === id);
  if (index === -1) throw new Error("وسيلة الدفع غير موجودة.");

  const account = accounts[index];
  const nextBalance =
    originalType === "out"
      ? account.balance + amount
      : account.balance - amount;

  if (nextBalance < 0) {
    throw new Error("لا يمكن عكس الحركة لأن رصيد وسيلة الدفع سيصبح سالبًا.");
  }

  accounts[index] = {
    ...account,
    balance: nextBalance,
    totalIn:
      originalType === "in"
        ? Math.max(0, account.totalIn - amount)
        : account.totalIn,
    totalOut:
      originalType === "out"
        ? Math.max(0, account.totalOut - amount)
        : account.totalOut,
    updatedAt: new Date().toISOString(),
  };

  saveAccounts(accounts);

  addAuditLog({
    action: "reverse",
    entity: "custody_financial_account",
    entityId: account.id,
    description: `تم عكس حركة الحساب المالي ${account.name} بقيمة ${amount.toLocaleString("en-US")} ج.م.`,
    notificationTitle: "عكس حركة حساب مالي",
    notificationType: "warning",
    notificationHref: "/custodies/accounts",
    notify: false,
  });

  return accounts[index];
}

export function transferCustodyFinancialAccount(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
) {
  assertCurrentUserPermission("update");
  if (fromAccountId === toAccountId) {
    throw new Error("لا يمكن التحويل إلى نفس وسيلة الدفع.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ التحويل غير صحيح.");
  }

  const accounts = readAccounts();
  const fromIndex = accounts.findIndex((account) => account.id === fromAccountId);
  const toIndex = accounts.findIndex((account) => account.id === toAccountId);

  if (fromIndex === -1 || toIndex === -1) {
    throw new Error("وسيلة الدفع غير موجودة.");
  }

  const from = accounts[fromIndex];
  if (from.balance < amount) {
    throw new Error("رصيد وسيلة الدفع المصدر غير كافٍ.");
  }

  const now = new Date().toISOString();
  const to = accounts[toIndex];

  accounts[fromIndex] = {
    ...from,
    balance: from.balance - amount,
    totalOut: from.totalOut + amount,
    updatedAt: now,
  };

  accounts[toIndex] = {
    ...to,
    balance: to.balance + amount,
    totalIn: to.totalIn + amount,
    updatedAt: now,
  };

  saveAccounts(accounts);

  addAuditLog({
    action: "transfer",
    entity: "transfer",
    description: `تم تحويل ${amount.toLocaleString("en-US")} ج.م. من ${from.name} إلى ${to.name}.`,
    notificationTitle: "تحويل مالي",
    notificationType: "success",
    notificationHref: "/transfers",
    metadata: {
      fromAccountId,
      toAccountId,
      amount,
    },
  });

  return {
    from: accounts[fromIndex],
    to: accounts[toIndex],
  };
}
