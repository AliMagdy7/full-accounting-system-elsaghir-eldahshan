"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Edit3,
  FileText,
  History,
  MapPin,
  Plus,
  Save,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getWorkerById,
  getWorkerSiteAssignments,
  moveWorkerToProject,
  updateWorker,
} from "@/lib/data/workers";

import { getProjects } from "@/lib/data/projects";

import {
  getCustodies,
  reverseCustodyBalance,
  updateCustodyBalance,
} from "@/lib/data/custodies";

import {
  addCustodyTransaction,
  deleteCustodyTransaction,
  getCustodyTransactions,
} from "@/lib/data/custody-transactions";

import {
  getCustodyFinancialAccounts,
  getCustodyFinancialAccountById,
  reverseCustodyFinancialAccountBalance,
  updateCustodyFinancialAccountBalance,
} from "@/lib/data/custody-financial-accounts";

import {
  addWorkerFinancialMovement,
  deleteWorkerFinancialMovement,
  getWorkerFinancialMovementsByWorkerId,
  getWorkerFinancialSummary,
  getWorkerFinancialBalanceByProject,
  updateWorkerFinancialMovement,
} from "@/lib/data/worker-financial-movements";

import type { Worker, WorkerSiteAssignment } from "@/types/worker";
import type {
  Project,
} from "@/types/project";
import type { Custody } from "@/types/custody";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";
import type {
  WorkerFinancialMovement,
  WorkerFinancialMovementType,
} from "@/types/worker-financial-movement";

const CENTRAL_CUSTODY_ID = "central";

type WorkerAttendanceStatus =
  | "present"
  | "absent"

