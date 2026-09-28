import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";

import type {
  Worker,
  WorkerMonthlyDivision,
  WorkerPayType,
  WorkerSiteAssignment,
} from "@/types/worker";

const WORKERS_STORAGE_KEY =
  "elsaghir-eldahshan-workers";

const ASSIGNMENTS_STORAGE_KEY =
  "elsaghir-eldahshan-worker-site-assignments";

function readWorkers(): Worker[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        WORKERS_STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveWorkers(
  workers: Worker[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    WORKERS_STORAGE_KEY,
    JSON.stringify(workers),
  );
}

function readAssignments(): WorkerSiteAssignment[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        ASSIGNMENTS_STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveAssignments(
  assignments: WorkerSiteAssignment[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ASSIGNMENTS_STORAGE_KEY,
    JSON.stringify(assignments),
  );
}

function normalizeName(
  name: string,
) {
  return name
    .trim()
    .toLocaleLowerCase();
}

function generateWorkerId(
  workers: Worker[],
) {
  const numbers = workers
    .map((worker) => {
      const match =
        worker.id.match(
          /^W-(\d+)$/,
        );

      return match
        ? Number(match[1])
        : 0;
    })
    .filter(
      (number) =>
        Number.isFinite(number),
    );

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1;

  return `W-${String(
    nextNumber,
  ).padStart(4, "0")}`;
}

export function getWorkers() {
  return readWorkers().sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        "ar",
      ),
  );
}

export function getWorkerById(
  id: string,
) {
  return readWorkers().find(
    (worker) =>
      worker.id === id,
  );
}

export function getWorkerByName(
  name: string,
) {
  const normalized =
    normalizeName(name);

  return readWorkers().find(
    (worker) =>
      normalizeName(
        worker.name,
      ) === normalized,
  );
}

export function workerNameExists(
  name: string,
  excludeWorkerId?: string,
) {
  const normalized =
    normalizeName(name);

  return readWorkers().some(
    (worker) =>
      worker.id !==
        excludeWorkerId &&
      normalizeName(
        worker.name,
      ) === normalized,
  );
}

export function addWorker(input: {
  name: string;

  currentProjectId: string;

  startDate: string;

  payType: WorkerPayType;

  dailyRate?: number;

  monthlySalary?: number;

  monthlyDivision?: WorkerMonthlyDivision;

  carriedSalary?: number;
}) {
  assertCurrentUserPermission("create");
  const workers =
    readWorkers();

  const name =
    input.name.trim();

  if (!name) {
    throw new Error(
      "اسم العامل مطلوب.",
    );
  }

  if (
    workerNameExists(name)
  ) {
    const existing =
      getWorkerByName(name);

    throw new Error(
      `العامل "${existing?.name ?? name}" موجود بالفعل في النظام.`,
    );
  }

  if (
    !input.currentProjectId
  ) {
    throw new Error(
      "الموقع الحالي للعامل مطلوب.",
    );
  }

  if (!input.startDate) {
    throw new Error(
      "تاريخ بداية العمل مطلوب.",
    );
  }

  if (
    input.payType ===
    "daily"
  ) {
    const rate =
      Number(
        input.dailyRate ?? 0,
      );

    if (
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      throw new Error(
        "الأجر اليومي يجب أن يكون أكبر من صفر.",
      );
    }
  }

  if (
    input.payType ===
    "monthly"
  ) {
    const salary =
      Number(
        input.monthlySalary ?? 0,
      );

    if (
      !Number.isFinite(
        salary,
      ) ||
      salary <= 0
    ) {
      throw new Error(
        "المرتب الشهري يجب أن يكون أكبر من صفر.",
      );
    }

    if (
      input.monthlyDivision !==
        30 &&
      input.monthlyDivision !==
        26 &&
      input.monthlyDivision !==
        24
    ) {
      throw new Error(
        "اختر طريقة تقسيم المرتب الشهري.",
      );
    }
  }

  const now =
    new Date().toISOString();

  const worker: Worker = {
    id: generateWorkerId(
      workers,
    ),

    name,

    currentProjectId:
      input.currentProjectId,

    startDate:
      input.startDate,

    payType:
      input.payType,

    ...(input.payType ===
    "daily"
      ? {
          dailyRate:
            Number(
              input.dailyRate,
            ),
        }
      : {
          monthlySalary:
            Number(
              input.monthlySalary,
            ),

          monthlyDivision:
            input.monthlyDivision,
        }),

    carriedSalary:
      Number(
        input.carriedSalary ?? 0,
      ),

    createdAt: now,

    updatedAt: now,
  };

  saveWorkers([
    ...workers,
    worker,
  ]);

  const assignment: WorkerSiteAssignment =
    {
      id: crypto.randomUUID(),

      workerId:
        worker.id,

      projectId:
        worker.currentProjectId,

      startDate:
        worker.startDate,

      payType:
        worker.payType,

      ...(worker.payType ===
      "daily"
        ? {
            dailyRate:
              worker.dailyRate,
          }
        : {
            monthlySalary:
              worker.monthlySalary,

            monthlyDivision:
              worker.monthlyDivision,
          }),

      createdAt: now,

      updatedAt: now,
    };

  saveAssignments([
    ...readAssignments(),
    assignment,
  ]);

  addAuditLog({
    action: "create",
    entity: "worker",
    entityId: worker.id,
    description: `تمت إضافة العامل: ${worker.name}.`,
    notificationTitle: "إضافة عامل",
    notificationType: "success",
    notificationHref: `/workers/${worker.id}`,
  });

  return worker;
}

