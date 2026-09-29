import { assertCurrentUserPermission } from "@/lib/permission-check";
import type { Expense } from "@/types/expense";
import { addAuditLog } from "@/lib/data/audit-logs";
import { getCustodyTransactionById } from "@/lib/data/custody-transactions";

const STORAGE_KEY = "elsaghir-eldahshan-expenses";

function notifyDataUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function readExpenses(): Expense[] {
  if (!canUseStorage()) {
    return [];
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed as Expense[];
    }
  } catch {
    // Ignore invalid local storage data.
  }

  return [];
}

function saveExpenses(expenses: Expense[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(expenses),
  );
  notifyDataUpdated();

}

export function getExpenses(): Expense[] {
  return readExpenses();
}

export function getExpenseById(
  id: string,
): Expense | undefined {
  return readExpenses().find(
    (expense) => expense.id === id,
  );
}

export function getExpensesByCustodyId(
  custodyId: string,
): Expense[] {
  return readExpenses().filter(
    (expense) => expense.custodyId === custodyId,
  );
}

export function getExpensesByProjectId(
  projectId: string,
): Expense[] {
  return readExpenses().filter(
    (expense) => expense.projectId === projectId,
  );
}

export function addExpense(
  expense: Expense,
): Expense {
  assertCurrentUserPermission("create");
  if (expense.movementType === "worker_advance") {
    throw new Error("سلفة العامل يجب أن تسجل من حركة العامل المرتبطة بالعهدة، وليس كمصروف وهمي.");
  }

  if (expense.movementType === "contractor_advance") {
    if (!expense.contractorId) {
      throw new Error("سلفة المقاول تحتاج إلى مقاول.");
    }
    if (!expense.siteId) {
      throw new Error("سلفة المقاول تحتاج إلى موقع.");
    }
    if (!expense.custodyTransactionId || !getCustodyTransactionById(expense.custodyTransactionId)) {
      throw new Error("سلفة المقاول يجب أن تكون مرتبطة بحركة عهدة فعلية.");
    }
  }

  const expenses = readExpenses();

  expenses.push(expense);

  saveExpenses(expenses);

  addAuditLog({
    action: "create",
    entity: "expense",
    entityId: expense.id,
    description: `تمت إضافة مصروف: ${expense.description} بقيمة ${expense.amount.toLocaleString("en-US")} ج.م.`,
    notificationTitle: "إضافة مصروف",
    notificationType: "success",
    notificationHref: "/expenses",
  });

  return expense;
}

export function updateExpense(
  id: string,
  updates: Partial<Expense>,
): Expense | undefined {
  assertCurrentUserPermission("update");
  const expenses = readExpenses();

  const index = expenses.findIndex(
    (expense) => expense.id === id,
  );

  if (index === -1) {
    return undefined;
  }

  const previousExpense = expenses[index];

  const updatedExpense: Expense = {
    ...previousExpense,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  expenses[index] = updatedExpense;

  saveExpenses(expenses);

  addAuditLog({
    action: "update",
    entity: "expense",
    entityId: updatedExpense.id,
    description: `تم تعديل المصروف: ${updatedExpense.description} بقيمة ${updatedExpense.amount.toLocaleString("en-US")} ج.م.`,
    notificationTitle: "تعديل مصروف",
    notificationType: "info",
    notificationHref: "/expenses",
    metadata: { previous: previousExpense, updates },
  });

  return updatedExpense;
}

export function deleteExpense(
  id: string,
): boolean {
  assertCurrentUserPermission("delete");
  const expenses = readExpenses();
  const nextExpenses = expenses.filter(
    (expense) => expense.id !== id,
  );

  if (nextExpenses.length === expenses.length) {
    return false;
  }

  saveExpenses(nextExpenses);

  addAuditLog({
    action: "delete",
    entity: "expense",
    entityId: id,
    description: "تم حذف مصروف من النظام.",
    notificationTitle: "حذف مصروف",
    notificationType: "warning",
    notificationHref: "/expenses",
  });

  return true;
}
