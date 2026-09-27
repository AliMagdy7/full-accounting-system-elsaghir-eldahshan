import {
  addExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  updateExpense,
} from "@/lib/data/expenses";
import {
  getCustodies,
  getCustodyById,
  reverseCustodyBalance,
  updateCustodyBalance,
} from "@/lib/data/custodies";
import {
  addCustodyTransaction,
  deleteCustodyTransaction,
  getCustodyTransactions,
} from "@/lib/data/custody-transactions";
import {
  getCustodyFinancialAccountById,
  reverseCustodyFinancialAccountBalance,
  updateCustodyFinancialAccountBalance,
} from "@/lib/data/custody-financial-accounts";
import {
  addWorkerFinancialMovement,
  deleteWorkerFinancialMovement,
  getWorkerFinancialMovementById,
  updateWorkerFinancialMovement,
} from "@/lib/data/worker-financial-movements";
import { getWorkerById } from "@/lib/data/workers";
import type { Expense } from "@/types/expense";
import type { CustodyTransaction } from "@/types/custody-transaction";

export type ProjectMovementType =
  | "expense"
  | "worker_advance"
  | "contractor_advance";

export interface ProjectMovementDraft {
  date: string;
  description: string;
  movementType: ProjectMovementType;
  category: string;
  custodyId: string;
  amount: number;
  workerId?: string;
  financialAccountId?: string;
}

export interface ProjectMovementRecord extends ProjectMovementDraft {
  id: string;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
}

function now() {
  return new Date().toISOString();
}

function validateDraft(
  projectId: string,
  draft: ProjectMovementDraft,
) {
  if (!projectId) {
    throw new Error("المشروع مطلوب.");
  }

  if (!draft.date) {
    throw new Error("تاريخ الحركة مطلوب.");
  }

  if (!draft.description.trim()) {
    throw new Error("البيان مطلوب.");
  }

  if (!draft.category.trim()) {
    throw new Error("التصنيف مطلوب.");
  }

  if (
    !Number.isFinite(draft.amount) ||
    draft.amount <= 0
  ) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر.");
  }

  if (!draft.custodyId) {
    throw new Error("العهدة الدافعة مطلوبة.");
  }

  const custody = getCustodyById(draft.custodyId);
  if (!custody) {
    throw new Error("العهدة الدافعة غير موجودة.");
  }

  if (draft.movementType === "worker_advance") {
    if (!draft.workerId) {
      throw new Error("العامل مطلوب للسلفة.");
    }

    if (!getWorkerById(draft.workerId)) {
      throw new Error("العامل المحدد غير موجود.");
    }

    if (draft.category !== "سلف العمال") {
      throw new Error("تصنيف سلفة العامل يجب أن يكون سلف العمال.");
    }
  }

  if (draft.movementType === "contractor_advance") {
    if (draft.category !== "سلف المقاولين") {
      throw new Error(
        "تصنيف سلفة المقاول يجب أن يكون سلف المقاولين.",
      );
    }
  }

  if (custody.id === "central") {
    if (!draft.financialAccountId) {
      throw new Error("اختر وسيلة الدفع من العهدة المركزية.");
    }

    const account = getCustodyFinancialAccountById(
      draft.financialAccountId,
    );

    if (!account || account.custodyId !== custody.id) {
      throw new Error("وسيلة الدفع غير صحيحة.");
    }

    if (account.balance < draft.amount) {
      throw new Error("رصيد وسيلة الدفع غير كافٍ.");
    }
  } else if (draft.financialAccountId) {
    throw new Error(
      "وسيلة الدفع البنكية/النقدية تستخدم هنا مع العهدة المركزية فقط.",
    );
  }
}

