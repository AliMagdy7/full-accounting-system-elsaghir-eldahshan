import { updateCustodyBalance } from "@/lib/data/custodies";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";

const STORAGE_KEY = "elsaghir-eldahshan-custody-financial-accounts";

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
  const name = input.name.trim();
  if (!name) throw new Error("اسم وسيلة الدفع مطلوب.");

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

  saveAccounts([...readAccounts(), account]);

  if (openingBalance > 0) {
    updateCustodyBalance(input.custodyId, openingBalance, "in");
  }

  return account;
}

export function updateCustodyFinancialAccountBalance(
  id: string,
  amount: number,
  type: "in" | "out",
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ الحركة غير صحيح.");
  }

  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.id === id);
  if (index === -1) throw new Error("وسيلة الدفع غير موجودة.");

  const account = accounts[index];
  accounts[index] = {
    ...account,
    balance:
      type === "in"
        ? account.balance + amount
        : account.balance - amount,
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
  return accounts[index];
}

export function transferCustodyFinancialAccount(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
) {
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

  const now = new Date().toISOString();
  const from = accounts[fromIndex];
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
  return {
    from: accounts[fromIndex],
    to: accounts[toIndex],
  };
}