interface WorkerAttendanceRecord {
  id: string;
  workerId: string;
  date: string;
  status: WorkerAttendanceStatus;
  overtime: number;
  deduction: number;
  transport: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const WORKER_ATTENDANCE_STORAGE_KEY =
  "elsaghir-eldahshan-worker-attendance";

function readWorkerAttendance(): WorkerAttendanceRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      WORKER_ATTENDANCE_STORAGE_KEY,
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWorkerAttendance(
  records: WorkerAttendanceRecord[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    WORKER_ATTENDANCE_STORAGE_KEY,
    JSON.stringify(records),
  );
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}



interface WorkerMonthlyPayrollSummary {
  workerId: string;
  month: string;
  present: number;
  absent: number;
  overtime: number;
  deduction: number;
  transport: number;
  notes: string;
  updatedAt: string;
}

interface WorkerMonthlyProjectPayrollSummary extends WorkerMonthlyPayrollSummary {
  projectId: string;
}

const WORKER_MONTHLY_PROJECT_PAYROLL_STORAGE_KEY =
  "elsaghir-eldahshan-worker-monthly-project-payroll";

function readWorkerMonthlyProjectPayrollSummaries(): WorkerMonthlyProjectPayrollSummary[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(
      WORKER_MONTHLY_PROJECT_PAYROLL_STORAGE_KEY,
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWorkerMonthlyProjectPayrollSummary(
  summary: WorkerMonthlyProjectPayrollSummary,
) {
  if (typeof window === "undefined") return;

  const summaries = readWorkerMonthlyProjectPayrollSummaries();
  const index = summaries.findIndex(
    (item) =>
      item.workerId === summary.workerId &&
      item.month === summary.month &&
      item.projectId === summary.projectId,
  );

  if (index === -1) {
    summaries.push(summary);
  } else {
    summaries[index] = summary;
  }

  window.localStorage.setItem(
    WORKER_MONTHLY_PROJECT_PAYROLL_STORAGE_KEY,
    JSON.stringify(summaries),
  );
}

const WORKER_MONTHLY_PAYROLL_STORAGE_KEY =
  "elsaghir-eldahshan-worker-monthly-payroll";

function readWorkerMonthlyPayrollSummaries(): WorkerMonthlyPayrollSummary[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      WORKER_MONTHLY_PAYROLL_STORAGE_KEY,
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWorkerMonthlyPayrollSummary(
  summary: WorkerMonthlyPayrollSummary,
) {
  if (typeof window === "undefined") {
    return;
  }

  const summaries = readWorkerMonthlyPayrollSummaries();
  const cleanSummary: WorkerMonthlyPayrollSummary = {
    workerId: summary.workerId,
    month: summary.month,
    present: summary.present,
    absent: summary.absent,
    overtime: summary.overtime,
    deduction: summary.deduction,
    transport: summary.transport,
    notes: summary.notes,
    updatedAt: summary.updatedAt,
  };

  const index = summaries.findIndex(
    (item) =>
      item.workerId === cleanSummary.workerId &&
      item.month === cleanSummary.month,
  );

  if (index === -1) {
    summaries.push(cleanSummary);
  } else {
    summaries[index] = cleanSummary;
  }

  window.localStorage.setItem(
    WORKER_MONTHLY_PAYROLL_STORAGE_KEY,
    JSON.stringify(summaries),
  );
}

function derivePayrollSummaryFromAttendance(
  worker: Worker,
  month: string,
) {
  const records = readWorkerAttendance().filter(
    (record) =>
      record.workerId === worker.id &&
      record.date.startsWith(`${month}-`),
  );

  let present = 0;
  let absent = 0;
  let overtime = 0;
  let deduction = 0;
  let transport = 0;

  records.forEach((record) => {
    if (record.status === "present") present += 1;
    if (record.status === "absent") absent += 1;
    overtime += Number(record.overtime || 0);
    deduction += Number(record.deduction || 0);
    transport += Number(record.transport || 0);
  });

  return {
    present,
    absent,
    overtime,
    deduction,
    transport,
  };
}

const MOVEMENT_LABELS: Record<
  WorkerFinancialMovementType,
  string
> = {
  salary: "راتب",
  advance: "سلفة",
  bonus: "مكافأة / إكرامية",
  transport: "بدل انتقال",
  deduction: "خصم",
  payment: "دفعة",
};

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date?: string): string {
  if (!date) {
    return "غير محدد";
  }

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMovementEffect(
  type: WorkerFinancialMovementType,
): "increase" | "decrease" {
  /*
   * الرصيد هنا معناه:
   *
   * موجب = مبلغ مستحق للعامل.
   * سالب = مبلغ على العامل للشركة.
   *
   * لذلك:
   * الراتب     -> يقلل مستحق العامل.
   * السلفة     -> تقلل مستحق العامل وتزيد مديونيته.
   * الخصم      -> يقلل مستحق العامل.
   * الدفعة      -> تقلل مستحق العامل.
   *
   * المكافأة والإكرامية والمواصلات
   * -> تزيد مستحق العامل.
   */
  if (
    type === "salary" ||
    type === "advance" ||
    type === "deduction" ||
    type === "payment"
  ) {
    return "decrease";
  }

  return "increase";
}

function getMovementLabel(
  type: WorkerFinancialMovementType,
): string {
  return MOVEMENT_LABELS[type] ?? "حركة مالية";
}

function getMovementClasses(
  effect: "increase" | "decrease",
): string {
  return effect === "increase"
    ? "bg-emerald-50 text-emerald-600"
    : "bg-red-50 text-red-600";
}

function getMovementAmountClasses(
  effect: "increase" | "decrease",
): string {
  return effect === "increase"
    ? "text-emerald-600"
    : "text-red-600";
}

function normalizeNumber(value: string): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

function isCashOutMovement(
  type: WorkerFinancialMovementType,
): boolean {
  return (
    type === "salary" ||
    type === "advance" ||
    type === "payment"
  );
}

export default function WorkerDetailsPage() {
  const params = useParams();

  const workerId = String(params.id);

  const [worker, setWorker] =
    useState<Worker | null>(null);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [custodies, setCustodies] =
    useState<Custody[]>([]);

  const [financialAccounts, setFinancialAccounts] =
    useState<CustodyFinancialAccount[]>([]);

  const [assignments, setAssignments] =
    useState<ReturnType<typeof getWorkerSiteAssignments>>(
      [],
    );

  const [movements, setMovements] =
    useState<WorkerFinancialMovement[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * تعديل بيانات العامل
   */
  const [isEditOpen, setIsEditOpen] =
    useState(false);

  const [editName, setEditName] =
    useState("");

  /*
   * نقل العامل
   */
  const [isTransferOpen, setIsTransferOpen] =
    useState(false);

  const [transferProjectId, setTransferProjectId] =
    useState("");

  const [transferDate, setTransferDate] =
    useState(getToday());

  const [transferSalary, setTransferSalary] =
    useState("");

  /*
   * الحركة المالية
   */
  const [movementType, setMovementType] =
    useState<WorkerFinancialMovementType>("advance");

  const [movementDate, setMovementDate] =
    useState(getToday());

  const [movementAmount, setMovementAmount] =
    useState("");

  const [movementDescription, setMovementDescription] =
    useState("");

  const [movementNotes, setMovementNotes] =
    useState("");

  const [movementCustodyId, setMovementCustodyId] =
    useState("");

  const [movementFinancialAccountId, setMovementFinancialAccountId] =
    useState("");

  const [movementProjectId, setMovementProjectId] =
    useState("");

  const [movementAllocation, setMovementAllocation] =
    useState<"general" | "project">("general");

  const [isMovementFormOpen, setIsMovementFormOpen] =
    useState(false);

  /*
   * تعديل / حذف الحركة المالية
   */
  const [editingMovementId, setEditingMovementId] =
    useState("");

  const [isMovementEditOpen, setIsMovementEditOpen] =
    useState(false);

  const [editMovementType, setEditMovementType] =
    useState<WorkerFinancialMovementType>("advance");

  const [editMovementDate, setEditMovementDate] =
    useState(getToday());

  const [editMovementAmount, setEditMovementAmount] =
    useState("");

  const [editMovementDescription, setEditMovementDescription] =
    useState("");

  const [editMovementNotes, setEditMovementNotes] =
    useState("");

  const [editMovementCustodyId, setEditMovementCustodyId] =
    useState("");

  const [editMovementFinancialAccountId, setEditMovementFinancialAccountId] =
    useState("");

  const [editMovementProjectId, setEditMovementProjectId] =
    useState("");

  const [editMovementAllocation, setEditMovementAllocation] =
    useState<"general" | "project">("general");

  /*
   * ملخص مرتب الشهر
   * يتم حفظه لكل عامل ولكل شهر، ويمكن تعديل أرقامه مباشرة من الملخص.
   */
  const [attendanceMonth, setAttendanceMonth] =
    useState(getMonthKey(new Date()));

  const [payrollInputs, setPayrollInputs] =
    useState<WorkerMonthlyPayrollSummary>({
      workerId: workerId,
      month: getMonthKey(new Date()),
      present: 0,
      absent: 0,
      overtime: 0,
      deduction: 0,
      transport: 0,
      notes: "",
      updatedAt: new Date().toISOString(),
    });


  const [projectPayrollInputs, setProjectPayrollInputs] =
    useState<Record<string, WorkerMonthlyProjectPayrollSummary>>({});
  const [isPayrollNotesEditing, setIsPayrollNotesEditing] =
    useState(false);

  /*
   * تحميل البيانات
   */
  const loadData = () => {
    setLoading(true);
    setError("");

    const currentWorker =
      getWorkerById(workerId);

    if (!currentWorker) {
      setWorker(null);
      setProjects([]);
      setCustodies([]);
      setFinancialAccounts([]);
      setAssignments([]);
      setMovements([]);
      setLoading(false);
      return;
    }

    const allProjects =
      getProjects();

    const allCustodies =
      getCustodies();

    const workerAssignments =
      getWorkerSiteAssignments(workerId);

    const workerMovements =
      getWorkerFinancialMovementsByWorkerId(
        workerId,
      )
        .slice()
        .sort((a, b) => {
          const dateComparison =
            b.date.localeCompare(a.date);

          if (dateComparison !== 0) {
            return dateComparison;
          }

          return b.createdAt.localeCompare(
            a.createdAt,
          );
        });

    setWorker(currentWorker);
    setProjects(allProjects);
    setCustodies(allCustodies);
    setAssignments(workerAssignments);
    setMovements(workerMovements);

    if (
      movementCustodyId ===
      CENTRAL_CUSTODY_ID
    ) {
      setFinancialAccounts(
        getCustodyFinancialAccounts(
          CENTRAL_CUSTODY_ID,
        ),
      );
    } else if (movementCustodyId) {
      setFinancialAccounts(
        getCustodyFinancialAccounts(
          movementCustodyId,
        ),
      );
    } else {
      setFinancialAccounts([]);
    }

    setEditName(currentWorker.name ?? "");
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  /*
   * عند تغيير العهدة يتم تحميل حساباتها المالية.
   */
  useEffect(() => {
    if (!movementCustodyId) {
      setFinancialAccounts([]);
      setMovementFinancialAccountId("");
      return;
    }

    const accounts =
      getCustodyFinancialAccounts(
        movementCustodyId,
      );

    setFinancialAccounts(accounts);

    setMovementFinancialAccountId("");
  }, [movementCustodyId]);

  /*
   * المشاريع التي عمل بها العامل.
   */
  const workedProjectIds = useMemo(() => {
    return new Set(
      assignments
        .map(
          (assignment) =>
            assignment.projectId,
        )
        .filter(Boolean),
    );
  }, [assignments]);

  const workedProjects = useMemo(() => {
    return projects.filter((project) =>
      workedProjectIds.has(project.id),
    );
  }, [projects, workedProjectIds]);

  /*
   * المشروع الحالي
   */
  const currentAssignment =
    assignments.find((assignment) => !assignment.endDate) ??
    assignments[0];

  const currentProject =
    currentAssignment
      ? projects.find(
          (project) =>
            project.id ===
            currentAssignment.projectId,
        )
      : undefined;

  /*
   * تعديل بيانات العامل
   */
  const handleEditWorker = () => {
    if (!worker) {
      return;
    }

    setError("");
    setSuccess("");

    const name = editName.trim();

    if (!name) {
      setError("من فضلك اكتب اسم العامل.");
      return;
    }

    setIsSaving(true);

    try {
      updateWorker(worker.id, {
        name,
      });

      setSuccess(
        "تم تحديث بيانات العامل بنجاح.",
      );

      setIsEditOpen(false);

      loadData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ أثناء تحديث بيانات العامل.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
   * نقل العامل لمشروع جديد
   */
  const handleTransferWorker = () => {
    if (!worker) {
      return;
    }

    setError("");
    setSuccess("");

    if (!transferProjectId) {
      setError(
        "من فضلك اختر المشروع الجديد.",
      );
      return;
    }

    if (!transferDate) {
      setError(
        "من فضلك اختر تاريخ النقل.",
      );
      return;
    }

    const salary = normalizeNumber(
      transferSalary,
    );

    if (
      transferSalary.trim() &&
      salary <= 0
    ) {
      setError(
        "قيمة الراتب الجديدة غير صحيحة.",
      );
      return;
    }

    setIsSaving(true);

    try {
      moveWorkerToProject({
        workerId: worker.id,
        projectId: transferProjectId,
        startDate: transferDate,
        keepSalary: !transferSalary.trim(),
        ...(transferSalary.trim()
          ? {
              payType: worker.payType,
              dailyRate:
                worker.payType === "daily"
                  ? salary
                  : undefined,
              monthlySalary:
                worker.payType === "monthly"
                  ? salary
                  : undefined,
              monthlyDivision:
                worker.payType === "monthly"
                  ? worker.monthlyDivision ?? 26
                  : undefined,
            }
          : {}),
      });

      setSuccess(
        "تم نقل العامل للمشروع الجديد وإنشاء فترة عمل جديدة.",
      );

      setIsTransferOpen(false);
      setTransferProjectId("");
      setTransferDate(getToday());
      setTransferSalary("");

      loadData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ أثناء نقل العامل.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
   * المشروع الحالي للعامل، ويُستخدم تلقائيًا في الحركة المالية.
   */
  const movementCurrentProjectId =
    currentAssignment?.projectId ??
    worker?.currentProjectId ??
    "";

  /*
   * تسجيل حركة مالية
   */
  const handleMovementSubmit = () => {
    if (!worker) {
      return;
    }

    setError("");
    setSuccess("");

    const amount =
      normalizeNumber(movementAmount);

    if (!movementDate) {
      setError("من فضلك اختر تاريخ الحركة.");
      return;
    }

    if (amount <= 0) {
      setError(
        "من فضلك أدخل مبلغًا صحيحًا أكبر من صفر.",
      );
      return;
    }

    if (
      movementType !== "salary" &&
      movementType !== "advance"
    ) {
      setError(
        "الحركة المالية متاحة للراتب والسلفة فقط. الخصم والإضافي وبدل الانتقال يتم تسجيلهم من جدول الحضور.",
      );
      return;
    }

    if (!movementDescription.trim()) {
      setError("من فضلك اكتب بيان الحركة.");
      return;
    }

    /*
     * الراتب هو صرف من مستحق العامل.
     *
     * لذلك لا يمكن صرف راتب أكبر
     * من الرصيد المستحق حاليًا.
     */
    if (!movementProjectId) {
      setError("من فضلك اختر الموقع / المشروع الذي تخصه حركة العامل.");
      return;
    }

    const selectedCustodyPreview = custodies.find((item) => item.id === movementCustodyId);
    if (selectedCustodyPreview?.type === "project" && selectedCustodyPreview.projectId !== movementProjectId) {
      setError("عهدة الموقع يجب أن تخصم الحركة من حساب العامل في نفس الموقع.");
      return;
    }

    const projectPayable = getProjectPayableBalance(movementProjectId);
    if (movementType === "salary" && amount > projectPayable) {
      setError(
        `لا يمكن صرف راتب أكبر من مستحق العامل في هذا الموقع. المستحق الحالي ${formatAmount(projectPayable)} جنيه.`,
      );
      return;
    }

    if (movementType === "salary" && projectPayable <= 0) {
      setError("لا يوجد مستحق للعامل في هذا الموقع يمكن صرف راتب منه.");
      return;
    }

    if (!movementCustodyId) {
      setError(
        "من فضلك اختر العهدة التي سيتم تسجيل الحركة عليها.",
      );
      return;
    }

    const custody =
      custodies.find(
        (item) =>
          item.id === movementCustodyId,
      );

    if (!custody) {
      setError("العهدة المختارة غير موجودة.");
      return;
    }

    /*
     * الحركات التي تعتبر صرفًا فعليًا
     * تحتاج إلى رصيد متاح في العهدة.
     */
    const cashOutMovement =
      isCashOutMovement(movementType);

    /*
     * عهدة "عهدتي أنا" فقط لازم تمنع الصرف عند تجاوز
     * الرصيد الفعلي للعهدة/طريقة الدفع.
     * أما عهد الموقع وأي عهدة أخرى، فيُسمح لها أن تصبح سالبة.
     */
    if (
      cashOutMovement &&
      movementCustodyId === CENTRAL_CUSTODY_ID &&
      Number(custody.balance) < amount
    ) {
      setError(
        `رصيد عهدتي أنا غير كافٍ. الرصيد الحالي ${formatAmount(
          custody.balance,
        )} جنيه.`,
      );
      return;
    }

    if (
      movementCustodyId === CENTRAL_CUSTODY_ID &&
      !movementFinancialAccountId
    ) {
      setError(
        "من فضلك اختر طريقة الدفع الفعلية التي سيتم الدفع منها.",
      );
      return;
    }

    if (
      movementFinancialAccountId
    ) {
      const account =
        getCustodyFinancialAccountById(
          movementFinancialAccountId,
        );

      if (
        account &&
        cashOutMovement &&
        Number(account.balance) < amount
      ) {
        setError(
          `رصيد الحساب المالي غير كافٍ. الرصيد الحالي ${formatAmount(
            account.balance,
          )} جنيه.`,
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      const effect =
        getMovementEffect(
          movementType,
        );

      /*
       * في المرحلة الحالية يتم تسجيل الحركة
       * على حساب العامل أولًا.
       */
      const createdMovement = addWorkerFinancialMovement({
        workerId: worker.id,
        type: movementType,
        effect,
        amount,
        date: movementDate,
        description:
          movementDescription.trim(),
        notes:
          movementNotes.trim() ||
          undefined,
        custodyId: movementCustodyId,
        financialAccountId:
          movementFinancialAccountId ||
          undefined,
        projectId:
          movementProjectId ||
          undefined,
        allocation:
          movementProjectId
            ? movementAllocation
            : "general",
      });

      /*
       * الحركات النقدية الفعلية تخصم من العهدة
       * ويتم ربط حركة العهدة بحركة العامل.
       */
      if (cashOutMovement) {
        updateCustodyBalance(
          movementCustodyId,
          amount,
          "out",
        );

        if (movementFinancialAccountId) {
          updateCustodyFinancialAccountBalance(
            movementFinancialAccountId,
            amount,
            "out",
          );
        }

        addCustodyTransaction({
          id: crypto.randomUUID(),
          custodyId: movementCustodyId,
          type: "out",
          amount,
          date: movementDate,
          description:
            `${getMovementLabel(
              movementType,
            )} للعامل ${worker.name}: ${movementDescription.trim()}`,
          source: "حساب العامل",
          workerFinancialMovementId: createdMovement.id,
          projectId: movementProjectId || undefined,
          financialAccountId:
            movementFinancialAccountId || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setSuccess(
        movementType === "salary"
          ? `تم صرف راتب ${formatAmount(
              amount,
            )} جنيه من مستحق العامل.`
          : movementType === "advance"
            ? `تم تسجيل سلفة ${formatAmount(
                amount,
              )} جنيه على العامل.`
            : `تم تسجيل ${getMovementLabel(
                movementType,
              )} بقيمة ${formatAmount(
                amount,
              )} جنيه.`,
      );

      setMovementAmount("");
      setMovementDescription("");
      setIsMovementFormOpen(false);
      setMovementNotes("");
      setMovementProjectId(movementCurrentProjectId);
      setMovementAllocation("project");

      /*
       * بعد تسجيل راتب أو سلفة نرجع
       * الافتراضي للسلفة حتى لا يتم
       * تسجيل راتب بالخطأ.
       */
      if (movementType === "salary") {
        setMovementType("advance");
      }

      loadData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ أثناء تسجيل الحركة المالية.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openMovementEdit = (movement: WorkerFinancialMovement) => {
    setError("");
    setSuccess("");
    setEditingMovementId(movement.id);
    setEditMovementType(movement.type);
    setEditMovementDate(movement.date);
    setEditMovementAmount(String(movement.amount));
    setEditMovementDescription(movement.description);
    setEditMovementNotes(movement.notes ?? "");
    setEditMovementCustodyId(movement.custodyId ?? "");
    setEditMovementFinancialAccountId(movement.financialAccountId ?? "");
    setEditMovementProjectId(movement.projectId ?? "");
    setEditMovementAllocation(movement.allocation ?? "general");
    setIsMovementEditOpen(true);
  };

  const closeMovementEdit = () => {
    setIsMovementEditOpen(false);
    setEditingMovementId("");
  };

  const handleMovementUpdate = () => {
    if (!worker || !editingMovementId) return;

    setError("");
    setSuccess("");

    const currentMovement = movements.find(
      (movement) => movement.id === editingMovementId,
    );

    if (!currentMovement) {
      setError("الحركة المالية المطلوب تعديلها غير موجودة.");
      return;
    }

    const amount = normalizeNumber(editMovementAmount);
    if (!editMovementDate) {
      setError("من فضلك اختر تاريخ الحركة.");
      return;
    }
    if (amount <= 0) {
      setError("من فضلك أدخل مبلغًا صحيحًا أكبر من صفر.");
      return;
    }
    if (!editMovementDescription.trim()) {
      setError("من فضلك اكتب بيان الحركة.");
      return;
    }
    if (!editMovementCustodyId) {
      setError("من فضلك اختر العهدة التي سيتم تسجيل الحركة عليها.");
      return;
    }

    if (!editMovementProjectId) {
      setError("من فضلك اختر الموقع / المشروع الذي تخصه الحركة.");
      return;
    }

    const targetCustody = custodies.find(
      (custody) => custody.id === editMovementCustodyId,
    );
    if (!targetCustody) {
      setError("العهدة المختارة غير موجودة.");
      return;
    }

    const oldIsCashOut = isCashOutMovement(currentMovement.type);
    const nextIsCashOut = isCashOutMovement(editMovementType);

    if (nextIsCashOut && editMovementCustodyId === CENTRAL_CUSTODY_ID && !editMovementFinancialAccountId) {
      setError("من فضلك اختر طريقة الدفع الفعلية لعهدتي أنا.");
      return;
    }

    if (editMovementFinancialAccountId) {
      const selectedAccount = getCustodyFinancialAccountById(editMovementFinancialAccountId);
      if (!selectedAccount || selectedAccount.custodyId !== editMovementCustodyId) {
        setError("وسيلة الدفع المختارة لا تتبع العهدة المحددة.");
        return;
      }
    }

    const availableCustodyBalance =
      Number(targetCustody.balance) +
      (oldIsCashOut && currentMovement.custodyId === editMovementCustodyId
        ? Number(currentMovement.amount)
        : 0);

    /*
     * عند تعديل الحركة، منع السالب ينطبق على "عهدتي أنا" فقط.
     * عهد الموقع وأي عهدة أخرى يمكن أن يصبح رصيدها سالبًا.
     */
    if (
      nextIsCashOut &&
      editMovementCustodyId === CENTRAL_CUSTODY_ID &&
      availableCustodyBalance < amount
    ) {
      setError(
        `رصيد عهدتي أنا غير كافٍ. المتاح بعد عكس الحركة القديمة ${formatAmount(
          availableCustodyBalance,
        )} جنيه.`,
      );
      return;
    }

    if (editMovementFinancialAccountId) {
      const targetAccount = getCustodyFinancialAccountById(
        editMovementFinancialAccountId,
      );

      if (!targetAccount) {
        setError("وسيلة الدفع المختارة غير موجودة.");
        return;
      }

      const availableAccountBalance =
        Number(targetAccount.balance) +
        (oldIsCashOut &&
        currentMovement.financialAccountId === editMovementFinancialAccountId
          ? Number(currentMovement.amount)
          : 0);

      if (nextIsCashOut && availableAccountBalance < amount) {
        setError(
          `رصيد وسيلة الدفع غير كافٍ. المتاح بعد عكس الحركة القديمة ${formatAmount(
            availableAccountBalance,
          )} جنيه.`,
        );
        return;
      }
    }

    if (targetCustody.type === "project" && targetCustody.projectId !== editMovementProjectId) {
      setError("عهدة الموقع يجب أن تخصم الحركة من حساب العامل في نفس الموقع.");
      return;
    }

    const oldPayableBalance = getProjectPayableBalance(
      editMovementProjectId,
      currentMovement.projectId === editMovementProjectId ? currentMovement.id : undefined,
    );

    if (editMovementType === "salary" && amount > oldPayableBalance) {
      setError(
        `لا يمكن صرف راتب أكبر من مستحق العامل في هذا الموقع بعد استبعاد الحركة القديمة. المستحق المتاح ${formatAmount(oldPayableBalance)} جنيه.`,
      );
      return;
    }

    setIsSaving(true);

    try {
      const transactions = getCustodyTransactions();
      const oldTransaction = transactions.find(
        (transaction) =>
          transaction.workerFinancialMovementId === currentMovement.id,
      );

      if (oldTransaction && oldIsCashOut) {
        reverseCustodyBalance(
          oldTransaction.custodyId,
          oldTransaction.amount,
          "out",
        );

        if (oldTransaction.financialAccountId) {
          reverseCustodyFinancialAccountBalance(
            oldTransaction.financialAccountId,
            oldTransaction.amount,
            "out",
          );
        }

        deleteCustodyTransaction(oldTransaction.id);
      }

      const updatedMovement = updateWorkerFinancialMovement(
        currentMovement.id,
        {
          type: editMovementType,
          amount,
          date: editMovementDate,
          description: editMovementDescription.trim(),
          notes: editMovementNotes.trim() || undefined,
          custodyId: editMovementCustodyId,
          financialAccountId: editMovementFinancialAccountId || undefined,
          projectId: editMovementProjectId || undefined,
          allocation: editMovementProjectId
            ? editMovementAllocation
            : "general",
        },
      );

      if (nextIsCashOut) {
        updateCustodyBalance(
          editMovementCustodyId,
          amount,
          "out",
        );

        if (editMovementFinancialAccountId) {
          updateCustodyFinancialAccountBalance(
            editMovementFinancialAccountId,
            amount,
            "out",
          );
        }

        addCustodyTransaction({
          id: crypto.randomUUID(),
          custodyId: editMovementCustodyId,
          type: "out",
          amount,
          date: editMovementDate,
          description:
            `${getMovementLabel(
              editMovementType,
            )} للعامل ${worker.name}: ${editMovementDescription.trim()}`,
          source: "حساب العامل",
          workerFinancialMovementId: updatedMovement.id,
          projectId: editMovementProjectId || undefined,
          financialAccountId: editMovementFinancialAccountId || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setSuccess("تم تعديل الحركة المالية وتحديث أثرها على العهدة بنجاح.");
      closeMovementEdit();
      loadData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ أثناء تعديل الحركة المالية.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleMovementDelete = (movement: WorkerFinancialMovement) => {
    if (!worker) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف حركة ${getMovementLabel(
        movement.type,
      )} بقيمة ${formatAmount(movement.amount)} جنيه؟\nسيتم عكس أثرها على العهدة ووسيلة الدفع إن وجد.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const transaction = getCustodyTransactions().find(
        (item) => item.workerFinancialMovementId === movement.id,
      );

      if (transaction && isCashOutMovement(movement.type)) {
        reverseCustodyBalance(
          transaction.custodyId,
          transaction.amount,
          "out",
        );

        if (transaction.financialAccountId) {
          reverseCustodyFinancialAccountBalance(
            transaction.financialAccountId,
            transaction.amount,
            "out",
          );
        }

        deleteCustodyTransaction(transaction.id);
      }

      deleteWorkerFinancialMovement(movement.id);
      setSuccess("تم حذف الحركة وعكس أثرها المالي بنجاح.");
      loadData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ أثناء حذف الحركة المالية.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
   * إجمالي الحركات
   */
  const totalMovements =
    movements.length;

  /*
   * تحميل ملخصات الشهر لكل موقع.
   * كل موقع له حساب مستقل، لذلك لا نشارك أرقام الحضور أو المرتب بين المواقع.
   */
  useEffect(() => {
    if (!worker) return;

    const projectIds = Array.from(
      new Set(
        [
          ...assignments.map((assignment) => assignment.projectId),
          ...movements.map((movement) => movement.projectId),
        ].filter((value): value is string => Boolean(value)),
      ),
    );

    const saved = readWorkerMonthlyProjectPayrollSummaries().filter(
      (item) => item.workerId === worker.id && item.month === attendanceMonth,
    );

    const legacy = readWorkerMonthlyPayrollSummaries().find(
      (item) => item.workerId === worker.id && item.month === attendanceMonth,
    );

    const next: Record<string, WorkerMonthlyProjectPayrollSummary> = {};

    projectIds.forEach((projectId) => {
      const existing = saved.find((item) => item.projectId === projectId);
      next[projectId] =
        existing ??
        {
          workerId: worker.id,
          month: attendanceMonth,
          projectId,
          present: projectId === movementCurrentProjectId ? legacy?.present ?? 0 : 0,
          absent: projectId === movementCurrentProjectId ? legacy?.absent ?? 0 : 0,
          overtime: projectId === movementCurrentProjectId ? legacy?.overtime ?? 0 : 0,
          deduction: projectId === movementCurrentProjectId ? legacy?.deduction ?? 0 : 0,
          transport: projectId === movementCurrentProjectId ? legacy?.transport ?? 0 : 0,
          notes: projectId === movementCurrentProjectId ? legacy?.notes ?? "" : "",
          updatedAt: new Date().toISOString(),
        };

      if (!existing) saveWorkerMonthlyProjectPayrollSummary(next[projectId]);
    });

    setProjectPayrollInputs(next);

    const firstProject = projectIds[0] ?? movementCurrentProjectId;
    const first = next[firstProject];
    if (first) {
      setPayrollInputs({
        workerId: worker.id,
        month: attendanceMonth,
        present: first.present,
        absent: first.absent,
        overtime: first.overtime,
        deduction: first.deduction,
        transport: first.transport,
        notes: first.notes,
        updatedAt: first.updatedAt,
      });
    }
    setIsPayrollNotesEditing(false);
  }, [worker, assignments, movements, attendanceMonth, movementCurrentProjectId]);

  const updateProjectPayrollInput = (
    projectId: string,
    field: "present" | "absent" | "overtime" | "deduction" | "transport",
    value: string,
  ) => {
    if (!worker) return;

    const parsed = Number(value);
    const numericValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const current =
      projectPayrollInputs[projectId] ??
      {
        workerId: worker.id,
        month: attendanceMonth,
        projectId,
        present: 0,
        absent: 0,
        overtime: 0,
        deduction: 0,
        transport: 0,
        notes: "",
        updatedAt: new Date().toISOString(),
      };

    const next = {
      ...current,
      [field]: numericValue,
      updatedAt: new Date().toISOString(),
    };

    setProjectPayrollInputs((items) => ({ ...items, [projectId]: next }));
    saveWorkerMonthlyProjectPayrollSummary(next);
    setPayrollInputs({
      workerId: worker.id,
      month: attendanceMonth,
      present: next.present,
      absent: next.absent,
      overtime: next.overtime,
      deduction: next.deduction,
      transport: next.transport,
      notes: next.notes,
      updatedAt: next.updatedAt,
    });
  };

  const updatePayrollInput = (
    field: "present" | "absent" | "overtime" | "deduction" | "transport",
    value: string,
  ) => {
    if (movementCurrentProjectId) {
      updateProjectPayrollInput(movementCurrentProjectId, field, value);
    }
  };

  const updateProjectPayrollNotes = (projectId: string, value: string) => {
    const current = projectPayrollInputs[projectId];
    if (!current) return;

    const next = { ...current, notes: value, updatedAt: new Date().toISOString() };
    setProjectPayrollInputs((items) => ({ ...items, [projectId]: next }));
  };

  const saveProjectPayrollNotes = (projectId: string) => {
    const current = projectPayrollInputs[projectId];
    if (!current) return;

    const next = {
      ...current,
      notes: current.notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    saveWorkerMonthlyProjectPayrollSummary(next);
    setProjectPayrollInputs((items) => ({ ...items, [projectId]: next }));
    setIsPayrollNotesEditing(false);
    setSuccess("تم حفظ ملاحظات الموقع بنجاح.");
    setError("");
  };

  const updatePayrollNotes = (value: string) => {
    if (movementCurrentProjectId) {
      updateProjectPayrollNotes(movementCurrentProjectId, value);
    }
  };

  const savePayrollNotes = () => {
    if (movementCurrentProjectId) {
      saveProjectPayrollNotes(movementCurrentProjectId);
    }
  };

  function getProjectAssignment(projectId: string): WorkerSiteAssignment | undefined {
    const monthStart = `${attendanceMonth}-01`;
    const [year, month] = attendanceMonth.split("-").map(Number);
    const monthEnd = year && month
      ? `${attendanceMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`
      : `${attendanceMonth}-31`;

    return assignments
      .filter(
        (assignment) =>
          assignment.projectId === projectId &&
          assignment.startDate <= monthEnd &&
          (!assignment.endDate || assignment.endDate >= monthStart),
      )
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  }

  function getProjectMovementNet(projectId: string): number {
    return getWorkerFinancialBalanceByProject(workerId, projectId);
  }

  function getProjectPayableBalance(
    projectId: string,
    excludedMovementId?: string,
  ): number {
    const payroll = projectPayrollInputs[projectId];
    const assignment = getProjectAssignment(projectId);
    const payType = assignment?.payType ?? worker?.payType ?? "daily";
    const monthlySalary = Number(assignment?.monthlySalary ?? worker?.monthlySalary ?? 0);
    const division = Number(assignment?.monthlyDivision ?? worker?.monthlyDivision ?? 30);
    const dailyRate =
      payType === "monthly"
        ? division > 0
          ? monthlySalary / division
          : 0
        : Number(assignment?.dailyRate ?? worker?.dailyRate ?? 0);

    const baseSalary = Math.max(0, Number(payroll?.present || 0)) * dailyRate;
    const salaryDeduction = Math.max(0, Number(payroll?.absent || 0)) * dailyRate;
    const netSalary = Math.max(
      0,
      baseSalary -
        salaryDeduction +
        Number(payroll?.overtime || 0) +
        Number(payroll?.transport || 0) -
        Number(payroll?.deduction || 0),
    );

    const movementNet = movements
      .filter(
        (movement) =>
          movement.projectId === projectId &&
          movement.id !== excludedMovementId,
      )
      .reduce(
        (total, movement) =>
          total +
          (movement.effect === "increase"
            ? Number(movement.amount)
            : -Number(movement.amount)),
        0,
      );

    return Math.max(netSalary + movementNet, 0);
  }

  const projectPayrollSummaries = useMemo(() => {
    return Object.values(projectPayrollInputs).map((payroll) => {
      const assignment = getProjectAssignment(payroll.projectId);
      const payType = assignment?.payType ?? worker?.payType ?? "daily";
      const monthlySalary = Number(assignment?.monthlySalary ?? worker?.monthlySalary ?? 0);
      const division = Number(assignment?.monthlyDivision ?? worker?.monthlyDivision ?? 30);
      const dailyRate =
        payType === "monthly"
          ? division > 0 ? monthlySalary / division : 0
          : Number(assignment?.dailyRate ?? worker?.dailyRate ?? 0);
      const baseSalary = Math.max(0, Number(payroll.present || 0)) * dailyRate;
      const salaryDeduction = Math.max(0, Number(payroll.absent || 0)) * dailyRate;
      const netSalary = Math.max(
        0,
        baseSalary -
          salaryDeduction +
          Number(payroll.overtime || 0) +
          Number(payroll.transport || 0) -
          Number(payroll.deduction || 0),
      );
      const movementNet = getProjectMovementNet(payroll.projectId);
      const balance = netSalary + movementNet;

      return {
        ...payroll,
        projectId: payroll.projectId,
        project: projects.find((item) => item.id === payroll.projectId),
        baseSalary,
        salaryDeduction,
        netSalary,
        movementNet,
        balance,
        payable: Math.max(balance, 0),
        debt: Math.max(-balance, 0),
        advance: movements
          .filter((movement) => movement.projectId === payroll.projectId && movement.type === "advance")
          .reduce((sum, movement) => sum + Number(movement.amount), 0),
        salaryPaid: movements
          .filter((movement) => movement.projectId === payroll.projectId && movement.type === "salary")
          .reduce((sum, movement) => sum + Number(movement.amount), 0),
      };
    });
  }, [projectPayrollInputs, assignments, worker, projects, movements]);

  const unallocatedMovementNet = useMemo(
    () =>
      movements
        .filter((movement) => !movement.projectId)
        .reduce(
          (total, movement) =>
            total +
            (movement.effect === "increase"
              ? Number(movement.amount)
              : -Number(movement.amount)),
          0,
        ),
    [movements],
  );

  const totalProjectPayrollNet = useMemo(
    () => projectPayrollSummaries.reduce((sum, item) => sum + item.netSalary, 0),
    [projectPayrollSummaries],
  );

  const totalProjectMovementNet = useMemo(
    () => projectPayrollSummaries.reduce((sum, item) => sum + item.movementNet, 0),
    [projectPayrollSummaries],
  );

  const currentBalance = useMemo(() => {
    if (!worker) return 0;
    return Number(worker.carriedSalary ?? 0) +
      totalProjectPayrollNet +
      totalProjectMovementNet +
      unallocatedMovementNet;
  }, [worker, totalProjectPayrollNet, totalProjectMovementNet, unallocatedMovementNet]);

  const payableBalance = Math.max(currentBalance, 0);
  const workerDebt = Math.max(-currentBalance, 0);
  const canPaySalary = payableBalance > 0;

  /*
   * عند اختيار الراتب مع عدم وجود مستحق
   * نرجع تلقائيًا للسلفة.
   */
  useEffect(() => {
    if (
      movementType === "salary" &&
      !canPaySalary
    ) {
      setMovementType("advance");
    }
  }, [movementType, canPaySalary]);

  if (loading) {
    return (
      <AppShell>
        <div
          dir="rtl"
          className="flex min-h-[60vh] items-center justify-center"
        >
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

            <p className="mt-4 text-sm font-bold text-slate-500">
              جاري تحميل حساب العامل...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!worker) {
    return (
      <AppShell>
        <div
          dir="rtl"
          className="space-y-5"
        >
          <Link
            href="/workers"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى العمال
          </Link>

          <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-extrabold text-red-700">
              العامل غير موجود
            </h1>

            <p className="mt-2 text-sm text-red-600">
              لم يتم العثور على حساب العامل المطلوب.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="space-y-6 pb-10"
      >
        {/* رسائل النظام */}
        {(error || success) && (
          <div className="space-y-3">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {success}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href="/workers"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="العودة إلى العمال"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>

              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <UserRound className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-amber-600">
                      حساب العامل
                    </span>

                    {currentProject && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">
                        <MapPin className="h-3 w-3" />
                        {currentProject.name}
                      </span>
                    )}
                  </div>

                  <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    {worker.name}
                  </h1>

                  <p className="mt-2 text-sm text-slate-500">
                    الحساب المالي وحركة مستحقات ومديونية العامل.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setIsEditOpen(true);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Edit3 className="h-4 w-4" />
                تعديل البيانات
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMovementProjectId(movementCurrentProjectId);
                  setMovementAllocation(
                    movementCurrentProjectId
                      ? "project"
                      : "general",
                  );
                  setIsMovementFormOpen((current) => !current);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                تسجيل حركة مالية
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setIsTransferOpen(true);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                <MapPin className="h-4 w-4" />
                نقل العامل
              </button>
            </div>
          </div>
        </section>

        {/* حساب العامل حسب الموقع */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">حساب العامل حسب الموقع</h2>
              <p className="mt-1 text-sm text-slate-500">
                كل موقع له حضور ومستحقات وحركات مالية مستقلة، والإجمالي يجمع المواقع بدون خلط بينها.
              </p>
            </div>
            <input
              type="month"
              value={attendanceMonth}
              onChange={(event) => setAttendanceMonth(event.target.value)}
              className="h-11 w-fit rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
              aria-label="شهر الحساب"
            />
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[11px] font-bold text-slate-500">عدد المواقع</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{projectPayrollSummaries.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-[11px] font-bold text-blue-600">إجمالي المستحق</p>
              <p className="mt-2 text-2xl font-extrabold text-blue-600">{formatAmount(payableBalance)} <span className="text-xs">جنيه</span></p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <p className="text-[11px] font-bold text-red-600">إجمالي المديونية</p>
              <p className="mt-2 text-2xl font-extrabold text-red-600">{formatAmount(workerDebt)} <span className="text-xs">جنيه</span></p>
            </div>
            <div className={`rounded-2xl border p-4 ${currentBalance >= 0 ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/50"}`}>
              <p className="text-[11px] font-bold text-slate-500">الرصيد الإجمالي الحالي</p>
              <p className={`mt-2 text-2xl font-extrabold ${currentBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{currentBalance > 0 ? "+" : ""}{formatAmount(currentBalance)} <span className="text-xs text-slate-400">جنيه</span></p>
            </div>
          </div>

          {!projectPayrollSummaries.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
              لا توجد مواقع مسجلة في سجل تعيينات العامل.
            </div>
          ) : (
            <div className="space-y-4">
              {projectPayrollSummaries.map((site) => {
                const fields = [
                  { field: "present" as const, label: "حضور", count: true },
                  { field: "absent" as const, label: "غياب", count: true },
                  { field: "overtime" as const, label: "إضافي", count: false },
                  { field: "deduction" as const, label: "خصومات", count: false },
                  { field: "transport" as const, label: "بدل انتقال", count: false },
                ];

                return (
                  <div key={site.projectId} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900">{site.project?.name ?? "موقع غير موجود"}</h3>
                          {currentAssignment?.projectId === site.projectId && (
                            <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">الموقع الحالي</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {site.project?.id ?? site.projectId} — الحساب المالي لهذا الموقع مستقل عن باقي المواقع.
                        </p>
                      </div>
                      <div className={`rounded-xl px-4 py-2 text-right ${site.balance >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                        <p className="text-[10px] font-bold text-slate-500">مستحق هذا الموقع</p>
                        <p className={`mt-1 text-lg font-extrabold ${site.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{site.balance > 0 ? "+" : ""}{formatAmount(site.balance)} جنيه</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {fields.map((item) => (
                        <label key={item.field} className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="block text-[11px] font-bold text-slate-500">{item.label}</span>
                          <input
                            type="number"
                            min="0"
                            step={item.count ? "1" : "0.01"}
                            value={site[item.field]}
                            onChange={(event) => updateProjectPayrollInput(site.projectId, item.field, event.target.value)}
                            className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-lg font-extrabold text-slate-800 outline-none focus:border-slate-400"
                          />
                          {!item.count && <span className="mt-1 block text-center text-[10px] font-medium text-slate-400">جنيه</span>}
                        </label>
                      ))}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3"><p className="text-[10px] font-bold text-slate-500">الأساسي</p><p className="mt-1 text-lg font-extrabold text-blue-600">{formatAmount(site.baseSalary)} جنيه</p></div>
                      <div className="rounded-xl border border-red-100 bg-red-50/50 p-3"><p className="text-[10px] font-bold text-slate-500">خصم الغياب</p><p className="mt-1 text-lg font-extrabold text-red-600">{formatAmount(site.salaryDeduction)} جنيه</p></div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3"><p className="text-[10px] font-bold text-slate-500">السلف المصروفة</p><p className="mt-1 text-lg font-extrabold text-amber-700">{formatAmount(site.advance)} جنيه</p></div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"><p className="text-[10px] font-bold text-slate-500">الراتب المصروف</p><p className="mt-1 text-lg font-extrabold text-emerald-600">{formatAmount(site.salaryPaid)} جنيه</p></div>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-600">ملاحظات الموقع / الشهر</p>
                        <textarea
                          value={site.notes}
                          onChange={(event) => updateProjectPayrollNotes(site.projectId, event.target.value)}
                          rows={2}
                          placeholder="اكتب أي تفاصيل خاصة بهذا الموقع في هذا الشهر..."
                          className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => saveProjectPayrollNotes(site.projectId)}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-extrabold text-white hover:bg-slate-800"
                      >
                        <Save className="h-4 w-4" />
                        حفظ ملاحظات الموقع
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {unallocatedMovementNet !== 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
              توجد حركات مالية قديمة غير مرتبطة بموقع بقيمة صافية {formatAmount(unallocatedMovementNet)} جنيه، وتم إبقاؤها في الإجمالي حتى لا تضيع البيانات القديمة.
            </div>
          )}
        </section>

        {/* تسجيل حركة مالية - نافذة منبثقة */}
        {isMovementFormOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px] sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="worker-movement-modal-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsMovementFormOpen(false);
              }
            }}
          >
            <section
              id="worker-movement-form"
              className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <h2
                  id="worker-movement-modal-title"
                  className="text-base font-extrabold text-slate-900"
                >
                  تسجيل حركة مالية
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  سجل الراتب أو السلفة فقط. الإضافي والخصم وبدل الانتقال يتم إدخالهم مباشرة في ملخص الشهر.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMovementFormOpen(false)}
                className="mr-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="إغلاق نافذة تسجيل الحركة"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* نوع الحركة */}
              <div>
                <label
                  htmlFor="movement-type"
                  className="mb-1.5 block text-xs font-bold text-slate-600"
                >
                  نوع الحركة
                </label>

                <select
                  id="movement-type"
                  value={movementType}
                  onChange={(event) =>
                    setMovementType(
                      event.target.value as WorkerFinancialMovementType,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  {canPaySalary && (
                    <option value="salary">
                      راتب
                    </option>
                  )}

                  <option value="advance">
                    سلفة
                  </option>

                </select>

                {movementType ===
                  "salary" && (
                  <p className="mt-1.5 text-[11px] font-semibold text-blue-600">
                    أقصى مبلغ يمكن صرفه:{" "}
                    {formatAmount(
                      payableBalance,
                    )}{" "}
                    جنيه
                  </p>
                )}

                {!canPaySalary && (
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                    لا يوجد مستحق حاليًا لصرف راتب.
                  </p>
                )}
              </div>

              {/* التاريخ */}
              <div>
                <label
                  htmlFor="movement-date"
                  className="mb-1.5 block text-xs font-bold text-slate-600"
                >
                  التاريخ
                </label>

                <input
                  id="movement-date"
                  type="date"
                  value={movementDate}
                  onChange={(event) =>
                    setMovementDate(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* المبلغ */}
              <div>
                <label
                  htmlFor="movement-amount"
                  className="mb-1.5 block text-xs font-bold text-slate-600"
                >
                  المبلغ
                </label>

                <input
                  id="movement-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={
                    movementType ===
                    "salary"
                      ? payableBalance
                      : undefined
                  }
                  value={movementAmount}
                  onChange={(event) =>
                    setMovementAmount(
                      event.target.value,
                    )
                  }
                  placeholder="0.00"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* البيان */}
              <div className="md:col-span-2 xl:col-span-2">
                <label
                  htmlFor="movement-description"
                  className="mb-1.5 block text-xs font-bold text-slate-600"
                >
                  البيان
                </label>

                <input
                  id="movement-description"
                  type="text"
                  value={movementDescription}
                  onChange={(event) =>
                    setMovementDescription(
                      event.target.value,
                    )
                  }
                  placeholder={
                    movementType ===
                    "salary"
                      ? "مثال: راتب شهر سبتمبر"
                      : movementType ===
                          "advance"
                        ? "مثال: سلفة للعامل"
                        : "اكتب بيان الحركة..."
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* العهدة */}
              <div>
                <label
                  htmlFor="movement-custody"
                  className="mb-1.5 block text-xs font-bold text-slate-600"
                >
                  العهدة
                </label>

                <select
                  id="movement-custody"
                  value={movementCustodyId}
                  onChange={(event) => {
                    const nextCustodyId = event.target.value;
                    const nextCustody = custodies.find((item) => item.id === nextCustodyId);
                    setMovementCustodyId(nextCustodyId);
                    if (nextCustody?.type === "project" && nextCustody.projectId) {
                      setMovementProjectId(nextCustody.projectId);
                      setMovementAllocation("project");
                    }
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">
                    اختر العهدة
                  </option>

                  {custodies.map(
                    (custody) => (
                      <option
                        key={custody.id}
                        value={custody.id}
                      >
                        {custody.name} — رصيد {formatAmount(
                          Number(custody.balance ?? 0),
                        )} جنيه
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* طريقة الدفع الفعلية */}
              {movementCustodyId === CENTRAL_CUSTODY_ID && (
                <div>
                  <label
                    htmlFor="movement-financial-account"
                    className="mb-1.5 block text-xs font-bold text-slate-600"
                  >
                    طريقة الدفع الفعلية
                  </label>

                  <select
                    id="movement-financial-account"
                    value={movementFinancialAccountId}
                    onChange={(event) =>
                      setMovementFinancialAccountId(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      اختر طريقة الدفع
                    </option>

                    {financialAccounts.map((account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name} — رصيد {formatAmount(
                          Number(account.balance ?? 0),
                        )} جنيه
                      </option>
                    ))}
                  </select>

                  {movementFinancialAccountId && (
                    <p className="mt-1.5 text-[11px] font-bold text-slate-500">
                      الرصيد المتاح: {formatAmount(
                        Number(
                          financialAccounts.find(
                            (account) =>
                              account.id === movementFinancialAccountId,
                          )?.balance ?? 0,
                        ),
                      )} جنيه
                    </p>
                  )}
                </div>
              )}

              {/* المشروع */}
              <div>
                <label
                  htmlFor="movement-project"
                  className="mb-1.5 block text-xs font-bold text-slate-600"
                >
                  المشروع / الموقع
                </label>

                <select
                  id="movement-project"
                  value={movementProjectId}
                  onChange={(event) => {
                    const nextProjectId = event.target.value;
                    setMovementProjectId(nextProjectId);
                    setMovementAllocation(
                      nextProjectId ? "project" : "general",
                    );
                  }}
                  disabled={custodies.find((item) => item.id === movementCustodyId)?.type === "project"}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    اختر الموقع / المشروع
                  </option>

                  {projects.map(
                    (project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* التصنيف */}
              <div>
                <label
                  htmlFor="movement-allocation"
                  className="mb-1.5 block text-xs font-bold text-slate-600"
                >
                  تصنيف الحركة
                </label>

                <select
                  id="movement-allocation"
                  value={movementAllocation}
                  onChange={(event) =>
                    setMovementAllocation(
                      event.target.value as
                        | "general"
                        | "project",
                    )
                  }
                  disabled

                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="general">
                    عام
                  </option>

                  <option value="project">
                    على المشروع
                  </option>
                </select>
              </div>

              {/* ملاحظات */}
              <div className="md:col-span-2 xl:col-span-3">
                <label
                  htmlFor="movement-notes"
                  className="mb-1.5 block text-xs font-bold text-slate-600"
                >
                  ملاحظات
                </label>

                <textarea
                  id="movement-notes"
                  value={movementNotes}
                  onChange={(event) =>
                    setMovementNotes(
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="ملاحظات إضافية اختيارية..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* تنبيه الراتب */}
            {movementType ===
              "salary" && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-xs font-bold leading-6 text-blue-700">
                  الراتب يعتبر صرفًا من مستحق العامل،
                  لذلك سيتم تخفيض مستحقاته بقيمة الراتب،
                  ولا يمكن صرف مبلغ أكبر من{" "}
                  {formatAmount(
                    payableBalance,
                  )}{" "}
                  جنيه.
                </p>
              </div>
            )}

            {movementType ===
              "advance" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold leading-6 text-amber-700">
                  السلفة تقلل مستحق العامل وتزيد
                  المبلغ المستحق على العامل للشركة.
                </p>
              </div>
            )}




            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={
                  handleMovementSubmit
                }
                disabled={isSaving}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Plus className="h-4 w-4" />

                {isSaving
                  ? "جاري الحفظ..."
                  : "تسجيل الحركة"}
              </button>
            </div>
          </div>
            </section>
          </div>
        )}

        {/* الحركات المالية */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <History className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  سجل الحركات المالية
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  جميع الحركات التي أثرت على حساب العامل.
                </p>
              </div>
            </div>
          </div>

          {movements.length === 0 ? (
            <div className="flex min-h-52 items-center justify-center px-5 py-10">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-700">
                  لا توجد حركات مالية حتى الآن
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  عند تسجيل أول حركة ستظهر هنا.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      التاريخ
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      النوع
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      البيان
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      المشروع
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      العهدة
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      التأثير
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                      المبلغ
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-500">
                      إجراءات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {movements.map(
                    (movement) => {
                      const project =
                        movement.projectId
                          ? projects.find(
                              (item) =>
                                item.id ===
                                movement.projectId,
                            )
                          : undefined;

                      const custody =
                        movement.custodyId
                          ? custodies.find(
                              (item) =>
                                item.id ===
                                movement.custodyId,
                            )
                          : undefined;

                      return (
                        <tr
                          key={movement.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {formatDate(
                              movement.date,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${getMovementClasses(
                                movement.effect,
                              )}`}
                            >
                              {getMovementLabel(
                                movement.type,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[320px] text-sm font-bold leading-6 text-slate-800">
                              {
                                movement.description
                              }
                            </p>

                            {movement.notes && (
                              <p className="mt-1 max-w-[320px] text-xs leading-5 text-slate-400">
                                {
                                  movement.notes
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {project?.name ??
                              "عام"}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {custody?.name ??
                              "غير محدد"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`text-xs font-bold ${
                                movement.effect ===
                                "increase"
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {movement.effect ===
                              "increase"
                                ? "يزيد المستحق"
                                : "يقلل المستحق"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-left">
                            <span
                              className={`text-sm font-extrabold ${getMovementAmountClasses(
                                movement.effect,
                              )}`}
                            >
                              {movement.effect ===
                              "increase"
                                ? "+"
                                : "-"}
                              {formatAmount(
                                Math.abs(
                                  movement.amount,
                                ),
                              )}{" "}
                              جنيه
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openMovementEdit(movement)}
                                disabled={isSaving}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                تعديل
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMovementDelete(movement)}
                                disabled={isSaving}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* سجل المواقع */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MapPin className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  سجل مواقع العامل
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  تاريخ المواقع والفترات التي عمل بها العامل.
                </p>
              </div>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-bold text-slate-500">
                لا يوجد سجل مواقع حتى الآن.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      المشروع
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      بداية الفترة
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      نهاية الفترة
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      الراتب
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      الحالة
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {assignments
                    .slice()
                    .reverse()
                    .map(
                      (
                        assignment,
                      ) => {
                        const project =
                          projects.find(
                            (item) =>
                              item.id ===
                              assignment.projectId,
                          );

                        const isCurrent =
                          !assignment.endDate;

                        return (
                          <tr
                            key={
                              assignment.id
                            }
                            className="hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-extrabold text-slate-800">
                                {project?.name ??
                                  "مشروع غير معروف"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                              {formatDate(
                                assignment.startDate,
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                              {assignment.endDate
                                ? formatDate(
                                    assignment.endDate,
                                  )
                                : "حتى الآن"}
                            </td>

                            <td className="px-5 py-4 text-sm font-extrabold text-slate-700">
                              {assignment.payType ===
                              "daily"
                                ? `يومية ${formatAmount(
                                    Number(
                                      assignment.dailyRate ??
                                        0,
                                    ),
                                  )}`
                                : `شهرية ${formatAmount(
                                    Number(
                                      assignment.monthlySalary ??
                                        0,
                                    ),
                                  )}`}
                              {" جنيه"}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                                  isCurrent
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {isCurrent
                                  ? "حالي"
                                  : "منتهية"}
                              </span>
                            </td>
                          </tr>
                        );
                      },
                    )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* تعديل بيانات العامل */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-extrabold text-slate-900">
                  تعديل بيانات العامل
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  تعديل البيانات الأساسية فقط.
                </p>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    اسم العامل
                  </label>

                  <input
                    type="text"
                    value={editName}
                    onChange={(event) =>
                      setEditName(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setIsEditOpen(false)
                    }
                    className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleEditWorker
                    }
                    disabled={isSaving}
                    className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSaving
                      ? "جاري الحفظ..."
                      : "حفظ التعديلات"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تعديل حركة مالية */}
        {isMovementEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-extrabold text-slate-900">
                  تعديل الحركة المالية
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  تعديل الحركة سيعكس أثرها القديم على العهدة ووسيلة الدفع ثم يطبق الأثر الجديد.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">نوع الحركة</label>
                  <select
                    value={editMovementType}
                    onChange={(event) => setEditMovementType(event.target.value as WorkerFinancialMovementType)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                  >
                    <option value="salary">راتب</option>
                    <option value="advance">سلفة</option>
                    <option value="payment">دفعة</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">التاريخ</label>
                  <input
                    type="date"
                    value={editMovementDate}
                    onChange={(event) => setEditMovementDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">المبلغ</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editMovementAmount}
                    onChange={(event) => setEditMovementAmount(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">العهدة</label>
                  <select
                    value={editMovementCustodyId}
                    onChange={(event) => {
                      const nextCustodyId = event.target.value;
                      const nextCustody = custodies.find((item) => item.id === nextCustodyId);
                      setEditMovementCustodyId(nextCustodyId);
                      setEditMovementFinancialAccountId("");
                      if (nextCustody?.type === "project" && nextCustody.projectId) {
                        setEditMovementProjectId(nextCustody.projectId);
                        setEditMovementAllocation("project");
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
                  >
                    <option value="">اختر العهدة</option>
                    {custodies.map((custody) => (
                      <option key={custody.id} value={custody.id}>
                        {custody.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">وسيلة الدفع</label>
                  <select
                    value={editMovementFinancialAccountId}
                    onChange={(event) => setEditMovementFinancialAccountId(event.target.value)}
                    disabled={!editMovementCustodyId}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold disabled:bg-slate-50"
                  >
                    <option value="">بدون وسيلة دفع محددة</option>
                    {getCustodyFinancialAccounts(editMovementCustodyId).map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">المشروع / الموقع</label>
                  <select
                    value={editMovementProjectId}
                    onChange={(event) => {
                      setEditMovementProjectId(event.target.value);
                      setEditMovementAllocation(event.target.value ? "project" : "general");
                    }}
                    disabled={custodies.find((item) => item.id === editMovementCustodyId)?.type === "project"}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold disabled:bg-slate-50"
                  >
                    <option value="">اختر الموقع / المشروع</option>
                    {workedProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">تصنيف الحركة</label>
                  <select
                    value={editMovementAllocation}
                    onChange={(event) => setEditMovementAllocation(event.target.value as "general" | "project")}
                    disabled
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold disabled:bg-slate-50"
                  >
                    <option value="general">عام</option>
                    <option value="project">على المشروع</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">البيان</label>
                  <input
                    type="text"
                    value={editMovementDescription}
                    onChange={(event) => setEditMovementDescription(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">ملاحظات</label>
                  <textarea
                    value={editMovementNotes}
                    onChange={(event) => setEditMovementNotes(event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
                <button
                  type="button"
                  onClick={closeMovementEdit}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleMovementUpdate}
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ التعديل"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* نقل العامل */}
        {isTransferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-extrabold text-slate-900">
                  نقل العامل
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  النقل ينشئ فترة عمل جديدة، ولا يغير راتب الفترة السابقة.
                </p>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    المشروع الجديد
                  </label>

                  <select
                    value={
                      transferProjectId
                    }
                    onChange={(event) =>
                      setTransferProjectId(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-400"
                  >
                    <option value="">
                      اختر المشروع
                    </option>

                    {projects
                      .filter(
                        (project) =>
                          project.id !==
                          currentProject?.id,
                      )
                      .map(
                        (project) => (
                          <option
                            key={
                              project.id
                            }
                            value={
                              project.id
                            }
                          >
                            {
                              project.name
                            }
                          </option>
                        ),
                      )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    تاريخ النقل
                  </label>

                  <input
                    type="date"
                    value={transferDate}
                    onChange={(event) =>
                      setTransferDate(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    الراتب الجديد
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      transferSalary
                    }
                    onChange={(event) =>
                      setTransferSalary(
                        event.target.value,
                      )
                    }
                    placeholder="اتركه فارغًا إذا لم يتغير"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400"
                  />
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-bold leading-6 text-amber-700">
                    الراتب الذي تم تسجيله للفترة السابقة سيظل كما هو، والراتب الجديد سيطبق فقط على الفترة الجديدة.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setIsTransferOpen(false)
                    }
                    className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleTransferWorker
                    }
                    disabled={isSaving}
                    className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSaving
                      ? "جاري النقل..."
                      : "تأكيد النقل"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}