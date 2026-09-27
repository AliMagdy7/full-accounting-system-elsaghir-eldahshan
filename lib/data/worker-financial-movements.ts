import type {
  WorkerFinancialMovement,
  WorkerFinancialMovementEffect,
  WorkerFinancialMovementType,
} from "@/types/worker-financial-movement";

const STORAGE_KEY =
  "elsaghir-eldahshan-worker-financial-movements";

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

  return movements[index];
}

/**
 * حذف حركة مالية للعامل.
 */
export function deleteWorkerFinancialMovement(
  id: string,
) {
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
}