export function updateWorker(
  id: string,
  updates: Partial<
    Omit<
      Worker,
      "id" | "createdAt"
    >
  >,
  options?: {
  audit?: boolean },
) {
  assertCurrentUserPermission("update");
  const workers =
    readWorkers();

  const index =
    workers.findIndex(
      (worker) =>
        worker.id === id,
    );

  if (index === -1) {
    throw new Error(
      "العامل غير موجود.",
    );
  }

  const current =
    workers[index];

  if (
    updates.name !==
      undefined &&
    workerNameExists(
      updates.name,
      id,
    )
  ) {
    const existing =
      getWorkerByName(
        updates.name,
      );

    throw new Error(
      `العامل "${existing?.name ?? updates.name}" موجود بالفعل في النظام.`,
    );
  }

  const next: Worker = {
    ...current,
    ...updates,
    name:
      updates.name !==
      undefined
        ? updates.name.trim()
        : current.name,
    updatedAt:
      new Date().toISOString(),
  };

  workers[index] =
    next;

  saveWorkers(
    workers,
  );

  if (options?.audit !== false) {
    addAuditLog({
      action: "update",
      entity: "worker",
      entityId: next.id,
      description: `تم تعديل بيانات العامل: ${next.name}.`,
      notificationTitle: "تعديل عامل",
      notificationType: "info",
      notificationHref: `/workers/${next.id}`,
      metadata: { previous: current, updates },
    });
  }

  return next;
}

export function getWorkerSiteAssignments(
  workerId: string,
) {
  return readAssignments()
    .filter(
      (assignment) =>
        assignment.workerId ===
        workerId,
    )
    .sort(
      (a, b) =>
        b.startDate.localeCompare(
          a.startDate,
        ),
    );
}

export function getCurrentWorkerSiteAssignment(
  workerId: string,
) {
  return (
    getWorkerSiteAssignments(
      workerId,
    ).find(
      (assignment) =>
        !assignment.endDate,
    ) ??
    undefined
  );
}

