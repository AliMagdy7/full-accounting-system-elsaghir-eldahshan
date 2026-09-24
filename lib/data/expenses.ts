import type { Expense } from "@/types/expense";

const STORAGE_KEY = "elsaghir-eldahshan-expenses";

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
  const expenses = readExpenses();

  expenses.push(expense);

  saveExpenses(expenses);

  return expense;
}

export function updateExpense(
  id: string,
  updates: Partial<Expense>,
): Expense | undefined {
  const expenses = readExpenses();

  const index = expenses.findIndex(
    (expense) => expense.id === id,
  );

  if (index === -1) {
    return undefined;
  }

  const updatedExpense: Expense = {
    ...expenses[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  expenses[index] = updatedExpense;

  saveExpenses(expenses);

  return updatedExpense;
}