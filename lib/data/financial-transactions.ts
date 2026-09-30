import { assertCurrentUserPermission } from "@/lib/permission-check";
import {
  getCustodyById,
  updateCustodyBalance,
  reverseCustodyBalance,
} from "@/lib/data/custodies";
import {
  getCustodyFinancialAccountById,
  updateCustodyFinancialAccountBalance,
  reverseCustodyFinancialAccountBalance,
} from "@/lib/data/custody-financial-accounts";
import {
  addCustodyTransaction,
  deleteCustodyTransaction,
  getCustodyTransactions,
  getCustodyTransactionByWorkerFinancialMovementId,
} from "@/lib/data/custody-transactions";
import {
  addExpense,
  deleteExpense,
  getExpenseById,
  updateExpense,
} from "@/lib/data/expenses";
import {
  createProjectMovement,
  updateProjectMovement,
  deleteProjectMovement,
  getProjectMovementRecords,
} from "@/lib/data/project-movements";
export type { ProjectMovementDraft, ProjectMovementRecord, ProjectMovementType } from "@/lib/data/project-movements";
import {
  addWorkerFinancialMovement,
  deleteWorkerFinancialMovement,
  getWorkerFinancialMovementById,
  updateWorkerFinancialMovement,
  createWorkerAdvanceWithPayment,
  updateWorkerAdvanceWithPayment,
  deleteWorkerAdvanceWithPayment,
} from "@/lib/data/worker-financial-movements";
import { getContractorById } from "@/lib/data/contractors";
import {
  isContractorAssignedToSiteOnDate,
} from "@/lib/data/contractor-site-assignments";
import { getProjectSiteById } from "@/lib/data/project-sites";
import type { Expense, ProjectExpenseMovementType } from "@/types/expense";
import type { CustodyTransaction } from "@/types/custody-transaction";

export {
  createProjectMovement,
  updateProjectMovement,
  deleteProjectMovement,
  getProjectMovementRecords,
  createWorkerAdvanceWithPayment,
  updateWorkerAdvanceWithPayment,
  deleteWorkerAdvanceWithPayment,
};

export interface FinancialExpenseDraft {
  date: string;
  amount: number;
  category: string;
  description: string;
  custodyId: string;
  projectId?: string;
  financialAccountId?: string;
  movementType?: ProjectExpenseMovementType;
  contractorId?: string;
  siteId?: string;
}

function normalizeExpenseDraft(input: FinancialExpenseDraft): FinancialExpenseDraft {
  return {
    ...input,
    date: input.date,
    amount: Number(input.amount),
    category: input.category.trim(),
    description: input.description.trim(),
    projectId: input.projectId || undefined,
    financialAccountId: input.financialAccountId || undefined,
    movementType: input.movementType ?? "expense",
    contractorId: input.contractorId || undefined,
    siteId: input.siteId || undefined,
  };
}