export function moveWorkerToProject(
  input: {
    workerId: string;

    projectId: string;

    startDate: string;

    keepSalary: boolean;

    payType?: WorkerPayType;

    dailyRate?: number;

    monthlySalary?: number;

    monthlyDivision?: WorkerMonthlyDivision;
  },
) {
  const worker =
    getWorkerById(
      input.workerId,
    );

  if (!worker) {
    throw new Error(
      "العامل غير موجود.",
    );
  }

  if (!input.projectId) {
    throw new Error(
      "الموقع الجديد مطلوب.",
    );
  }

  if (!input.startDate) {
    throw new Error(
      "تاريخ الانتقال مطلوب.",
    );
  }

  const assignments =
    readAssignments();

  const now =
    new Date().toISOString();

  /*
   * نحدد التعيين الحالي المفتوح.
   */

  const openIndex =
    assignments.findIndex(
      (assignment) =>
        assignment.workerId ===
          worker.id &&
        !assignment.endDate,
    );

  const currentAssignment =
    openIndex !== -1
      ? assignments[openIndex]
      : undefined;

  /*
   * تاريخ الانتقال يجب أن يكون بعد بداية
   * التعيين الحالي، حتى لا يحدث تداخل
   * أو تاريخ غير منطقي في سجل المواقع.
   */

  if (
    currentAssignment &&
    input.startDate <=
      currentAssignment.startDate
  ) {
    throw new Error(
      "تاريخ الانتقال يجب أن يكون بعد تاريخ بداية الموقع الحالي.",
    );
  }

  /*
   * تحديد نظام المرتب للموقع الجديد.
   *
   * عند الاحتفاظ بالمرتب، نعتمد على
   * التعيين الحالي نفسه وليس على Worker،
   * حتى تظل بيانات الأجر التاريخية مستقلة.
   */

  const nextPayType =
    input.keepSalary
      ? currentAssignment?.payType ??
        worker.payType
      : input.payType;

  if (!nextPayType) {
    throw new Error(
      "اختر نظام أجر الموقع الجديد.",
    );
  }

  let nextDailyRate =
    input.keepSalary
      ? currentAssignment?.dailyRate ??
        worker.dailyRate
      : input.dailyRate;

  let nextMonthlySalary =
    input.keepSalary
      ? currentAssignment?.monthlySalary ??
        worker.monthlySalary
      : input.monthlySalary;

  let nextMonthlyDivision =
    input.keepSalary
      ? currentAssignment?.monthlyDivision ??
        worker.monthlyDivision
      : input.monthlyDivision;

  /*
   * نقفل التعيين السابق في اليوم السابق
   * لبداية الموقع الجديد.
   */

  if (openIndex !== -1) {
    const previousDate =
      new Date(
        `${input.startDate}T00:00:00`,
      );

    previousDate.setDate(
      previousDate.getDate() - 1,
    );

    assignments[
      openIndex
    ] = {
      ...assignments[
        openIndex
      ],

      endDate:
        previousDate
          .toISOString()
          .slice(0, 10),

      updatedAt: now,
    };
  }

  if (
    nextPayType ===
    "daily"
  ) {
    if (
      !Number.isFinite(
        Number(
          nextDailyRate,
        ),
      ) ||
      Number(
        nextDailyRate,
      ) <= 0
    ) {
      throw new Error(
        "الأجر اليومي الجديد يجب أن يكون أكبر من صفر.",
      );
    }

    nextMonthlySalary =
      undefined;

    nextMonthlyDivision =
      undefined;
  }

  if (
    nextPayType ===
    "monthly"
  ) {
    if (
      !Number.isFinite(
        Number(
          nextMonthlySalary,
        ),
      ) ||
      Number(
        nextMonthlySalary,
      ) <= 0
    ) {
      throw new Error(
        "المرتب الشهري الجديد يجب أن يكون أكبر من صفر.",
      );
    }

    if (
      nextMonthlyDivision !==
        30 &&
      nextMonthlyDivision !==
        26 &&
      nextMonthlyDivision !==
        24
    ) {
      throw new Error(
        "اختر تقسيم المرتب الشهري.",
      );
    }

    nextDailyRate =
      undefined;
  }

  const assignment: WorkerSiteAssignment =
    {
      id: crypto.randomUUID(),

      workerId:
        worker.id,

      projectId:
        input.projectId,

      startDate:
        input.startDate,

      payType:
        nextPayType,

      ...(nextPayType ===
      "daily"
        ? {
            dailyRate:
              Number(
                nextDailyRate,
              ),
          }
        : {
            monthlySalary:
              Number(
                nextMonthlySalary,
              ),

            monthlyDivision:
              nextMonthlyDivision,
          }),

      createdAt: now,

      updatedAt: now,
    };

  assignments.push(
    assignment,
  );

  saveAssignments(
    assignments,
  );

  /*
   * تحديث البيانات الحالية للعامل.
   */

  const updatedWorker =
    updateWorker(
      worker.id,
      {
        currentProjectId:
          input.projectId,

        startDate:
          worker.startDate,

        payType:
          nextPayType,

        dailyRate:
          nextDailyRate,

        monthlySalary:
          nextMonthlySalary,

        monthlyDivision:
          nextMonthlyDivision,
      },
      { audit: false },
    );

  addAuditLog({
    action: "transfer",
    entity: "worker",
    entityId: worker.id,
    description: `تم نقل العامل ${worker.name} إلى موقع جديد.`,
    notificationTitle: "نقل عامل",
    notificationType: "info",
    notificationHref: `/workers/${worker.id}`,
    metadata: {
      fromProjectId: worker.currentProjectId,
      toProjectId: input.projectId,
      assignmentId: assignment.id,
    },
  });

  return {
    worker: updatedWorker,
    assignment,
  };
}

export function deleteWorker(
  id: string,
) {
  assertCurrentUserPermission("delete");
  const workers =
    readWorkers();

  const exists =
    workers.some(
      (worker) =>
        worker.id === id,
    );

  if (!exists) {
    throw new Error(
      "العامل غير موجود.",
    );
  }

  saveWorkers(
    workers.filter(
      (worker) =>
        worker.id !== id,
    ),
  );

  saveAssignments(
    readAssignments().filter(
      (assignment) =>
        assignment.workerId !==
        id,
    ),
  );

  addAuditLog({
    action: "delete",
    entity: "worker",
    entityId: id,
    description: "تم حذف العامل من النظام.",
    notificationTitle: "حذف عامل",
    notificationType: "warning",
    notificationHref: "/workers",
  });
}