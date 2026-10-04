"use client";

import DateInput from "@/lib/date-input";

import { formatDisplayDate } from "@/lib/formatters";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canCurrentUser } from "@/lib/permission-check";
import {
  getCustodies,
  getCustodyById,
} from "@/lib/data/custodies";
import {
  getCustodyTransactions,
} from "@/lib/data/custody-transactions";
import {
  getCustodyFinancialAccountById,
  getCustodyFinancialAccounts,
} from "@/lib/data/custody-financial-accounts";
import {
  addExpenseCategory,
  getExpenseCategories,
} from "@/lib/data/expense-categories";
import { getExpenses } from "@/lib/data/expenses";
import { getProjects } from "@/lib/data/projects";
import {
  createWorkerAdvanceWithPayment,
  deleteWorkerAdvanceWithPayment,
  updateWorkerAdvanceWithPayment,
  createExpenseWithPayment,
  updateExpenseWithPayment,
  deleteExpenseWithPayment,
} from "@/lib/data/financial-transactions";
import { getWorkers } from "@/lib/data/workers";
import { getWorkerFinancialMovementsByType } from "@/lib/data/worker-financial-movements";
import { getContractorById, getContractors } from "@/lib/data/contractors";
import { getContractorSiteAssignments, isContractorAssignedToSiteOnDate } from "@/lib/data/contractor-site-assignments";
import { getProjectSites } from "@/lib/data/project-sites";
import type { Custody } from "@/types/custody";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";
import type { CustodyTransaction } from "@/types/custody-transaction";
import type { Expense, ProjectExpenseMovementType } from "@/types/expense";
import type { Project } from "@/types/project";
import type { Worker } from "@/types/worker";

type MovementFilter = "all" | ProjectExpenseMovementType;

interface ExpenseDraft {
  date: string;
  description: string;
  movementType: ProjectExpenseMovementType;
  category: string;
  projectId?: string;
  workerId?: string;
  contractorId?: string;
  siteId?: string;
  custodyId: string;
  amount: number;
  financialAccountId?: string;
}

const CONTRACTOR_CATEGORY = "سلف المقاولين";

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateLabel(value: string) {
  return formatDisplayDate(value);
}

function movementLabel(type?: ProjectExpenseMovementType) {
  if (type === "worker_advance") return "سلف العمال";
  if (type === "contractor_advance") return "سلف المقاولين";
  return "مصروف";
}

function movementClasses(type?: ProjectExpenseMovementType) {
  if (type === "worker_advance") return "bg-amber-50 text-amber-700";
  if (type === "contractor_advance") return "bg-violet-50 text-violet-700";
  return "bg-blue-50 text-blue-700";
}

function normalizedMovementType(
  type?: ProjectExpenseMovementType,
): ProjectExpenseMovementType {
  if (type === "worker_advance") return "worker_advance";
  return type === "contractor_advance" ? "contractor_advance" : "expense";
}

function getExpenseTransaction(
  expense: Expense,
): CustodyTransaction | undefined {
  const transactions = getCustodyTransactions();

  if (expense.custodyTransactionId) {
    const linked = transactions.find(
      (transaction) =>
        transaction.id === expense.custodyTransactionId,
    );

    if (linked) {
      return linked;
    }
  }

  return transactions
    .filter(
      (transaction) =>
        transaction.type === "out" &&
        transaction.custodyId === expense.custodyId &&
        transaction.projectId === expense.projectId &&
        transaction.date === expense.date &&
        transaction.amount === expense.amount &&
        transaction.description === expense.description &&
        (transaction.siteId ?? "") === (expense.siteId ?? ""),
    )
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0];
}

function normalizeDraft(
  draft: ExpenseDraft,
  ): ExpenseDraft {
    return {
        ...draft,
        description: draft.description.trim(),
        category:
          draft.movementType === "contractor_advance"
            ? CONTRACTOR_CATEGORY
            : draft.movementType === "worker_advance"
              ? "سلف العمال"
              : draft.category.trim(),
        amount: Number(draft.amount),
        financialAccountId: draft.financialAccountId || undefined,
        projectId: draft.projectId || undefined,
        workerId: draft.workerId || undefined,
        contractorId: draft.contractorId || undefined,
    };
}

