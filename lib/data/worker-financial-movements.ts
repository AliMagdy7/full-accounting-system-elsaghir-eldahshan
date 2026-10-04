import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
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
  getCustodyTransactionByWorkerFinancialMovementId,
} from "@/lib/data/custody-transactions";

import type {
  WorkerFinancialMovement,
  WorkerFinancialMovementEffect,
  WorkerFinancialMovementType,
} from "@/types/worker-financial-movement";

const STORAGE_KEY =
  "elsaghir-eldahshan-worker-financial-movements";

function notifyDataUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
}

function readMovements(): WorkerFinancialMovement[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveMovements(
  movements: WorkerFinancialMovement[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(movements),
  );
  notifyDataUpdated();

}

export function getWorkerFinancialMovements() {
  return readMovements();
}

export function getWorkerFinancialMovementById(
  id: string,
) {
  return readMovements().find(
    (movement) =>
      movement.id === id,
  );
}

export function getWorkerFinancialMovementsByWorkerId(
  workerId: string,
) {
  return readMovements()
    .filter(
      (movement) =>
        movement.workerId ===
        workerId,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(
          a.date,
        ) ||
        b.createdAt.localeCompare(
          a.createdAt,
        ),
    );
}

export function getWorkerFinancialMovementsByWorkerIdAndProjectId(
  workerId: string,
  projectId: string,
) {
  return getWorkerFinancialMovementsByWorkerId(workerId).filter(
    (movement) => movement.projectId === projectId,
  );
}

export function getWorkerFinancialMovementsByProjectId(
  projectId: string,
) {
  return readMovements()
    .filter(
      (movement) =>
        movement.projectId ===
        projectId,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(
          a.date,
        ) ||
        b.createdAt.localeCompare(
          a.createdAt,
        ),
    );
}

export function getWorkerFinancialMovementsByType(
  type: WorkerFinancialMovementType,
) {
  return readMovements()
    .filter(
      (movement) =>
        movement.type ===
        type,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(
          a.date,
        ) ||
        b.createdAt.localeCompare(
          a.createdAt,
        ),
    );
}

/**
 * تحديد تأثير نوع الحركة على حساب العامل.
 *
 * معنى الرصيد:
 *
 * increase:
 * يزيد المبلغ المستحق للعامل.
 *
 * decrease:
 * يقلل المبلغ المستحق للعامل
 * أو يزيد المبلغ الذي على العامل للشركة.
 *
 * القواعد:
 *
 * الراتب:
 * صرف من مستحقات العامل، لذلك يقلل مستحقاته.
 *
 * السلفة:
 * مبلغ أخذه العامل مقدمًا، لذلك تقلل مستحقاته
 * وتزيد المبلغ الذي عليه للشركة.
 *
 * المكافأة / الإكرامية:
 * تزيد مستحقات العامل.
 *
 * بدل الانتقال:
 * يزيد مستحقات العامل.
 *
 * الخصم:
 * يقلل مستحقات العامل.
 *
 * الدفعة:
 * صرف من مستحقات العامل، لذلك تقلل مستحقاته.
 */
export function getWorkerMovementEffect(
  type: WorkerFinancialMovementType,
): WorkerFinancialMovementEffect {
  switch (type) {
    case "bonus":
    case "transport":
      return "increase";

    case "salary":
    case "advance":
    case "payment":
    case "deduction":
      return "decrease";

    default:
      return "decrease";
  }
}

/**
 * إجمالي الزيادات في رصيد العامل.
 */
export function getWorkerFinancialIncreaseTotal(
  workerId: string,
) {
  const movements =
    getWorkerFinancialMovementsByWorkerId(
      workerId,
    );

  return movements.reduce(
    (total, movement) =>
      movement.effect ===
      "increase"
        ? total +
          movement.amount
        : total,
    0,
  );
}

/**
 * إجمالي التخفيضات من رصيد العامل.
 */
export function getWorkerFinancialDecreaseTotal(
  workerId: string,
) {
  const movements =
    getWorkerFinancialMovementsByWorkerId(
      workerId,
    );

  return movements.reduce(
    (total, movement) =>
      movement.effect ===
      "decrease"
        ? total +
          movement.amount
        : total,
    0,
  );
}

/**
 * صافي الحركات المالية للعامل.
 *
 * موجب = مستحقات للعامل.
 * سالب = العامل عليه مديونية للشركة.
 */
export function getWorkerFinancialTotal(
  workerId: string,
) {
  const increase =
    getWorkerFinancialIncreaseTotal(
      workerId,
    );

  const decrease =
    getWorkerFinancialDecreaseTotal(
      workerId,
    );

  return (
    increase -
    decrease
  );
}

/**
 * إجماليات الحركات المالية.
 */
export function getWorkerFinancialTotals(
  workerId: string,
) {
  const increase =
    getWorkerFinancialIncreaseTotal(
      workerId,
    );

  const decrease =
    getWorkerFinancialDecreaseTotal(
      workerId,
    );

  return {
    increase,
    decrease,
    net:
      increase -
      decrease,
  };
}

/**
 * الرصيد النهائي للحركات المالية للعامل
 * قبل إضافة الرصيد المرحل من بيانات العامل.
 *
 * النتيجة:
 *
 * موجب = للعامل مستحقات.
 * صفر = لا يوجد رصيد.
 * سالب = العامل عليه مديونية للشركة.
 */
export function getWorkerFinancialTotalsByProject(
  workerId: string,
  projectId: string,
) {
  const movements = getWorkerFinancialMovementsByWorkerIdAndProjectId(
    workerId,
    projectId,
  );

  const increase = movements.reduce(
    (total, movement) =>
      movement.effect === "increase"
        ? total + Number(movement.amount)
        : total,
    0,
  );

  const decrease = movements.reduce(
    (total, movement) =>
      movement.effect === "decrease"
        ? total + Number(movement.amount)
        : total,
    0,
  );

  return {
    increase,
    decrease,
    net: increase - decrease,
  };
}

export function getWorkerFinancialBalanceByProject(
  workerId: string,
  projectId: string,
) {
  return getWorkerFinancialTotalsByProject(workerId, projectId).net;
}

export function getWorkerMaximumSalaryByProject(
  workerId: string,
  projectId: string,
) {
  return Math.max(
    getWorkerFinancialBalanceByProject(workerId, projectId),
    0,
  );
}

export function getWorkerFinancialBalance(
  workerId: string,
) {
  return getWorkerFinancialTotal(
    workerId,
  );
}

/**
 * هل العامل له مستحقات قابلة للصرف؟
 */
export function workerHasPayableBalance(
  workerId: string,
) {
  return (
    getWorkerFinancialBalance(
      workerId,
    ) > 0
  );
}

/**
 * الحد الأقصى الذي يمكن صرفه للعامل.
 *
 * لا يمكن أن يكون الراتب أكبر
 * من مستحق العامل الحالي.
 */
export function getWorkerMaximumSalary(
  workerId: string,
) {
  return Math.max(
    getWorkerFinancialBalance(
      workerId,
    ),
    0,
  );
}

/**
 * ملخص كامل للحركات المالية للعامل.
 */
export function getWorkerFinancialSummary(
  workerId: string,
) {
  const movements =
    getWorkerFinancialMovementsByWorkerId(
      workerId,
    );

  const summary = {
    salary: 0,
    advance: 0,
    bonus: 0,
    transport: 0,
    deduction: 0,
    payment: 0,
    increase: 0,
    decrease: 0,
    net: 0,
  };

  for (const movement of movements) {
    summary[
      movement.type
    ] += movement.amount;

    if (
      movement.effect ===
      "increase"
    ) {
      summary.increase +=
        movement.amount;
    } else {
      summary.decrease +=
        movement.amount;
    }
  }

  summary.net =
    summary.increase -
    summary.decrease;

  return summary;
}

/**
 * إضافة حركة مالية جديدة للعامل.
 *
 * الـ effect يتم تحديده تلقائيًا
 * من نوع الحركة، لذلك لا نعتمد على
 * الصفحة في تحديده.
 */
export function addWorkerFinancialMovement(
  input: Omit<
    WorkerFinancialMovement,
    | "id"
    | "effect"
    | "createdAt"
    | "updatedAt"
  > & {
    effect?: WorkerFinancialMovementEffect;
  },
) {
  assertCurrentUserPermission("create");
  if (!input.workerId) {
    throw new Error(
      "العامل مطلوب.",
    );
  }

  if (
    !Number.isFinite(
      input.amount,
    ) ||
    input.amount <= 0
  ) {
    throw new Error(
      "مبلغ الحركة غير صحيح.",
    );
  }

  if (!input.date) {
    throw new Error(
      "تاريخ الحركة مطلوب.",
    );
  }

  if (
    !input.description?.trim()
  ) {
    throw new Error(
      "بيان الحركة مطلوب.",
    );
  }

  const effect =
    getWorkerMovementEffect(
      input.type,
    );

  const now =
    new Date().toISOString();

  const movement: WorkerFinancialMovement =
    {
      ...input,

      effect,

      description:
        input.description.trim(),

      notes:
        input.notes?.trim() ||
        undefined,

      id: crypto.randomUUID(),

      createdAt: now,

      updatedAt: now,
    };

  saveMovements([
    ...readMovements(),
    movement,
  ]);

  addAuditLog({
    action: "create",
    entity: "worker_financial_movement",
    entityId: movement.id,
    description: `تمت إضافة حركة مالية للعامل بقيمة ${movement.amount.toLocaleString("en-US")} ج.م: ${movement.description}.`,
    notificationTitle: "حركة مالية للعامل",
    notificationType: "success",
    notificationHref: `/workers/${movement.workerId}`,
  });

  return movement;
}

/**
 * تعديل حركة مالية موجودة.
 *
 * الـ effect يعاد حسابه تلقائيًا
 * إذا تم تغيير نوع الحركة.
 */
export function updateWorkerFinancialMovement(
  id: string,
  updates: Partial<
    Omit<
      WorkerFinancialMovement,
      "id" | "createdAt"
    >
  >,
) {
  assertCurrentUserPermission("update");
  const movements =
    readMovements();

  const index =
    movements.findIndex(
      (movement) =>
        movement.id === id,
    );

  if (index === -1) {
    throw new Error(
      "حركة العامل غير موجودة.",
    );
  }

  const currentMovement =
    movements[index];

  const nextType =
    updates.type ??
    currentMovement.type;

  const nextAmount =
    updates.amount !==
    undefined
      ? updates.amount
      : currentMovement.amount;

  const nextDate =
    updates.date ??
    currentMovement.date;

  const nextDescription =
    updates.description !==
    undefined
      ? updates.description.trim()
      : currentMovement.description;

  const nextNotes =
    updates.notes !==
    undefined
      ? updates.notes?.trim() ||
        undefined
      : currentMovement.notes;

  if (
    !Number.isFinite(
      nextAmount,
    ) ||
    nextAmount <= 0
  ) {
    throw new Error(
      "مبلغ الحركة غير صحيح.",
    );
  }

  if (!nextDate) {
    throw new Error(
      "تاريخ الحركة مطلوب.",
    );
  }

  if (!nextDescription) {
    throw new Error(
      "بيان الحركة مطلوب.",
    );
  }

  const nextEffect =
    getWorkerMovementEffect(
      nextType,
    );

  movements[index] = {
    ...currentMovement,
    ...updates,
    type: nextType,
    amount: nextAmount,
    date: nextDate,
    description:
      nextDescription,
    notes: nextNotes,
    effect: nextEffect,
    updatedAt:
      new Date().toISOString(),
  };

  saveMovements(
    movements,
  );

  addAuditLog({
    action: "update",
    entity: "worker_financial_movement",
    entityId: movements[index].id,
    description: `تم تعديل حركة مالية للعامل بقيمة ${movements[index].amount.toLocaleString("en-US")} ج.م.`,
    notificationTitle: "تعديل حركة مالية للعامل",
    notificationType: "info",
    notificationHref: `/workers/${movements[index].workerId}`,
    metadata: { previous: currentMovement, updates },
  });

  return movements[index];
}

/**
 * حذف حركة مالية للعامل.
 */
export function deleteWorkerFinancialMovement(
  id: string,
) {
  assertCurrentUserPermission("delete");
  const movements =
    readMovements();

  if (
    !movements.some(
      (movement) =>
        movement.id === id,
    )
  ) {
    throw new Error(
      "حركة العامل غير موجودة.",
    );
  }

  saveMovements(
    movements.filter(
      (movement) =>
        movement.id !== id,
    ),
  );

  addAuditLog({
    action: "delete",
    entity: "worker_financial_movement",
    entityId: id,
    description: "تم حذف حركة مالية للعامل.",
    notificationTitle: "حذف حركة مالية للعامل",
    notificationType: "warning",
    notificationHref: "/workers",
  });
}
/**
 * تسجيل سلفة عامل مع الحركة النقدية المرتبطة بها.
 * لا يتم اعتبار السلفة مكتملة إلا إذا تم إنشاء:
 * 1) حركة العامل
 * 2) حركة العهدة المرتبطة بها
 * 3) تحديث رصيد العهدة/وسيلة الدفع عند الحاجة
 */
export function createWorkerAdvanceWithPayment(input: {
  workerId: string;
  amount: number;
  date: string;
  description: string;
  custodyId: string;
  financialAccountId?: string;
  projectId?: string;
}) {
  assertCurrentUserPermission("create");

  const custody = getCustodyById(input.custodyId);
  if (!custody) throw new Error("العهدة الدافعة غير موجودة.");

  if (custody.id === "central") {
    if (!input.financialAccountId) {
      throw new Error("اختر وسيلة الدفع من العهدة المركزية.");
    }

    const account = getCustodyFinancialAccountById(input.financialAccountId);
    if (!account || account.custodyId !== "central") {
      throw new Error("وسيلة الدفع غير صحيحة.");
    }

    if (account.balance < input.amount) {
      throw new Error("رصيد وسيلة الدفع غير كافٍ.");
    }
  } else if (input.financialAccountId) {
    throw new Error("وسيلة الدفع متاحة مع العهدة المركزية فقط.");
  }

  const movement = addWorkerFinancialMovement({
    workerId: input.workerId,
    type: "advance",
    amount: input.amount,
    date: input.date,
    description: input.description,
    custodyId: input.custodyId,
    financialAccountId: input.financialAccountId,
    projectId: input.projectId,
    allocation: input.projectId ? "project" : "general",
  });

  let custodyChanged = false;
  let accountChanged = false;
  let transactionId: string | undefined;

  try {
    updateCustodyBalance(input.custodyId, input.amount, "out");
    custodyChanged = true;

    if (input.financialAccountId) {
      updateCustodyFinancialAccountBalance(
        input.financialAccountId,
        input.amount,
        "out",
      );
      accountChanged = true;
    }

    const now = new Date().toISOString();
    const transaction = addCustodyTransaction({
      id: crypto.randomUUID(),
      custodyId: input.custodyId,
      type: "out",
      amount: input.amount,
      date: input.date,
      description: `سلفة العامل: ${input.description.trim()}`,
      source: "سلفة عامل",
      workerFinancialMovementId: movement.id,
      projectId: input.projectId,
      financialAccountId: input.financialAccountId,
      createdAt: now,
      updatedAt: now,
    });

    transactionId = transaction.id;
    return { movement, transaction };
  } catch (error) {
    if (transactionId) {
      try { deleteCustodyTransaction(transactionId); } catch { /* keep original error */ }
    }
    if (accountChanged && input.financialAccountId) {
      try {
        reverseCustodyFinancialAccountBalance(
          input.financialAccountId,
          input.amount,
          "out",
        );
      } catch { /* keep original error */ }
    }
    if (custodyChanged) {
      try { reverseCustodyBalance(input.custodyId, input.amount, "out"); } catch { /* keep original error */ }
    }
    try { deleteWorkerFinancialMovement(movement.id); } catch { /* keep original error */ }
    throw error;
  }
}

/**
 * تعديل سلفة عامل مع إعادة بناء الحركة النقدية المرتبطة بها.
 */
export function updateWorkerAdvanceWithPayment(
  movementId: string,
  updates: {
    workerId: string;
    amount: number;
    date: string;
    description: string;
    custodyId: string;
    financialAccountId?: string;
    projectId?: string;
  },
) {
  assertCurrentUserPermission("update");

  const current = getWorkerFinancialMovementById(movementId);
  if (!current || current.type !== "advance") {
    throw new Error("سلفة العامل غير موجودة.");
  }

  const oldTransaction = getCustodyTransactionByWorkerFinancialMovementId(movementId);
  if (!oldTransaction) throw new Error("حركة العهدة المرتبطة بالسلفة غير موجودة.");

  const newCustody = getCustodyById(updates.custodyId);
  if (!newCustody) throw new Error("العهدة الدافعة غير موجودة.");

  if (newCustody.id === "central") {
    if (!updates.financialAccountId) throw new Error("اختر وسيلة الدفع من العهدة المركزية.");
    const account = getCustodyFinancialAccountById(updates.financialAccountId);
    if (!account || account.custodyId !== "central") throw new Error("وسيلة الدفع غير صحيحة.");
    const available = account.balance + (oldTransaction.financialAccountId === updates.financialAccountId ? oldTransaction.amount : 0);
    if (available < updates.amount) throw new Error("رصيد وسيلة الدفع غير كافٍ.");
  } else if (updates.financialAccountId) {
    throw new Error("وسيلة الدفع متاحة مع العهدة المركزية فقط.");
  }

  reverseCustodyBalance(oldTransaction.custodyId, oldTransaction.amount, "out");
  if (oldTransaction.financialAccountId) {
    reverseCustodyFinancialAccountBalance(oldTransaction.financialAccountId, oldTransaction.amount, "out");
  }

  let newTransaction: ReturnType<typeof addCustodyTransaction> | undefined;
  try {
    updateWorkerFinancialMovement(movementId, {
      workerId: updates.workerId,
      amount: updates.amount,
      date: updates.date,
      description: updates.description,
      custodyId: updates.custodyId,
      financialAccountId: updates.financialAccountId,
      projectId: updates.projectId,
      allocation: updates.projectId ? "project" : "general",
      type: "advance",
    });

    deleteCustodyTransaction(oldTransaction.id);
    updateCustodyBalance(updates.custodyId, updates.amount, "out");
    if (updates.financialAccountId) {
      updateCustodyFinancialAccountBalance(updates.financialAccountId, updates.amount, "out");
    }

    const now = new Date().toISOString();
    newTransaction = addCustodyTransaction({
      id: crypto.randomUUID(),
      custodyId: updates.custodyId,
      type: "out",
      amount: updates.amount,
      date: updates.date,
      description: `سلفة العامل: ${updates.description.trim()}`,
      source: "سلفة عامل",
      workerFinancialMovementId: movementId,
      projectId: updates.projectId,
      financialAccountId: updates.financialAccountId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      movement: getWorkerFinancialMovementById(movementId),
      transaction: newTransaction,
    };
  } catch (error) {
    if (newTransaction) {
      try { deleteCustodyTransaction(newTransaction.id); } catch { /* keep original */ }
    }
    try {
      reverseCustodyBalance(updates.custodyId, updates.amount, "out");
    } catch { /* keep original */ }
    if (updates.financialAccountId) {
      try { reverseCustodyFinancialAccountBalance(updates.financialAccountId, updates.amount, "out"); } catch { /* keep original */ }
    }

    try {
      updateWorkerFinancialMovement(movementId, {
        workerId: current.workerId,
        amount: current.amount,
        date: current.date,
        description: current.description,
        custodyId: current.custodyId,
        financialAccountId: current.financialAccountId,
        projectId: current.projectId,
        allocation: current.allocation,
        type: "advance",
      });
      updateCustodyBalance(oldTransaction.custodyId, oldTransaction.amount, "out");
      if (oldTransaction.financialAccountId) {
        updateCustodyFinancialAccountBalance(oldTransaction.financialAccountId, oldTransaction.amount, "out");
      }
      addCustodyTransaction(oldTransaction);
    } catch { /* keep original */ }

    throw error;
  }
}

export function deleteWorkerAdvanceWithPayment(movementId: string) {
  assertCurrentUserPermission("delete");

  const movement = getWorkerFinancialMovementById(movementId);
  if (!movement || movement.type !== "advance") {
    throw new Error("سلفة العامل غير موجودة.");
  }

  const transaction = getCustodyTransactionByWorkerFinancialMovementId(movementId);
  if (!transaction) throw new Error("حركة العهدة المرتبطة بالسلفة غير موجودة.");

  reverseCustodyBalance(transaction.custodyId, transaction.amount, "out");
  if (transaction.financialAccountId) {
    reverseCustodyFinancialAccountBalance(transaction.financialAccountId, transaction.amount, "out");
  }

  deleteCustodyTransaction(transaction.id);
  deleteWorkerFinancialMovement(movementId);
}