function validateExpenseDraft(input: FinancialExpenseDraft) {
  const draft = normalizeExpenseDraft(input);
  if (!draft.date) throw new Error("تاريخ الحركة مطلوب.");
  if (!draft.description) throw new Error("البيان مطلوب.");
  if (!draft.category) throw new Error("التصنيف مطلوب.");
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر.");
  }

  const custody = getCustodyById(draft.custodyId);
  if (!custody) throw new Error("العهدة الدافعة غير موجودة.");

  if (draft.siteId) {
    const site = getProjectSiteById(draft.siteId);
    if (!site) throw new Error("الموقع المحدد غير موجود.");
    if (draft.projectId && site.projectId !== draft.projectId) {
      throw new Error("الموقع المحدد لا يتبع المشروع المختار.");
    }
  }

  if (draft.movementType === "contractor_advance") {
    if (!draft.contractorId) throw new Error("المقاول مطلوب للسلفة.");
    if (!getContractorById(draft.contractorId)) throw new Error("المقاول المحدد غير موجود.");
    if (!draft.siteId) throw new Error("الموقع مطلوب لسلفة المقاول.");
    const contractorSite = getProjectSiteById(draft.siteId);
    if (!contractorSite) throw new Error("الموقع المحدد غير موجود.");
    if (!draft.projectId || contractorSite.projectId !== draft.projectId) {
      throw new Error("سلفة المقاول يجب أن تكون مرتبطة بالمشروع التابع للموقع المحدد.");
    }
    if (!isContractorAssignedToSiteOnDate(draft.contractorId, draft.siteId, draft.date)) {
      throw new Error("تاريخ السلفة خارج فترة ارتباط المقاول بالموقع المحدد.");
    }
    if (draft.category !== "سلف المقاولين") {
      throw new Error("تصنيف سلفة المقاول يجب أن يكون سلف المقاولين.");
    }
  }

  if (custody.id === "central") {
    if (!draft.financialAccountId) throw new Error("اختر وسيلة الدفع من العهدة المركزية.");
    const account = getCustodyFinancialAccountById(draft.financialAccountId);
    if (!account || account.custodyId !== custody.id) throw new Error("وسيلة الدفع غير صحيحة.");
    if (account.balance < draft.amount) throw new Error("رصيد وسيلة الدفع غير كافٍ.");
  } else if (draft.financialAccountId) {
    throw new Error("وسيلة الدفع متاحة مع العهدة المركزية فقط.");
  }

  return draft;
}

function applyOutflow(draft: FinancialExpenseDraft, source: string) {
  const normalized = validateExpenseDraft(draft);
  const custody = getCustodyById(normalized.custodyId)!;
  let custodyChanged = false;
  let accountChanged = false;
  let transaction: CustodyTransaction | undefined;

  try {
    updateCustodyBalance(custody.id, normalized.amount, "out");
    custodyChanged = true;

    if (normalized.financialAccountId) {
      updateCustodyFinancialAccountBalance(
        normalized.financialAccountId,
        normalized.amount,
        "out",
      );
      accountChanged = true;
    }

    const now = new Date().toISOString();
    transaction = addCustodyTransaction({
      id: crypto.randomUUID(),
      custodyId: custody.id,
      type: "out",
      amount: normalized.amount,
      date: normalized.date,
      description: normalized.description,
      source,
      financialAccountId: normalized.financialAccountId,
      projectId: normalized.projectId,
      contractorId: normalized.contractorId,
      siteId: normalized.siteId,
      createdAt: now,
      updatedAt: now,
    });

    return transaction;
  } catch (error) {
    if (transaction) {
      try { deleteCustodyTransaction(transaction.id); } catch { /* preserve original */ }
    }
    if (accountChanged && normalized.financialAccountId) {
      try {
        reverseCustodyFinancialAccountBalance(
          normalized.financialAccountId,
          normalized.amount,
          "out",
        );
      } catch { /* preserve original */ }
    }
    if (custodyChanged) {
      try { reverseCustodyBalance(custody.id, normalized.amount, "out"); } catch { /* preserve original */ }
    }
    throw error;
  }
}

export function createExpenseWithPayment(input: FinancialExpenseDraft) {
  assertCurrentUserPermission("create");
  const draft = validateExpenseDraft(input);

  if (draft.movementType === "worker_advance") {
    throw new Error("سلفة العامل يجب تسجيلها من خدمة حركات العامل.");
  }

  const transaction = applyOutflow(
    draft,
    draft.movementType === "contractor_advance" ? "سلفة مقاول" : "مصروف",
  );

  try {
    const now = new Date().toISOString();
    const expense = addExpense({
      id: crypto.randomUUID(),
      date: draft.date,
      amount: draft.amount,
      category: draft.category,
      description: draft.description,
      custodyId: draft.custodyId,
      projectId: draft.projectId,
      financialAccountId: draft.financialAccountId,
      movementType: draft.movementType,
      custodyTransactionId: transaction.id,
      contractorId: draft.contractorId,
      siteId: draft.siteId,
      createdAt: now,
      updatedAt: now,
    });

    return { expense, transaction };
  } catch (error) {
    try { deleteCustodyTransaction(transaction.id); } catch { /* preserve original */ }
    try { reverseCustodyBalance(draft.custodyId, draft.amount, "out"); } catch { /* preserve original */ }
    if (draft.financialAccountId) {
      try { reverseCustodyFinancialAccountBalance(draft.financialAccountId, draft.amount, "out"); } catch { /* preserve original */ }
    }
    throw error;
  }
}