function validateDraft(
  draft: ExpenseDraft,
  oldExpense?: Expense,
) {
  if (!draft.date) {
    throw new Error("تاريخ المصروف مطلوب.");
  }

  if (!draft.description.trim()) {
    throw new Error("البيان مطلوب.");
  }

  if (!draft.category.trim()) {
    throw new Error("التصنيف مطلوب.");
  }

  if (draft.movementType === "worker_advance" && !draft.workerId) {
    throw new Error("اختر العامل صاحب السلفة.");
  }

  if (draft.movementType === "worker_advance" && draft.category !== "سلف العمال") {
    throw new Error("تصنيف سلفة العامل يجب أن يكون سلف العمال.");
  }

  if (draft.movementType === "contractor_advance" && !draft.contractorId) {
    throw new Error("اختر المقاول صاحب السلفة.");
  }

  if (draft.movementType === "contractor_advance" && draft.contractorId && !getContractorById(draft.contractorId)) {
    throw new Error("المقاول المحدد غير موجود.");
  }

  if (draft.movementType === "contractor_advance") {
    if (!draft.siteId) {
      throw new Error("اختر الموقع المرتبط بسلفة المقاول.");
    }
    const siteExists = getProjectSites().some((site) => site.id === draft.siteId);
    if (!siteExists) {
      throw new Error("الموقع المحدد غير موجود.");
    }
    const assignmentExists = getContractorSiteAssignments(draft.contractorId!).some((assignment) => assignment.siteId === draft.siteId);
    if (!assignmentExists) {
      throw new Error("المقاول غير مرتبط بالموقع المحدد.");
    }
    if (!isContractorAssignedToSiteOnDate(draft.contractorId!, draft.siteId, draft.date)) {
      throw new Error("تاريخ السلفة خارج فترة ارتباط المقاول بالموقع المحدد.");
    }
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

  if (custody.id === "central") {
    if (!draft.financialAccountId) {
      throw new Error(
        "اختر وسيلة الدفع من العهدة المركزية.",
      );
    }

    const account =
      getCustodyFinancialAccountById(
        draft.financialAccountId,
      );

    if (
      !account ||
      account.custodyId !== "central"
    ) {
      throw new Error("وسيلة الدفع غير صحيحة.");
    }

    let availableCustody = custody.balance;
    let availableAccount = account.balance;

    if (oldExpense) {
      const oldTransaction =
        getExpenseTransaction(oldExpense);

      if (
        oldTransaction &&
        oldTransaction.custodyId === "central"
      ) {
        availableCustody += oldTransaction.amount;

        if (
          oldTransaction.financialAccountId ===
          draft.financialAccountId
        ) {
          availableAccount +=
            oldTransaction.amount;
        }
      }
    }

    if (availableCustody < draft.amount) {
      throw new Error(
        "رصيد العهدة المركزية غير كافٍ.",
      );
    }

    if (availableAccount < draft.amount) {
      throw new Error(
        "رصيد وسيلة الدفع غير كافٍ.",
      );
    }
  } else if (draft.financialAccountId) {
    throw new Error(
      "وسيلة الدفع متاحة مع العهدة المركزية فقط.",
    );
  }
}

function defaultDraft(
  defaultCustodyId: string,
  projectId?: string,
): ExpenseDraft {
  return {
    date: localDate(),
    description: "",
    movementType: "expense",
    category: "",
    projectId,
    workerId: undefined,
    contractorId: undefined,
    siteId: undefined,
    custodyId: defaultCustodyId,
    amount: 0,
    financialAccountId: undefined,
  };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [workerAdvances, setWorkerAdvances] = useState(0);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [contractors, setContractors] = useState<import("@/types/contractor").Contractor[]>([]);
  const [accounts, setAccounts] = useState<
    CustodyFinancialAccount[]
  >([]);

  const [categories, setCategories] = useState<string[]>(
    [],
  );

  const [editingId, setEditingId] = useState<
    string | null
  >(null);
  const [draft, setDraft] =
    useState<ExpenseDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const [error, setError] = useState("");

  const [movementFilter, setMovementFilter] =
    useState<MovementFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [descriptionFilter, setDescriptionFilter] =
    useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("");
  const [projectFilter, setProjectFilter] =
    useState("");
  const [custodyFilter, setCustodyFilter] =
    useState("");
  const [amountMin, setAmountMin] = useState("");

  const load = () => {
    const workerAdvanceMovements = getWorkerFinancialMovementsByType("advance");
    setWorkerAdvances(
      workerAdvanceMovements.reduce(
        (total, movement) => total + movement.amount,
        0,
      ),
    );

    const custodyTransactions = getCustodyTransactions();

    const linkedWorkerAdvances = workerAdvanceMovements.reduce<Expense[]>((rows, movement) => {
      const transaction = custodyTransactions.find(
        (item) => item.workerFinancialMovementId === movement.id,
      );
      if (!transaction) return rows;
      rows.push({
        id: `worker-advance:${movement.id}`,
        date: movement.date,
        amount: movement.amount,
        category: "سلف العمال",
        description: movement.description,
        custodyId: transaction.custodyId,
        projectId: movement.projectId,
        financialAccountId: transaction.financialAccountId,
        movementType: "worker_advance",
        custodyTransactionId: transaction.id,
        workerId: movement.workerId,
        createdAt: movement.createdAt,
        updatedAt: movement.updatedAt,
      });
      return rows;
    }, []);
    const storedExpenses = getExpenses().filter(
      (expense) => expense.movementType !== "worker_advance",
    );
    setExpenses(
      [...storedExpenses, ...linkedWorkerAdvances].sort((a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      ),
    );
    setCustodies(getCustodies());
    setProjects(getProjects());
    setWorkers(getWorkers());
    setContractors(getContractors());
    setCategories([
      ...new Set([
        ...getExpenseCategories(),
        CONTRACTOR_CATEGORY,
      ]),
    ]);
  };

  useEffect(() => {
    load();
  }, []);

  const custodyMap = useMemo(
    () =>
      new Map(
        custodies.map((custody) => [
          custody.id,
          custody.name,
        ]),
      ),
    [custodies],
  );

  const projectMap = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.id,
          project.name,
        ]),
      ),
    [projects],
  );

  const allCategories = useMemo(() => {
    const values = new Set<string>(categories);

    expenses.forEach((expense) => {
      if (expense.category.trim()) {
        values.add(expense.category.trim());
      }
    });

    return [...values]
      .filter(Boolean)
      .sort((a, b) =>
        a.localeCompare(b, "ar"),
      );
  }, [categories, expenses]);

  const applyFilters = (
    source: Expense[],
    options?: {
      ignoreMovement?: boolean;
      ignoreCategory?: boolean;
      ignoreProject?: boolean;
      ignoreCustody?: boolean;
    },
  ) => {
    const normalizedSearch =
      descriptionFilter.trim().toLocaleLowerCase("ar");

    const minAmount =
      amountMin === ""
        ? undefined
        : Number(amountMin);

    return source.filter((expense) => {
      const type = normalizedMovementType(
        expense.movementType,
      );

      if (
        !options?.ignoreMovement &&
        movementFilter !== "all" &&
        type !== movementFilter
      ) {
        return false;
      }

      if (
        fromDate &&
        expense.date < fromDate
      ) {
        return false;
      }

      if (
        toDate &&
        expense.date > toDate
      ) {
        return false;
      }

      if (
        normalizedSearch &&
        !expense.description
          .toLocaleLowerCase("ar")
          .includes(normalizedSearch) &&
        !expense.category
          .toLocaleLowerCase("ar")
          .includes(normalizedSearch)
      ) {
        return false;
      }

      if (
        !options?.ignoreCategory &&
        categoryFilter &&
        expense.category !== categoryFilter
      ) {
        return false;
      }

      if (
        !options?.ignoreProject &&
        projectFilter &&
        (expense.projectId ?? "") !==
          projectFilter
      ) {
        return false;
      }

      if (
        !options?.ignoreCustody &&
        custodyFilter &&
        expense.custodyId !== custodyFilter
      ) {
        return false;
      }

      if (
        minAmount !== undefined &&
        (!Number.isFinite(minAmount) ||
          expense.amount < minAmount)
      ) {
        return false;
      }

      return true;
    });
  };

  const filteredExpenses = useMemo(
    () => applyFilters(expenses),
    [
      expenses,
      movementFilter,
      fromDate,
      toDate,
      descriptionFilter,
      categoryFilter,
      projectFilter,
      custodyFilter,
      amountMin,
    ],
  );

  const categoryOptions = useMemo(
    () =>
      [
        ...new Set(
          applyFilters(expenses, {
            ignoreCategory: true,
          }).map((expense) => expense.category),
        ),
      ]
        .filter(Boolean)
        .sort((a, b) =>
          a.localeCompare(b, "ar"),
        ),
    [
      expenses,
      movementFilter,
      fromDate,
      toDate,
      descriptionFilter,
      projectFilter,
      custodyFilter,
      amountMin,
    ],
  );

  const projectOptions = useMemo(
    () =>
      [
        ...new Set(
          applyFilters(expenses, {
            ignoreProject: true,
          })
            .map(
              (expense) =>
                expense.projectId,
            )
            .filter(Boolean),
        ),
      ]
        .map((id) => ({
          id: id as string,
          name:
            projectMap.get(id as string) ??
            "مشروع غير معروف",
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, "ar"),
        ),
    [
      expenses,
      projectMap,
      movementFilter,
      fromDate,
      toDate,
      descriptionFilter,
      categoryFilter,
      custodyFilter,
      amountMin,
    ],
  );

  const custodyOptions = useMemo(
    () =>
      [
        ...new Set(
          applyFilters(expenses, {
            ignoreCustody: true,
          }).map(
            (expense) => expense.custodyId,
          ),
        ),
      ]
        .map((id) => ({
          id,
          name:
            custodyMap.get(id) ??
            "عهدة غير معروفة",
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, "ar"),
        ),
    [
      expenses,
      custodyMap,
      movementFilter,
      fromDate,
      toDate,
      descriptionFilter,
      categoryFilter,
      projectFilter,
      amountMin,
    ],
  );

  const totalAmount = useMemo(
    () =>
      filteredExpenses.reduce(
        (total, expense) =>
          total + expense.amount,
        0,
      ),
    [filteredExpenses],
  );

  const contractorTotal = useMemo(
    () =>
      filteredExpenses
        .filter(
          (expense) =>
            normalizedMovementType(
              expense.movementType,
            ) === "contractor_advance",
        )
        .reduce(
          (total, expense) =>
            total + expense.amount,
          0,
        ),
    [filteredExpenses],
  );

  const ordinaryTotal =
    totalAmount - contractorTotal;

  const resetFilters = () => {
    setMovementFilter("all");
    setFromDate("");
    setToDate("");
    setDescriptionFilter("");
    setCategoryFilter("");
    setProjectFilter("");
    setCustodyFilter("");
    setAmountMin("");
  };

  const beginNew = () => {
    setError("");
    setEditingId("new");
    setDraft(defaultDraft(""));
    setAccounts([]);
  };

  const beginEdit = (expense: Expense) => {
    setError("");
    setEditingId(expense.id);

    const type = normalizedMovementType(
      expense.movementType,
    );

    setDraft({
      date: expense.date,
      description: expense.description,
      movementType: type,
      category:
        type === "contractor_advance"
          ? CONTRACTOR_CATEGORY
          : expense.category,
      projectId: expense.projectId,
      workerId: expense.workerId,
      contractorId: expense.contractorId,
      siteId: expense.siteId,
      custodyId: expense.custodyId,
      amount: expense.amount,
      financialAccountId:
        expense.financialAccountId,
    });

    if (expense.custodyId === "central") {
      setAccounts(
        getCustodyFinancialAccounts(
          "central",
        ),
      );
    } else {
      setAccounts([]);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setAccounts([]);
    setError("");
  };

  const updateDraft = <
    K extends keyof ExpenseDraft,
  >(
    key: K,
    value: ExpenseDraft[K],
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  const changeMovementType = (
    movementType: ProjectExpenseMovementType,
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      if (movementType === "contractor_advance") {
        return {
          ...current,
          movementType,
          workerId: undefined,
          contractorId: current.contractorId,
          siteId: current.siteId,
          category: CONTRACTOR_CATEGORY,
        };
      }

      if (movementType === "worker_advance") {
        return {
          ...current,
          movementType,
          workerId: current.workerId,
          contractorId: undefined,
          siteId: undefined,
          category: "سلف العمال",
        };
      }

      return {
        ...current,
        movementType: "expense",
        workerId: undefined,
        contractorId: undefined,
        siteId: undefined,
        category:
          current.category === CONTRACTOR_CATEGORY || current.category === "سلف العمال"
            ? ""
            : current.category,
      };
    });
  };

  const changeProject = (
    projectId: string,
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            projectId:
              projectId || undefined,
          }
        : current,
    );
  };

  const changeCustody = (
    custodyId: string,
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            custodyId,
            financialAccountId:
              undefined,
          }
        : current,
    );

    if (custodyId === "central") {
      setAccounts(
        getCustodyFinancialAccounts(
          "central",
        ),
      );
    } else {
      setAccounts([]);
    }
  };

  const saveNew = (currentDraft: ExpenseDraft) => {

    const normalized = normalizeDraft(currentDraft);

    validateDraft(normalized);

    if (normalized.movementType === "expense") {
      addExpenseCategory(normalized.category);
      return createExpenseWithPayment(normalized);
    }

    if (normalized.movementType === "worker_advance") {
      return createWorkerAdvanceWithPayment({
        workerId: normalized.workerId!,
        amount: normalized.amount,
        date: normalized.date,
        description: normalized.description,
        custodyId: normalized.custodyId,
        financialAccountId: normalized.financialAccountId,
        projectId: normalized.projectId,
      });
    }

    return createExpenseWithPayment(normalized);
  };

  const updateExisting = (
    expense: Expense,
    currentDraft: ExpenseDraft,
  ) => {

    const normalized = normalizeDraft(currentDraft);

    validateDraft(normalized, expense);

    if (normalized.movementType === "expense") {
      addExpenseCategory(normalized.category);
    }

    if (expense.movementType === "worker_advance") {
      if (normalized.movementType !== "worker_advance") {
        throw new Error("لا يمكن تحويل سلفة العامل إلى نوع حركة آخر من شاشة المصروفات. عدّلها من حساب العامل.");
      }

      return updateWorkerAdvanceWithPayment(expense.workerId!, {
        workerId: normalized.workerId!,
        amount: normalized.amount,
        date: normalized.date,
        description: normalized.description,
        custodyId: normalized.custodyId,
        financialAccountId: normalized.financialAccountId,
        projectId: normalized.projectId,
      });
    }

    if (normalized.movementType === "worker_advance") {
      throw new Error("لا يمكن تحويل مصروف موجود إلى سلفة عامل من شاشة المصروفات. أنشئ سلفة جديدة من نوع سلف العمال.");
    }

    return updateExpenseWithPayment(expense.id, normalized);
  };

  const saveRow = () => {
    if (!draft || !editingId) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId === "new") {
        saveNew(draft);
      } else {
        const expense = expenses.find(
          (item) =>
            item.id === editingId,
        );

        if (!expense) {
          throw new Error(
            "المصروف المطلوب تعديله غير موجود.",
          );
        }

        updateExisting(
          expense,
          draft,
        );
      }

      load();
      cancelEdit();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "حدث خطأ أثناء حفظ المصروف.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = (expense: Expense) => {
    confirm(
      {
        title: "تأكيد حذف المصروف",
        description: "هل أنت متأكد من حذف هذا المصروف؟ سيتم عكس أثره على العهدة ووسيلة الدفع المرتبطة به، ولا يمكن التراجع عن الإجراء.",
        confirmText: "حذف المصروف",
        cancelText: "إلغاء",
        variant: "danger",
      },
      () => {
        setSaving(true);
        setError("");
        try {
          if (expense.movementType === "worker_advance") {
            if (!expense.workerId) throw new Error("العامل المرتبط بالسلفة غير موجود.");
            deleteWorkerAdvanceWithPayment(
              expense.id.startsWith("worker-advance:")
                ? expense.id.replace("worker-advance:", "")
                : expense.id,
            );
          } else {
            deleteExpenseWithPayment(expense.id);
          }
          load();
          cancelEdit();
        } catch (deleteError) {
          setError(
            deleteError instanceof Error
              ? deleteError.message
              : "حدث خطأ أثناء حذف المصروف.",
          );
        } finally {
          setSaving(false);
        }
      },
    );
  };

  const renderEditor = (
    isNew: boolean,
  ) => {
    if (!draft) {
      return null;
    }

    const centralAccounts =
      draft.custodyId === "central"
        ? accounts.length > 0
          ? accounts
          : getCustodyFinancialAccounts(
              "central",
            )
        : [];

    return (
      <tr
        key={
          editingId ??
          "expense-editor"
        }
        className="border-b border-blue-100 bg-blue-50/40"
      >
        <td className="px-3 py-3 align-top">
          <DateInput
            value={draft.date}
            onChange={(value) =>
              updateDraft(
                "date",
                value,
              )
            }
            className="h-9 w-full min-w-[135px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
          />
        </td>

        <td className="px-3 py-3 align-top">
          <input
            value={draft.description}
            onChange={(event) =>
              updateDraft(
                "description",
                event.target.value,
              )
            }
            placeholder="البيان"
            className="h-9 w-full min-w-[190px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-500"
          />
        </td>

        <td className="px-3 py-3 align-top">
          <select
            value={draft.movementType}
            onChange={(event) =>
              changeMovementType(
                event.target.value as ProjectExpenseMovementType,
              )
            }
            className="h-9 w-full min-w-[140px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none focus:border-blue-500"
          >
            <option value="expense">
              مصروف
            </option>
            <option value="worker_advance">
              سلف العمال
            </option>
            <option value="contractor_advance">
              سلف المقاولين
            </option>
          </select>
        </td>

        <td className="px-3 py-3 align-top">
          {draft.movementType === "worker_advance" ? (
            <select
              value={draft.workerId ?? ""}
              onChange={(event) => updateDraft("workerId", event.target.value || undefined)}
              className="h-9 w-full min-w-[150px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
            >
              <option value="">اختر العامل</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.name}</option>
              ))}
            </select>
          ) : draft.movementType === "contractor_advance" ? (
            <div className="space-y-2">
              <select
                value={draft.contractorId ?? ""}
                onChange={(event) => { updateDraft("contractorId", event.target.value || undefined); updateDraft("siteId", undefined); }}
                className="h-9 w-full min-w-[150px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
              >
                <option value="">اختر المقاول</option>
                {contractors.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
                ))}
              </select>
              {draft.contractorId && (
                <select
                  value={draft.siteId ?? ""}
                  onChange={(event) => {
                    const nextSiteId = event.target.value || undefined;
                    updateDraft("siteId", nextSiteId);
                    const site = nextSiteId ? getProjectSites().find((item) => item.id === nextSiteId) : undefined;
                    updateDraft("projectId", site?.projectId);
                  }}
                  className="h-9 w-full min-w-[150px] rounded-lg border border-violet-200 bg-violet-50/40 px-2 text-xs font-semibold outline-none focus:border-violet-500"
                >
                  <option value="">اختر موقع المقاول</option>
                  {getContractorSiteAssignments(draft.contractorId).map((assignment) => {
                    const site = getProjectSites().find((item) => item.id === assignment.siteId);
                    const project = site ? projects.find((item) => item.id === site.projectId) : undefined;
                    if (!site) return null;
                    return <option key={assignment.id} value={site.id}>{project ? `${project.name} — ` : ""}{site.name}{assignment.endDate ? " (منتهية)" : " (مستمرة)"}</option>;
                  })}
                </select>
              )}
            </div>
          ) : (
            <input
              value={draft.category}
              onChange={(event) => updateDraft("category", event.target.value)}
              list={`expense-categories-${editingId ?? "new"}`}
              placeholder="التصنيف"
              className="h-9 w-full min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-500"
            />
          )}
        </td>

        <td className="px-3 py-3 align-top">
          <select
            value={draft.projectId ?? ""}
            onChange={(event) =>
              changeProject(
                event.target.value,
              )
            }
            className="h-9 w-full min-w-[160px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
          >
            <option value="">
              مصروف عام
            </option>
            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.name}
              </option>
            ))}
          </select>
        </td>

        <td className="px-3 py-3 align-top">
          <div className="space-y-2">
            <select
              value={draft.custodyId}
              onChange={(event) =>
                changeCustody(
                  event.target.value,
                )
              }
              className="h-9 w-full min-w-[160px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
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
                    {custody.name}
                  </option>
                ),
              )}
            </select>

            {draft.custodyId ===
              "central" && (
              <select
                value={
                  draft.financialAccountId ??
                  ""
                }
                onChange={(event) =>
                  updateDraft(
                    "financialAccountId",
                    event.target.value ||
                      undefined,
                  )
                }
                className="h-9 w-full min-w-[160px] rounded-lg border border-blue-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-blue-500"
              >
                <option value="">
                  وسيلة الدفع
                </option>
                {centralAccounts.map(
                  (account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name} —{" "}
                      {money(
                        account.balance,
                      )}
                    </option>
                  ),
                )}
              </select>
            )}
          </div>
        </td>

        <td className="px-3 py-3 align-top">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={
              draft.amount || ""
            }
            onChange={(event) =>
              updateDraft(
                "amount",
                Number(
                  event.target.value,
                ),
              )
            }
            placeholder="0.00"
            className="h-9 w-full min-w-[120px] rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-extrabold outline-none focus:border-blue-500"
          />
        </td>

        <td className="px-3 py-3 align-top">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={saving}
              onClick={saveRow}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isNew ? (
                <Plus className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              حفظ
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={cancelEdit}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              aria-label="إلغاء"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <AppShell>
      <div
        dir="rtl"
        className="mx-auto w-full space-y-6"
      >
        <datalist id="expense-categories-new">
          {allCategories
            .filter(
              (category) =>
                category !==
                CONTRACTOR_CATEGORY,
            )
            .map((category) => (
              <option
                key={category}
                value={category}
              />
            ))}
        </datalist>

        {editingId &&
          editingId !== "new" && (
            <datalist
              id={`expense-categories-${editingId}`}
            >
              {allCategories
                .filter(
                  (category) =>
                    category !==
                    CONTRACTOR_CATEGORY,
                )
                .map((category) => (
                  <option
                    key={category}
                    value={category}
                  />
                ))}
            </datalist>
          )}

        {/* Add only */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-base font-extrabold text-slate-900">
                  إضافة مصروف
                </h1>
                <p className="mt-1 text-xs text-slate-400">
                  إضافة مصروف أو سلفة مقاول
                  مباشرة، مع ربطها بالعهدة
                  والمشروع ووسيلة الدفع.
                </p>
              </div>

              {editingId !== "new" && canCurrentUser("create") && (
                <button
                  type="button"
                  onClick={beginNew}
                  disabled={
                    editingId !== null
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة مصروف
                </button>
              )}
            </div>
          </div>

          {error &&
            editingId === "new" && (
              <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700 sm:mx-6">
                {error}
              </div>
            )}

          {editingId === "new" &&
            draft && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1450px] text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                        التاريخ
                      </th>
                      <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                        البيان
                      </th>
                      <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                        نوع البيان
                      </th>
                      <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                        التصنيف
                      </th>
                      <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                        المشروع / الموقع
                      </th>
                      <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                        العهدة الدافعة
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-extrabold text-slate-500">
                        المبلغ
                      </th>
                      <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                        الإجراء
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderEditor(true)}
                  </tbody>
                </table>
              </div>
            )}
        </section>

        {/* History */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  حركة المصروفات
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  كل المصروفات المسجلة بالفعل
                  مع الفلاتر والتعديل والحذف.
                </p>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                تصفير الفلاتر
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold text-slate-400">
                  الإجمالي بعد الفلترة
                </p>
                <p className="mt-1 text-sm font-extrabold text-red-600">
                  {money(totalAmount)}{" "}
                  جنيه
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 px-3 py-2">
                <p className="text-[10px] font-bold text-blue-500">
                  المصروفات
                </p>
                <p className="mt-1 text-sm font-extrabold text-blue-700">
                  {money(ordinaryTotal)}{" "}
                  جنيه
                </p>
              </div>

              <div className="rounded-xl bg-violet-50 px-3 py-2">
                <p className="text-[10px] font-bold text-violet-500">
                  سلف المقاولين
                </p>
                <p className="mt-1 text-sm font-extrabold text-violet-700">
                  {money(contractorTotal)}{" "}
                  جنيه
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-bold text-amber-500">
                  سلف العمال
                </p>
                <p className="mt-1 text-sm font-extrabold text-amber-700">
                  {money(workerAdvances)}{" "}
                  جنيه
                </p>
              </div>
            </div>

            {error &&
              editingId !== "new" && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
                  {error}
                </div>
              )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                    التاريخ
                  </th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                    البيان
                  </th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                    نوع البيان
                  </th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                    التصنيف
                  </th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                    المشروع / الموقع
                  </th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                    العهدة الدافعة
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-extrabold text-slate-500">
                    المبلغ
                  </th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">
                    الإجراء
                  </th>
                </tr>

                <tr className="border-b border-slate-200 bg-white">
                  <th className="px-2 py-2">
                    <div className="flex gap-1">
                      <DateInput
                        value={fromDate}
                        onChange={(value) =>
                          setFromDate(
                            value,
                          )
                        }
                        className="h-8 w-full rounded-md border border-slate-200 px-1 text-[10px]"
                        title="من تاريخ"
                      />
                      <DateInput
                        value={toDate}
                        onChange={(value) =>
                          setToDate(
                            value,
                          )
                        }
                        className="h-8 w-full rounded-md border border-slate-200 px-1 text-[10px]"
                        title="إلى تاريخ"
                      />
                    </div>
                  </th>

                  <th className="px-2 py-2">
                    <input
                      value={
                        descriptionFilter
                      }
                      onChange={(event) =>
                        setDescriptionFilter(
                          event.target.value,
                        )
                      }
                      placeholder="بحث في البيان"
                      className="h-8 w-full rounded-md border border-slate-200 px-2 text-[11px] outline-none focus:border-blue-500"
                    />
                  </th>

                  <th className="px-2 py-2">
                    <select
                      value={
                        movementFilter
                      }
                      onChange={(event) =>
                        setMovementFilter(
                          event.target.value as MovementFilter,
                        )
                      }
                      className="h-8 w-full rounded-md border border-slate-200 px-1 text-[11px] outline-none focus:border-blue-500"
                    >
                      <option value="all">
                        الكل
                      </option>
                      <option value="expense">
                        مصروف
                      </option>
                      <option value="worker_advance">
                        سلف العمال
                      </option>
                      <option value="contractor_advance">
                        سلف المقاولين
                      </option>
                    </select>
                  </th>

                  <th className="px-2 py-2">
                    <select
                      value={
                        categoryFilter
                      }
                      onChange={(event) =>
                        setCategoryFilter(
                          event.target.value,
                        )
                      }
                      className="h-8 w-full rounded-md border border-slate-200 px-1 text-[11px] outline-none focus:border-blue-500"
                    >
                      <option value="">
                        كل التصنيفات
                      </option>
                      {categoryOptions.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        ),
                      )}
                    </select>
                  </th>

                  <th className="px-2 py-2">
                    <select
                      value={
                        projectFilter
                      }
                      onChange={(event) =>
                        setProjectFilter(
                          event.target.value,
                        )
                      }
                      className="h-8 w-full rounded-md border border-slate-200 px-1 text-[11px] outline-none focus:border-blue-500"
                    >
                      <option value="">
                        كل المشاريع
                      </option>
                      {projectOptions.map(
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
                  </th>

                  <th className="px-2 py-2">
                    <select
                      value={
                        custodyFilter
                      }
                      onChange={(event) =>
                        setCustodyFilter(
                          event.target.value,
                        )
                      }
                      className="h-8 w-full rounded-md border border-slate-200 px-1 text-[11px] outline-none focus:border-blue-500"
                    >
                      <option value="">
                        كل العهد
                      </option>
                      {custodyOptions.map(
                        (custody) => (
                          <option
                            key={custody.id}
                            value={custody.id}
                          >
                            {custody.name}
                          </option>
                        ),
                      )}
                    </select>
                  </th>

                  <th className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      value={amountMin}
                      onChange={(event) =>
                        setAmountMin(
                          event.target.value,
                        )
                      }
                      placeholder="من مبلغ"
                      className="h-8 w-full rounded-md border border-slate-200 px-2 text-[11px] text-left outline-none focus:border-blue-500"
                    />
                  </th>

                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-400">
                    AND
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(
                  (expense) => {
                    if (
                      editingId ===
                      expense.id
                    ) {
                      return renderEditor(
                        false,
                      );
                    }

                    const type =
                      normalizedMovementType(
                        expense.movementType,
                      );

                    return (
                      <tr
                        key={expense.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-3 py-4 text-xs font-semibold text-slate-500">
                          {dateLabel(
                            expense.date,
                          )}
                        </td>

                        <td className="max-w-[280px] px-3 py-4">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {expense.description}
                          </p>
                          {expense.movementType === "worker_advance" && expense.workerId && (
                            <p className="mt-1 text-[11px] font-semibold text-amber-600">
                              العامل: {workers.find((worker) => worker.id === expense.workerId)?.name ?? "عامل غير معروف"}
                            </p>
                          )}
                          {expense.movementType === "contractor_advance" && expense.contractorId && (
                            <p className="mt-1 text-[11px] font-semibold text-violet-600">
                              المقاول: {contractors.find((contractor) => contractor.id === expense.contractorId)?.name ?? "مقاول غير معروف"}
                            </p>
                          )}
                          {expense.movementType === "contractor_advance" && expense.siteId && (
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              الموقع: {getProjectSites().find((site) => site.id === expense.siteId)?.name ?? "موقع غير معروف"}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${movementClasses(
                              type,
                            )}`}
                          >
                            {movementLabel(
                              type,
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
                            {
                              expense.category
                            }
                          </span>
                        </td>

                        <td className="px-3 py-4 text-xs font-semibold text-slate-600">
                          {expense.projectId
                            ? projectMap.get(
                                expense.projectId,
                              ) ??
                              "مشروع غير معروف"
                            : "مصروف عام"}
                        </td>

                        <td className="px-3 py-4 text-xs font-semibold text-slate-600">
                          {custodyMap.get(
                            expense.custodyId,
                          ) ??
                            "عهدة غير معروفة"}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-left text-sm font-extrabold text-red-600">
                          -
                          {money(
                            expense.amount,
                          )}{" "}
                          جنيه
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {canCurrentUser("update") && (
                              <button
                                type="button"
                                disabled={editingId !== null || saving}
                                onClick={() => beginEdit(expense)}
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                title="تعديل"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={
                                editingId !==
                                  null ||
                                saving
                              }
                              onClick={() =>
                                removeExpense(
                                  expense,
                                )
                              }
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 px-2.5 text-red-600 hover:bg-red-100 disabled:opacity-50"
                              title="حذف"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}

                {filteredExpenses.length ===
                  0 &&
                  editingId !== "new" && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center"
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <Check className="h-5 w-5" />
                        </div>

                        <p className="mt-3 text-sm font-bold text-slate-700">
                          لا توجد مصروفات مطابقة للفلاتر
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          جرّب تغيير الفلاتر أو أضف مصروفًا جديدًا.
                        </p>
                      </td>
                    </tr>
                  )}
              </tbody>

              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/70">
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-sm font-extrabold text-slate-700"
                  >
                    إجمالي الحركات الظاهرة بعد الفلترة
                  </td>

                  <td className="px-3 py-4 text-left text-sm font-extrabold text-red-600">
                    -
                    {money(
                      totalAmount,
                    )}{" "}
                    جنيه
                  </td>

                  <td className="px-3 py-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
      {dialog}
    </AppShell>
  );
}