function applyPayment(
  projectId: string,
  draft: ProjectMovementDraft,
  movementId?: string,
) {
  const custody = getCustodyById(draft.custodyId);
  if (!custody) {
    throw new Error("العهدة الدافعة غير موجودة.");
  }

  updateCustodyBalance(
    custody.id,
    draft.amount,
    "out",
  );

  try {
    if (
      custody.id === "central" &&
      draft.financialAccountId
    ) {
      updateCustodyFinancialAccountBalance(
        draft.financialAccountId,
        draft.amount,
        "out",
      );
    }
  } catch (error) {
    reverseCustodyBalance(
      custody.id,
      draft.amount,
      "out",
    );
    throw error;
  }

  const timestamp = now();
  let transaction: CustodyTransaction;

  try {
    transaction = addCustodyTransaction({
      id: crypto.randomUUID(),
      custodyId: custody.id,
      type: "out",
      amount: draft.amount,
      date: draft.date,
      description: draft.description.trim(),
      source:
        draft.movementType === "worker_advance"
          ? "سلفة عامل"
          : draft.movementType === "contractor_advance"
            ? "سلفة مقاول"
            : "مصروف مشروع",
      financialAccountId: draft.financialAccountId,
      workerFinancialMovementId: movementId,
      projectId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } catch (error) {
    if (
      custody.id === "central" &&
      draft.financialAccountId
    ) {
      reverseCustodyFinancialAccountBalance(
        draft.financialAccountId,
        draft.amount,
        "out",
      );
    }

    reverseCustodyBalance(
      custody.id,
      draft.amount,
      "out",
    );

    throw error;
  }

  return transaction;
}

function reversePayment(
  custodyId: string,
  amount: number,
  financialAccountId?: string,
) {
  if (financialAccountId) {
    reverseCustodyFinancialAccountBalance(
      financialAccountId,
      amount,
      "out",
    );
  }

  reverseCustodyBalance(
    custodyId,
    amount,
    "out",
  );
}

function findLegacyExpenseTransaction(
  expense: Expense,
): CustodyTransaction | undefined {
  return getCustodyTransactions()
    .filter(
      (transaction) =>
        transaction.type === "out" &&
        transaction.custodyId === expense.custodyId &&
        transaction.projectId === expense.projectId &&
        transaction.date === expense.date &&
        transaction.amount === expense.amount &&
        transaction.description === expense.description,
    )
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0];
}

function getExpenseTransaction(
  expense: Expense,
): CustodyTransaction | undefined {
  if (expense.custodyTransactionId) {
    return getCustodyTransactions().find(
      (transaction) =>
        transaction.id === expense.custodyTransactionId,
    );
  }

  return findLegacyExpenseTransaction(expense);
}

export function getProjectMovementRecords(
  projectId: string,
): ProjectMovementRecord[] {
  const expenses = getExpenses();

  const workerAdvances = getCustodyTransactions();

  const expenseRows: ProjectMovementRecord[] =
    expenses
      .filter((expense) => expense.projectId === projectId)
      .map((expense) => ({
        id: `expense:${expense.id}`,
        sourceId: expense.id,
        date: expense.date,
        description: expense.description,
        movementType:
          expense.movementType === "contractor_advance"
            ? "contractor_advance"
            : "expense",
        category: expense.category,
        custodyId: expense.custodyId,
        amount: expense.amount,
        financialAccountId: expense.financialAccountId,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      }));

  const workerRows: ProjectMovementRecord[] = [];

  const transactions = workerAdvances.filter(
    (transaction) =>
      transaction.type === "out" &&
      transaction.projectId === projectId &&
      Boolean(transaction.workerFinancialMovementId),
  );

  for (const transaction of transactions) {
    const movement = transaction.workerFinancialMovementId
      ? getWorkerFinancialMovementById(
          transaction.workerFinancialMovementId,
        )
      : undefined;

    if (!movement || movement.type !== "advance") {
      continue;
    }

    workerRows.push({
      id: `worker:${movement.id}`,
      sourceId: movement.id,
      date: movement.date,
      description: movement.description,
      movementType: "worker_advance",
      category: "سلف العمال",
      custodyId: transaction.custodyId,
      amount: movement.amount,
      workerId: movement.workerId,
      financialAccountId: transaction.financialAccountId,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
    });

  }

  return [...expenseRows, ...workerRows].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export function createProjectMovement(
  projectId: string,
  draft: ProjectMovementDraft,
) {
  const normalizedDraft: ProjectMovementDraft = {
    ...draft,
    description: draft.description.trim(),
    category: draft.category.trim(),
    amount: Number(draft.amount),
    workerId: draft.workerId || undefined,
    financialAccountId:
      draft.financialAccountId || undefined,
  };

  validateDraft(projectId, normalizedDraft);

  if (normalizedDraft.movementType === "worker_advance") {
    let movementId: string | undefined;
    let transaction: CustodyTransaction | undefined;

    try {
      const movement = addWorkerFinancialMovement({
        workerId: normalizedDraft.workerId!,
        type: "advance",
        amount: normalizedDraft.amount,
        date: normalizedDraft.date,
        description: normalizedDraft.description,
        custodyId: normalizedDraft.custodyId,
        financialAccountId:
          normalizedDraft.financialAccountId,
        projectId,
        allocation: "project",
      });

      movementId = movement.id;
      transaction = applyPayment(
        projectId,
        normalizedDraft,
        movement.id,
      );

      return {
        movement,
        transaction,
      };
    } catch (error) {
      if (transaction) {
        deleteCustodyTransaction(transaction.id);
      }

      if (movementId) {
        deleteWorkerFinancialMovement(movementId);
      }

      throw error;
    }
  }

  let transaction: CustodyTransaction | undefined;
  let expense: Expense | undefined;

  try {
    transaction = applyPayment(projectId, normalizedDraft);

    expense = addExpense({
      id: crypto.randomUUID(),
      date: normalizedDraft.date,
      amount: normalizedDraft.amount,
      category: normalizedDraft.category,
      description: normalizedDraft.description,
      custodyId: normalizedDraft.custodyId,
      projectId,
      financialAccountId:
        normalizedDraft.financialAccountId,
      movementType:
        normalizedDraft.movementType === "contractor_advance"
          ? "contractor_advance"
          : "expense",
      custodyTransactionId: transaction.id,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });

    return {
      expense,
      transaction,
    };
  } catch (error) {
    if (expense) {
      deleteExpense(expense.id);
    }

    if (transaction) {
      deleteCustodyTransaction(transaction.id);
    }

    reversePayment(
      normalizedDraft.custodyId,
      normalizedDraft.amount,
      normalizedDraft.financialAccountId,
    );

    throw error;
  }
}

export function updateProjectMovement(
  projectId: string,
  record: ProjectMovementRecord,
  draft: ProjectMovementDraft,
) {
  const normalizedDraft: ProjectMovementDraft = {
    ...draft,
    description: draft.description.trim(),
    category: draft.category.trim(),
    amount: Number(draft.amount),
    workerId: draft.workerId || undefined,
    financialAccountId:
      draft.financialAccountId || undefined,
  };

  validateDraft(projectId, normalizedDraft);

  if (record.movementType === "worker_advance") {
    const movement = getWorkerFinancialMovementById(
      record.sourceId,
    );

    if (!movement) {
      throw new Error("حركة سلفة العامل غير موجودة.");
    }

    const oldTransaction = getCustodyTransactions().find(
      (transaction) =>
        transaction.workerFinancialMovementId === movement.id,
    );

    if (!oldTransaction) {
      throw new Error("حركة العهدة المرتبطة بالسلفة غير موجودة.");
    }

    reversePayment(
      oldTransaction.custodyId,
      oldTransaction.amount,
      oldTransaction.financialAccountId,
    );

    try {
      updateWorkerFinancialMovement(movement.id, {
        workerId: normalizedDraft.workerId!,
        amount: normalizedDraft.amount,
        date: normalizedDraft.date,
        description: normalizedDraft.description,
        custodyId: normalizedDraft.custodyId,
        financialAccountId:
          normalizedDraft.financialAccountId,
        projectId,
        allocation: "project",
        type: "advance",
      });

      deleteCustodyTransaction(oldTransaction.id);

      const newTransaction = applyPayment(
        projectId,
        normalizedDraft,
        movement.id,
      );

      return {
        movement: getWorkerFinancialMovementById(movement.id),
        transaction: newTransaction,
      };
    } catch (error) {
      try {
        updateWorkerFinancialMovement(movement.id, {
          workerId: movement.workerId,
          amount: movement.amount,
          date: movement.date,
          description: movement.description,
          custodyId: movement.custodyId,
          financialAccountId:
            movement.financialAccountId,
          projectId: movement.projectId,
          allocation: movement.allocation,
          type: movement.type,
        });

        applyPayment(
          projectId,
          {
            date: oldTransaction.date,
            description: oldTransaction.description,
            movementType: "worker_advance",
            category: "سلف العمال",
            custodyId: oldTransaction.custodyId,
            amount: oldTransaction.amount,
            workerId: movement.workerId,
            financialAccountId:
              oldTransaction.financialAccountId,
          },
          movement.id,
        );
      } catch {
        // Keep the original error. The failed rollback is surfaced below.
      }

      throw error;
    }
  }

  const expense = getExpenseById(record.sourceId);
  if (!expense) {
    throw new Error("المصروف غير موجود.");
  }

  const oldTransaction = getExpenseTransaction(expense);
  if (!oldTransaction) {
    throw new Error("حركة العهدة المرتبطة بالمصروف غير موجودة.");
  }

  reversePayment(
    oldTransaction.custodyId,
    oldTransaction.amount,
    oldTransaction.financialAccountId,
  );

  try {
    deleteCustodyTransaction(oldTransaction.id);

    const newTransaction = applyPayment(
      projectId,
      normalizedDraft,
    );

    const updatedExpense = updateExpense(expense.id, {
      date: normalizedDraft.date,
      amount: normalizedDraft.amount,
      category: normalizedDraft.category,
      description: normalizedDraft.description,
      custodyId: normalizedDraft.custodyId,
      projectId,
      financialAccountId:
        normalizedDraft.financialAccountId,
      movementType:
        normalizedDraft.movementType === "contractor_advance"
          ? "contractor_advance"
          : "expense",
      custodyTransactionId: newTransaction.id,
    });

    if (!updatedExpense) {
      throw new Error("تعذر تحديث المصروف.");
    }

    return {
      expense: updatedExpense,
      transaction: newTransaction,
    };
  } catch (error) {
    try {
      const existingReplacement = getCustodyTransactions().find(
        (transaction) =>
          transaction.projectId === projectId &&
          transaction.custodyId === normalizedDraft.custodyId &&
          transaction.date === normalizedDraft.date &&
          transaction.amount === normalizedDraft.amount &&
          transaction.description === normalizedDraft.description &&
          transaction.type === "out",
      );

      if (existingReplacement) {
        deleteCustodyTransaction(existingReplacement.id);
      }

      applyPayment(
        projectId,
        {
          date: oldTransaction.date,
          description: oldTransaction.description,
          movementType:
            expense.movementType === "contractor_advance"
              ? "contractor_advance"
              : "expense",
          category: expense.category,
          custodyId: oldTransaction.custodyId,
          amount: oldTransaction.amount,
          financialAccountId:
            oldTransaction.financialAccountId,
        },
      );
    } catch {
      // Keep the original error.
    }

    throw error;
  }
}

export function deleteProjectMovement(
  projectId: string,
  record: ProjectMovementRecord,
) {
  if (record.movementType === "worker_advance") {
    const movement = getWorkerFinancialMovementById(
      record.sourceId,
    );

    if (!movement) {
      throw new Error("حركة سلفة العامل غير موجودة.");
    }

    const transaction = getCustodyTransactions().find(
      (item) =>
        item.workerFinancialMovementId === movement.id &&
        item.projectId === projectId,
    );

    if (!transaction) {
      throw new Error("حركة العهدة المرتبطة بالسلفة غير موجودة.");
    }

    reversePayment(
      transaction.custodyId,
      transaction.amount,
      transaction.financialAccountId,
    );

    deleteCustodyTransaction(transaction.id);
    deleteWorkerFinancialMovement(movement.id);
    return;
  }

  const expense = getExpenseById(record.sourceId);
  if (!expense) {
    throw new Error("المصروف غير موجود.");
  }

  const transaction = getExpenseTransaction(expense);
  if (!transaction) {
    throw new Error("حركة العهدة المرتبطة بالمصروف غير موجودة.");
  }

  reversePayment(
    transaction.custodyId,
    transaction.amount,
    transaction.financialAccountId,
  );

  deleteCustodyTransaction(transaction.id);
  deleteExpense(expense.id);
}

export function getProjectCustodyOptions() {
  return getCustodies();
}
