import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import type { PartnerFinancialAccount, PartnerAccountOwner } from "@/types/partner-financial-account";

const STORAGE_KEY = "elsaghir-eldahshan-partner-financial-accounts";

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

function read(): PartnerFinancialAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: PartnerFinancialAccount[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notify();
}

function ensureDefaults(): PartnerFinancialAccount[] {
  const current = read();
  if (current.length) return current;
  const now = new Date().toISOString();
  const defaults: PartnerFinancialAccount[] = [
    {
      id: "partner-hajj-ramadan",
      owner: "hajj_ramadan",
      name: "حساب الحاج رمضان",
      openingBalance: 0,
      balance: 0,
      totalIn: 0,
      totalOut: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "partner-hajj-nabil",
      owner: "hajj_nabil",
      name: "حساب الحاج نبيل",
      openingBalance: 0,
      balance: 0,
      totalIn: 0,
      totalOut: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
  save(defaults);
  return defaults;
}

export function getPartnerFinancialAccounts() {
  return ensureDefaults().sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function getPartnerFinancialAccountById(id: string) {
  return getPartnerFinancialAccounts().find((item) => item.id === id);
}

export function addPartnerFinancialAccount(input: {
  owner: PartnerAccountOwner;
  name: string;
  openingBalance?: number;
  notes?: string;
}) {
  assertCurrentUserPermission("create");
  const name = input.name.trim();
  if (!name) throw new Error("اسم الحساب مطلوب.");
  const openingBalance = Number(input.openingBalance ?? 0);
  if (!Number.isFinite(openingBalance) || openingBalance < 0) throw new Error("الرصيد الافتتاحي غير صحيح.");
  const items = getPartnerFinancialAccounts();
  if (items.some((item) => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error("يوجد حساب بنفس الاسم بالفعل.");
  }
  const now = new Date().toISOString();
  const row: PartnerFinancialAccount = {
    id: crypto.randomUUID(),
    owner: input.owner,
    name,
    openingBalance,
    balance: openingBalance,
    totalIn: openingBalance,
    totalOut: 0,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  save([...items, row]);
  addAuditLog({ action: "create", entity: "partner_financial_account", entityId: row.id, description: `تمت إضافة ${name}.`, notificationTitle: "إضافة حساب شريك", notificationType: "success", notificationHref: "/partner-accounts" });
  return row;
}

export function updatePartnerFinancialAccount(id: string, updates: Partial<Pick<PartnerFinancialAccount, "name" | "owner" | "notes">>) {
  assertCurrentUserPermission("update");
  const items = getPartnerFinancialAccounts();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("الحساب غير موجود.");
  const previous = items[index];
  const name = (updates.name ?? previous.name).trim();
  if (!name) throw new Error("اسم الحساب مطلوب.");
  if (items.some((item) => item.id !== id && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("يوجد حساب بنفس الاسم بالفعل.");
  const next = { ...previous, ...updates, name, updatedAt: new Date().toISOString() };
  items[index] = next;
  save(items);
  addAuditLog({ action: "update", entity: "partner_financial_account", entityId: id, description: `تم تعديل ${name}.`, notificationTitle: "تعديل حساب شريك", notificationType: "info", notificationHref: "/partner-accounts", metadata: { previous, updates } });
  return next;
}

export function updatePartnerFinancialAccountBalance(id: string, amount: number, type: "in" | "out") {
  assertCurrentUserPermission("update");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("مبلغ الحركة غير صحيح.");
  const items = getPartnerFinancialAccounts();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("الحساب غير موجود.");
  const row = items[index];
  const balance = type === "in" ? row.balance + amount : row.balance - amount;
  if (type === "out" && balance < -0.01) throw new Error("رصيد حساب الشريك غير كافٍ.");
  items[index] = {
    ...row,
    balance,
    totalIn: row.totalIn + (type === "in" ? amount : 0),
    totalOut: row.totalOut + (type === "out" ? amount : 0),
    updatedAt: new Date().toISOString(),
  };
  save(items);
  addAuditLog({
    action: type === "in" ? "create" : "update",
    entity: "partner_financial_account",
    entityId: id,
    description: `تم ${type === "in" ? "إضافة" : "خصم"} ${amount.toLocaleString("en-US")} ج.م. من حساب ${row.name}.`,
    notificationTitle: "حركة حساب شريك",
    notificationType: "info",
    notificationHref: "/partner-accounts",
    notify: false,
    metadata: { type, amount },
  });
  return items[index];
}

export function reversePartnerFinancialAccountBalance(id: string, amount: number, type: "in" | "out") {
  return updatePartnerFinancialAccountBalance(id, amount, type === "in" ? "out" : "in");
}