function findExpenseTransaction(expense: Expense) {
  if (expense.custodyTransactionId) {
    return getCustodyTransactions().find((item) => item.id === expense.custodyTransactionId);
  }
  return getCustodyTransactions()
    .filter(
      (item) =>
        item.type === "out" &&
        item.custodyId === expense.custodyId &&
        item.projectId === expense.projectId &&
        item.date === expense.date &&
        item.amount === expense.amount &&
        item.description === expense.description,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function updateExpenseWithPayment(
  expenseId: string,
  input: FinancialExpenseDraft,
) {
  assertCurrentUserPermission("update");
  const expense = getExpenseById(expenseId);
  if (!expense) throw new Error("المصروف غير موجود.");
  if (expense.movementType === "worker_advance") {
    throw new Error("سلفة العامل يجب تعديلها من خدمة حركات العامل.");
  }

  const draft = validateExpenseDraft(input);
  const oldTransaction = findExpenseTransaction(expense);
  if (!oldTransaction) throw new Error("حركة العهدة المرتبطة بالمصروف غير موجودة.");

  reverseCustodyBalance(oldTransaction.custodyId, oldTransaction.amount, "out");
  if (oldTransaction.financialAccountId) {
    reverseCustodyFinancialAccountBalance(oldTransaction.financialAccountId, oldTransaction.amount, "out");
  }

  let newTransaction: CustodyTransaction | undefined;
  try {
    newTransaction = applyOutflow(draft, draft.movementType === "contractor_advance" ? "سلفة مقاول" : "مصروف");
    const updated = updateExpense(expenseId, {
      date: draft.date,
      amount: draft.amount,
      category: draft.category,
      description: draft.description,
      custodyId: draft.custodyId,
      projectId: draft.projectId,
      financialAccountId: draft.financialAccountId,
      movementType: draft.movementType,
      custodyTransactionId: newTransaction.id,
      contractorId: draft.contractorId,
      siteId: draft.siteId,
    });
    if (!updated) throw new Error("تعذر تحديث المصروف.");
    deleteCustodyTransaction(oldTransaction.id);
    return { expense: updated, transaction: newTransaction };
  } catch (error) {
    if (newTransaction) {
      try { deleteCustodyTransaction(newTransaction.id); } catch { /* preserve original */ }
      try { reverseCustodyBalance(draft.custodyId, draft.amount, "out"); } catch { /* preserve original */ }
      if (draft.financialAccountId) {
        try { reverseCustodyFinancialAccountBalance(draft.financialAccountId, draft.amount, "out"); } catch { /* preserve original */ }
      }
    }
    try {
      const restored = applyOutflow({
        date: oldTransaction.date,
        amount: oldTransaction.amount,
        category: expense.category,
        description: oldTransaction.description,
        custodyId: oldTransaction.custodyId,
        projectId: expense.projectId,
        financialAccountId: oldTransaction.financialAccountId,
        movementType: expense.movementType,
        contractorId: expense.contractorId,
        siteId: expense.siteId,
      }, expense.movementType === "contractor_advance" ? "سلفة مقاول" : "مصروف");
      updateExpense(expenseId, {
        date: expense.date,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        custodyId: expense.custodyId,
        projectId: expense.projectId,
        financialAccountId: expense.financialAccountId,
        movementType: expense.movementType,
        custodyTransactionId: restored.id,
        contractorId: expense.contractorId,
        siteId: expense.siteId,
      });
    } catch { /* preserve original */ }
    throw error;
  }
}

export function deleteExpenseWithPayment(expenseId: string) {
  assertCurrentUserPermission("delete");
  const expense = getExpenseById(expenseId);
  if (!expense) throw new Error("المصروف غير موجود.");
  if (expense.movementType === "worker_advance") {
    throw new Error("سلفة العامل يجب حذفها من خدمة حركات العامل.");
  }
  const transaction = findExpenseTransaction(expense);
  if (!transaction) throw new Error("حركة العهدة المرتبطة بالمصروف غير موجودة.");

  reverseCustodyBalance(transaction.custodyId, transaction.amount, "out");
  if (transaction.financialAccountId) {
    reverseCustodyFinancialAccountBalance(transaction.financialAccountId, transaction.amount, "out");
  }
  deleteCustodyTransaction(transaction.id);
  deleteExpense(expenseId);
}

export interface CustodyTransferInput {
  fromCustodyId: string;
  toCustodyId: string;
  amount: number;
  date: string;
  description: string;
  financialAccountId?: string;
  externalFunding?: boolean;
  externalSource?: string;
}

export function createCustodyTransfer(input: CustodyTransferInput) {
  assertCurrentUserPermission("create");
  const amount = Number(input.amount);
  const description = input.description.trim();
  const externalSource = input.externalSource?.trim() || "";
  const from = getCustodyById(input.fromCustodyId);
  const to = getCustodyById(input.toCustodyId);

  if (!from || !to) throw new Error("العهدة المرسلة أو المستلمة غير موجودة.");
  if (from.id === to.id) throw new Error("لا يمكن التحويل إلى نفس العهدة.");
  if (!input.date) throw new Error("تاريخ التحويل مطلوب.");
  if (!description) throw new Error("بيان التحويل مطلوب.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("مبلغ التحويل يجب أن يكون أكبر من صفر.");

  const external = Boolean(input.externalFunding);
  if (external && from.id !== "central") {
    throw new Error("التمويل الخارجي يبدأ من عهدتي أنا فقط.");
  }
  if (external && !externalSource) throw new Error("مصدر الأموال الخارجي مطلوب.");

  if (external && input.financialAccountId) {
    throw new Error("التمويل الخارجي لا يستخدم وسيلة دفع من عهدتي أنا.");
  }

  if (from.id === "central" && !external) {
    if (!input.financialAccountId) throw new Error("اختر وسيلة الدفع من العهدة المركزية.");
    const account = getCustodyFinancialAccountById(input.financialAccountId);
    if (!account || account.custodyId !== "central") throw new Error("وسيلة الدفع غير صحيحة.");
    if (account.balance < amount) throw new Error("رصيد وسيلة الدفع غير كافٍ.");
  } else if (input.financialAccountId) {
    throw new Error("وسيلة الدفع متاحة مع التحويل من عهدتي أنا فقط.");
  }

  const now = new Date().toISOString();
  const transferId = crypto.randomUUID();
  const destinationInId = crypto.randomUUID();
  const centralInId = external ? crypto.randomUUID() : undefined;
  const created: string[] = [];
  let fromBalance = false;
  let toBalance = false;
  let centralExternalIn = false;
  let accountChanged = false;

  try {
    if (external) {
      addCustodyTransaction({
        id: centralInId!,
        custodyId: from.id,
        type: "in",
        amount,
        date: input.date,
        description: `واصل من ${externalSource} إلى ${to.name}`,
        source: externalSource,
        fundingSource: externalSource,
        relatedCustodyId: to.id,
        relatedTransactionId: transferId,
        createdAt: now,
        updatedAt: now,
      });
      created.push(centralInId!);

      addCustodyTransaction({
        id: transferId,
        custodyId: from.id,
        type: "transfer",
        amount,
        date: input.date,
        description,
        source: externalSource,
        fundingSource: externalSource,
        relatedCustodyId: to.id,
        relatedTransactionId: destinationInId,
        createdAt: now,
        updatedAt: now,
      });
      created.push(transferId);

      addCustodyTransaction({
        id: destinationInId,
        custodyId: to.id,
        type: "in",
        amount,
        date: input.date,
        description,
        source: externalSource,
        fundingSource: externalSource,
        relatedCustodyId: from.id,
        relatedTransactionId: transferId,
        ...(to.projectId ? { projectId: to.projectId } : {}),
        createdAt: now,
        updatedAt: now,
      });
      created.push(destinationInId);

      updateCustodyBalance(from.id, amount, "in");
      centralExternalIn = true;
      updateCustodyBalance(from.id, amount, "out");
      fromBalance = true;
      updateCustodyBalance(to.id, amount, "in");
      toBalance = true;
    } else {
      addCustodyTransaction({
        id: transferId,
        custodyId: from.id,
        type: "transfer",
        amount,
        date: input.date,
        description,
        relatedCustodyId: to.id,
        relatedTransactionId: destinationInId,
        financialAccountId: input.financialAccountId,
        ...(to.projectId ? { projectId: to.projectId } : {}),
        createdAt: now,
        updatedAt: now,
      });
      created.push(transferId);

      addCustodyTransaction({
        id: destinationInId,
        custodyId: to.id,
        type: "in",
        amount,
        date: input.date,
        description,
        source: `تحويل من ${from.name}`,
        relatedCustodyId: from.id,
        relatedTransactionId: transferId,
        ...(to.projectId ? { projectId: to.projectId } : {}),
        createdAt: now,
        updatedAt: now,
      });
      created.push(destinationInId);

      updateCustodyBalance(from.id, amount, "out");
      fromBalance = true;
      updateCustodyBalance(to.id, amount, "in");
      toBalance = true;
      if (input.financialAccountId) {
        updateCustodyFinancialAccountBalance(input.financialAccountId, amount, "out");
        accountChanged = true;
      }
    }

    return { transferTransactionId: transferId, incomingTransactionId: destinationInId };
  } catch (error) {
    for (const id of created.reverse()) {
      try { deleteCustodyTransaction(id); } catch { /* preserve original */ }
    }
    if (accountChanged && input.financialAccountId) {
      try { reverseCustodyFinancialAccountBalance(input.financialAccountId, amount, "out"); } catch { /* preserve original */ }
    }
    if (toBalance) {
      try { reverseCustodyBalance(to.id, amount, "in"); } catch { /* preserve original */ }
    }
    if (fromBalance) {
      try { reverseCustodyBalance(from.id, amount, "out"); } catch { /* preserve original */ }
    }
    if (centralExternalIn) {
      try { reverseCustodyBalance(from.id, amount, "in"); } catch { /* preserve original */ }
    }
    throw error;
  }
}

export type WorkerCashMovementType = "salary" | "advance" | "payment";

function isWorkerCashOutMovement(type: string): type is WorkerCashMovementType {
  return type === "salary" || type === "advance" || type === "payment";
}

export function createWorkerMovementWithPayment(input: {
  workerId: string;
  type: import("@/types/worker-financial-movement").WorkerFinancialMovementType;
  amount: number;
  date: string;
  description: string;
  notes?: string;
  custodyId: string;
  financialAccountId?: string;
  projectId?: string;
  allocation?: "general" | "project";
}) {
  assertCurrentUserPermission("create");
  const amount = Number(input.amount);
  const cashOut = isWorkerCashOutMovement(input.type);
  const custody = getCustodyById(input.custodyId);
  if (!custody) throw new Error("العهدة المختارة غير موجودة.");
  if (!input.date) throw new Error("تاريخ الحركة مطلوب.");
  if (!input.description.trim()) throw new Error("بيان الحركة مطلوب.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("مبلغ الحركة غير صحيح.");

  if (cashOut && custody.id === "central") {
    if (!input.financialAccountId) throw new Error("اختر وسيلة الدفع من العهدة المركزية.");
    const account = getCustodyFinancialAccountById(input.financialAccountId);
    if (!account || account.custodyId !== custody.id) throw new Error("وسيلة الدفع غير صحيحة.");
    if (account.balance < amount) throw new Error("رصيد وسيلة الدفع غير كافٍ.");
  } else if (input.financialAccountId) {
    const account = getCustodyFinancialAccountById(input.financialAccountId);
    if (!account || account.custodyId !== custody.id) throw new Error("وسيلة الدفع غير صحيحة.");
    if (!cashOut) throw new Error("وسيلة الدفع لا ترتبط بحركة غير نقدية.");
  }

  const movement = addWorkerFinancialMovement({
    workerId: input.workerId,
    type: input.type,
    amount,
    date: input.date,
    description: input.description,
    notes: input.notes,
    custodyId: input.custodyId,
    financialAccountId: cashOut ? input.financialAccountId : undefined,
    projectId: input.projectId,
    allocation: input.projectId ? input.allocation ?? "project" : "general",
  });

  let custodyChanged = false;
  let accountChanged = false;
  let transaction: CustodyTransaction | undefined;
  try {
    if (cashOut) {
      updateCustodyBalance(custody.id, amount, "out");
      custodyChanged = true;
      if (input.financialAccountId) {
        updateCustodyFinancialAccountBalance(input.financialAccountId, amount, "out");
        accountChanged = true;
      }
      const now = new Date().toISOString();
      transaction = addCustodyTransaction({
        id: crypto.randomUUID(),
        custodyId: custody.id,
        type: "out",
        amount,
        date: input.date,
        description: `${input.description.trim()}`,
        source: "حساب العامل",
        workerFinancialMovementId: movement.id,
        projectId: input.projectId,
        financialAccountId: input.financialAccountId,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { movement, transaction };
  } catch (error) {
    if (transaction) {
      try { deleteCustodyTransaction(transaction.id); } catch { /* preserve original */ }
    }
    if (accountChanged && input.financialAccountId) {
      try { reverseCustodyFinancialAccountBalance(input.financialAccountId, amount, "out"); } catch { /* preserve original */ }
    }
    if (custodyChanged) {
      try { reverseCustodyBalance(custody.id, amount, "out"); } catch { /* preserve original */ }
    }
    try { deleteWorkerFinancialMovement(movement.id); } catch { /* preserve original */ }
    throw error;
  }
}


export function updateWorkerMovementWithPayment(
  movementId: string,
  updates: {
    type: import("@/types/worker-financial-movement").WorkerFinancialMovementType;
    amount: number;
    date: string;
    description: string;
    notes?: string;
    custodyId: string;
    financialAccountId?: string;
    projectId?: string;
    allocation?: "general" | "project";
  },
) {
  assertCurrentUserPermission("update");
  const current = getWorkerFinancialMovementById(movementId);
  if (!current) throw new Error("حركة العامل غير موجودة.");

  const amount = Number(updates.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("مبلغ الحركة غير صحيح.");
  if (!updates.date) throw new Error("تاريخ الحركة مطلوب.");
  if (!updates.description.trim()) throw new Error("بيان الحركة مطلوب.");

  const oldTransaction = getCustodyTransactionByWorkerFinancialMovementId(movementId);
  const oldCashOut = isWorkerCashOutMovement(current.type);
  const nextCashOut = isWorkerCashOutMovement(updates.type);
  const targetCustody = getCustodyById(updates.custodyId);
  if (!targetCustody) throw new Error("العهدة المختارة غير موجودة.");

  if (nextCashOut && targetCustody.id === "central") {
    if (!updates.financialAccountId) throw new Error("اختر وسيلة الدفع من العهدة المركزية.");
    const account = getCustodyFinancialAccountById(updates.financialAccountId);
    if (!account || account.custodyId !== "central") throw new Error("وسيلة الدفع غير صحيحة.");
    const available = account.balance + (oldTransaction?.financialAccountId === updates.financialAccountId ? oldTransaction.amount : 0);
    if (available < amount) throw new Error("رصيد وسيلة الدفع غير كافٍ.");
  } else if (updates.financialAccountId) {
    const account = getCustodyFinancialAccountById(updates.financialAccountId);
    if (!account || account.custodyId !== targetCustody.id) throw new Error("وسيلة الدفع غير صحيحة.");
    if (!nextCashOut) throw new Error("وسيلة الدفع لا ترتبط بحركة غير نقدية.");
  }

  if (oldCashOut && !oldTransaction) throw new Error("حركة العهدة المرتبطة بالحركة القديمة غير موجودة.");

  if (oldCashOut && oldTransaction) {
    reverseCustodyBalance(oldTransaction.custodyId, oldTransaction.amount, "out");
    if (oldTransaction.financialAccountId) {
      reverseCustodyFinancialAccountBalance(oldTransaction.financialAccountId, oldTransaction.amount, "out");
    }
    deleteCustodyTransaction(oldTransaction.id);
  }

  let newTransaction: CustodyTransaction | undefined;
  try {
    const updatedMovement = updateWorkerFinancialMovement(movementId, {
      type: updates.type,
      amount,
      date: updates.date,
      description: updates.description,
      notes: updates.notes,
      custodyId: updates.custodyId,
      financialAccountId: nextCashOut ? updates.financialAccountId : undefined,
      projectId: updates.projectId,
      allocation: updates.projectId ? updates.allocation ?? "project" : "general",
    });

    if (nextCashOut) {
      updateCustodyBalance(targetCustody.id, amount, "out");
      if (updates.financialAccountId) {
        updateCustodyFinancialAccountBalance(updates.financialAccountId, amount, "out");
      }
      const now = new Date().toISOString();
      newTransaction = addCustodyTransaction({
        id: crypto.randomUUID(),
        custodyId: targetCustody.id,
        type: "out",
        amount,
        date: updates.date,
        description: updates.description.trim(),
        source: "حساب العامل",
        workerFinancialMovementId: movementId,
        projectId: updates.projectId,
        financialAccountId: updates.financialAccountId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { movement: updatedMovement, transaction: newTransaction };
  } catch (error) {
    if (newTransaction) {
      try { deleteCustodyTransaction(newTransaction.id); } catch { /* preserve original */ }
      try { reverseCustodyBalance(targetCustody.id, amount, "out"); } catch { /* preserve original */ }
      if (updates.financialAccountId) {
        try { reverseCustodyFinancialAccountBalance(updates.financialAccountId, amount, "out"); } catch { /* preserve original */ }
      }
    }

    try {
      updateWorkerFinancialMovement(movementId, {
        type: current.type,
        amount: current.amount,
        date: current.date,
        description: current.description,
        notes: current.notes,
        custodyId: current.custodyId,
        financialAccountId: current.financialAccountId,
        projectId: current.projectId,
        allocation: current.allocation,
      });
      if (oldCashOut && oldTransaction) {
        updateCustodyBalance(oldTransaction.custodyId, oldTransaction.amount, "out");
        if (oldTransaction.financialAccountId) {
          updateCustodyFinancialAccountBalance(oldTransaction.financialAccountId, oldTransaction.amount, "out");
        }
        addCustodyTransaction(oldTransaction);
      }
    } catch { /* preserve original */ }
    throw error;
  }
}

export function deleteWorkerMovementWithPayment(movementId: string) {
  assertCurrentUserPermission("delete");
  const movement = getWorkerFinancialMovementById(movementId);
  if (!movement) throw new Error("حركة العامل غير موجودة.");
  const transaction = getCustodyTransactionByWorkerFinancialMovementId(movementId);

  if (isWorkerCashOutMovement(movement.type)) {
    if (!transaction) throw new Error("حركة العهدة المرتبطة بالحركة غير موجودة.");
    reverseCustodyBalance(transaction.custodyId, transaction.amount, "out");
    if (transaction.financialAccountId) {
      reverseCustodyFinancialAccountBalance(transaction.financialAccountId, transaction.amount, "out");
    }
    deleteCustodyTransaction(transaction.id);
  } else if (transaction) {
    deleteCustodyTransaction(transaction.id);
  }

  deleteWorkerFinancialMovement(movementId);
}
