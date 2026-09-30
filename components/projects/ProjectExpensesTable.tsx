"use client";

import DateInput from "@/lib/date-input";

import { formatDisplayDate } from "@/lib/formatters";
import { useEffect, useMemo, useState } from "react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  getCustodies,
  getProjectCustody,
} from "@/lib/data/custodies";
import {
  getCustodyFinancialAccounts,
} from "@/lib/data/custody-financial-accounts";
import {
  addExpenseCategory,
  getExpenseCategories,
} from "@/lib/data/expense-categories";
import {
  createProjectMovement,
  deleteProjectMovement,
  getProjectMovementRecords,
  updateProjectMovement,
} from "@/lib/data/financial-transactions";
import { getWorkers } from "@/lib/data/workers";
import { getContractors } from "@/lib/data/contractors";
import { getProjectSites } from "@/lib/data/project-sites";
import { getContractorSiteAssignments } from "@/lib/data/contractor-site-assignments";
import type { Custody } from "@/types/custody";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";
import type {
  ProjectMovementDraft,
  ProjectMovementRecord,
  ProjectMovementType,
} from "@/lib/data/financial-transactions";

interface ProjectExpensesTableProps {
  projectId: string;
  onChange?: () => void;
}

const WORKER_CATEGORY = "سلف العمال";
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

function movementLabel(type: ProjectMovementType) {
  switch (type) {
    case "worker_advance":
      return "سلف العمال";
    case "contractor_advance":
      return "سلف المقاولين";
    default:
      return "مصروف";
  }
}

function movementClasses(type: ProjectMovementType) {
  switch (type) {
    case "worker_advance":
      return "bg-amber-50 text-amber-700";
    case "contractor_advance":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

function defaultDraft(
  custodyId: string,
  workerId?: string,
): ProjectMovementDraft {
  return {
    date: localDate(),
    description: "",
    movementType: "expense",
    category: "",
    custodyId,
    amount: 0,
    workerId,
    contractorId: undefined,
    siteId: undefined,
    financialAccountId: undefined,
  };
}

export default function ProjectExpensesTable({
  projectId,
  onChange,
}: ProjectExpensesTableProps) {
  const [rows, setRows] = useState<ProjectMovementRecord[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [workers, setWorkers] = useState(getWorkers());
  const [contractors, setContractors] = useState(getContractors());
  const [projectSites, setProjectSites] = useState(getProjectSites());
  const [accounts, setAccounts] = useState<CustodyFinancialAccount[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectMovementDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const [error, setError] = useState("");

  const [movementFilter, setMovementFilter] = useState<"all" | ProjectMovementType>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [custodyFilter, setCustodyFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");

  const load = () => {
    setRows(getProjectMovementRecords(projectId));
    setCustodies(getCustodies());
    setWorkers(getWorkers());
    setContractors(getContractors());
    setProjectSites(getProjectSites());
    setCategories([
      ...new Set([
        ...getExpenseCategories(),
        WORKER_CATEGORY,
        CONTRACTOR_CATEGORY,
      ]),
    ]);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const custodyMap = useMemo(
    () => new Map(custodies.map((custody) => [custody.id, custody.name])),
    [custodies],
  );

  const workerMap = useMemo(
    () => new Map(workers.map((worker) => [worker.id, worker.name])),
    [workers],
  );

  const projectContractors = useMemo(() => {
    const ids = new Set<string>();
    contractors.forEach((contractor) => {
      getContractorSiteAssignments(contractor.id).forEach((assignment) => {
        if (projectSites.some((site) => site.id === assignment.siteId && site.projectId === projectId)) ids.add(contractor.id);
      });
    });
    return contractors.filter((contractor) => ids.has(contractor.id)).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [contractors, projectSites, projectId]);

  const activeWorkers = useMemo(
    () =>
      workers
        .filter((worker) => worker.currentProjectId === projectId)
        .sort((a, b) => a.name.localeCompare(b.name, "ar")),
    [workers, projectId],
  );

  const allCategories = useMemo(() => {
    const values = new Set<string>(categories);
    rows.forEach((row) => values.add(row.category));
    return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  }, [categories, rows]);

  const applyFilters = (
    source: ProjectMovementRecord[],
    options?: { ignoreCategory?: boolean; ignoreWorker?: boolean },
  ) => {
    const normalized = descriptionFilter.trim().toLocaleLowerCase("ar");
    const minAmount = amountMin === "" ? undefined : Number(amountMin);

    return source.filter((row) => {
      if (movementFilter !== "all" && row.movementType !== movementFilter) return false;
      if (fromDate && row.date < fromDate) return false;
      if (toDate && row.date > toDate) return false;
      if (normalized && !row.description.toLocaleLowerCase("ar").includes(normalized)) return false;
      if (!options?.ignoreCategory && categoryFilter && row.category !== categoryFilter) return false;
      if (!options?.ignoreWorker && workerFilter && row.workerId !== workerFilter) return false;
      if (custodyFilter && row.custodyId !== custodyFilter) return false;
      if (minAmount !== undefined && (!Number.isFinite(minAmount) || row.amount < minAmount)) return false;
      return true;
    });
  };

  const filteredRows = useMemo(
    () => applyFilters(rows),
    [
      rows,
      movementFilter,
      fromDate,
      toDate,
      descriptionFilter,
      categoryFilter,
      workerFilter,
      custodyFilter,
      amountMin,
    ],
  );

  const categoryOptions = useMemo(
    () =>
      [...new Set(applyFilters(rows, { ignoreCategory: true }).map((row) => row.category))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "ar")),
    [
      rows,
      movementFilter,
      fromDate,
      toDate,
      descriptionFilter,
      workerFilter,
      custodyFilter,
      amountMin,
    ],
  );

  const workerOptions = useMemo(
    () =>
      [...new Set(applyFilters(rows, { ignoreWorker: true }).map((row) => row.workerId).filter(Boolean))]
        .map((id) => ({ id: id as string, name: workerMap.get(id as string) ?? "عامل غير معروف" }))
        .sort((a, b) => a.name.localeCompare(b.name, "ar")),
    [
      rows,
      workerMap,
      movementFilter,
      fromDate,
      toDate,
      descriptionFilter,
      categoryFilter,
      custodyFilter,
      amountMin,
    ],
  );

  const filteredTotal = useMemo(
    () => filteredRows.reduce((total, row) => total + row.amount, 0),
    [filteredRows],
  );

  const workerTotal = useMemo(
    () => filteredRows
      .filter((row) => row.movementType === "worker_advance")
      .reduce((total, row) => total + row.amount, 0),
    [filteredRows],
  );

  const contractorTotal = useMemo(
    () => filteredRows
      .filter((row) => row.movementType === "contractor_advance")
      .reduce((total, row) => total + row.amount, 0),
    [filteredRows],
  );

  const ordinaryTotal = filteredTotal - workerTotal - contractorTotal;

  const beginNew = () => {
    const projectCustody = getProjectCustody(projectId);
    const fallbackCustody = projectCustody?.id ?? custodies[0]?.id ?? "";
    const firstWorker = activeWorkers[0]?.id;

    setError("");
    setMovementFilter("all");
    setFromDate("");
    setToDate("");
    setDescriptionFilter("");
    setCategoryFilter("");
    setWorkerFilter("");
    setCustodyFilter("");
    setAmountMin("");
    setEditingId("new");
    setAccounts(
      fallbackCustody === "central"
        ? getCustodyFinancialAccounts("central")
        : [],
    );
    setDraft(defaultDraft(fallbackCustody, firstWorker));
  };

  const beginEdit = (row: ProjectMovementRecord) => {
    setError("");
    setEditingId(row.id);
    setDraft({
      date: row.date,
      description: row.description,
      movementType: row.movementType,
      category: row.category,
      custodyId: row.custodyId,
      amount: row.amount,
      workerId: row.workerId,
      contractorId: row.contractorId,
      siteId: row.siteId,
      financialAccountId: row.financialAccountId,
    });

    if (row.custodyId === "central") {
      setAccounts(getCustodyFinancialAccounts("central"));
    } else {
      setAccounts([]);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setError("");
  };

  const updateDraft = <K extends keyof ProjectMovementDraft>(
    key: K,
    value: ProjectMovementDraft[K],
  ) => {
    setDraft((current) =>
      current
        ? { ...current, [key]: value }
        : current,
    );
  };

  const changeMovementType = (type: ProjectMovementType) => {
    setDraft((current) => {
      if (!current) return current;

      if (type === "worker_advance") {
        return {
          ...current,
          movementType: type,
          category: WORKER_CATEGORY,
          workerId: activeWorkers[0]?.id,
          contractorId: undefined,
          siteId: undefined,
        };
      }

      if (type === "contractor_advance") {
        return {
          ...current,
          movementType: type,
          category: CONTRACTOR_CATEGORY,
          workerId: undefined,
          contractorId: current.contractorId,
          siteId: current.siteId,
        };
      }

      return {
        ...current,
        movementType: type,
        category:
          current.category === WORKER_CATEGORY ||
          current.category === CONTRACTOR_CATEGORY
            ? ""
            : current.category,
        workerId: undefined,
        contractorId: undefined,
        siteId: undefined,
      };
    });
  };

  const changeCustody = (custodyId: string) => {
    updateDraft("custodyId", custodyId);
    if (custodyId === "central") {
      setAccounts(getCustodyFinancialAccounts("central"));
      updateDraft("financialAccountId", undefined);
    } else {
      setAccounts([]);
      updateDraft("financialAccountId", undefined);
    }
  };

  const saveRow = () => {
    if (!draft) return;

    setSaving(true);
    setError("");

    try {
      let normalizedDraft = { ...draft };
      if (normalizedDraft.movementType === "worker_advance") {
        normalizedDraft = { ...normalizedDraft, category: WORKER_CATEGORY };
      }

      if (normalizedDraft.movementType === "contractor_advance") {
        normalizedDraft = { ...normalizedDraft, category: CONTRACTOR_CATEGORY };
      }

      if (normalizedDraft.movementType === "worker_advance" && !normalizedDraft.workerId) {
        throw new Error("اختر العامل أولًا.");
      }

      if (normalizedDraft.movementType === "contractor_advance") {
        if (!normalizedDraft.contractorId) throw new Error("اختر المقاول أولًا.");
        if (!normalizedDraft.siteId) throw new Error("اختر موقع المقاول أولًا.");
      }

      if (normalizedDraft.movementType === "expense") {
        addExpenseCategory(normalizedDraft.category);
      }

      if (editingId === "new") {
        createProjectMovement(projectId, normalizedDraft);
      } else {
        const current = rows.find((row) => row.id === editingId);
        if (!current) {
          throw new Error("الحركة المطلوب تعديلها غير موجودة.");
        }
        updateProjectMovement(projectId, current, normalizedDraft);
      }

      load();
      onChange?.();
      cancelEdit();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "حدث خطأ أثناء حفظ الحركة.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeRow = (row: ProjectMovementRecord) => {
    confirm(
      {
        title: "تأكيد حذف الحركة",
        description: "هل أنت متأكد من حذف هذه الحركة؟ سيتم عكس أثرها على العهدة والحساب المالي المرتبط بها، ولا يمكن التراجع عن الإجراء.",
        confirmText: "حذف الحركة",
        cancelText: "إلغاء",
        variant: "danger",
      },
      () => {
        setSaving(true);
    setError("");

    try {
      deleteProjectMovement(projectId, row);
      load();
      onChange?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "حدث خطأ أثناء حذف الحركة.",
      );
    } finally {
      setSaving(false);
    }
       },
    );
  };

  const resetFilters = () => {
    setMovementFilter("all");
    setFromDate("");
    setToDate("");
    setDescriptionFilter("");
    setCategoryFilter("");
    setWorkerFilter("");
    setCustodyFilter("");
    setAmountMin("");
  };

  const renderEditor = (isNew: boolean) => {
    if (!draft) return null;

    const centralAccounts =
      draft.custodyId === "central"
        ? accounts.length > 0
          ? accounts
          : getCustodyFinancialAccounts("central")
        : [];

    return (
      <tr key={editingId ?? "editor"} className="border-b border-blue-100 bg-blue-50/40">
        <td className="px-3 py-3 align-top">
          <DateInput
            value={draft.date}
            onChange={(value) => updateDraft("date", value)}
            className="h-9 w-full min-w-[135px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
          />
        </td>

        <td className="px-3 py-3 align-top">
          <input
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            placeholder="البيان"
            className="h-9 w-full min-w-[190px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-500"
          />
        </td>

        <td className="px-3 py-3 align-top">
          <select
            value={draft.movementType}
            onChange={(event) => changeMovementType(event.target.value as ProjectMovementType)}
            disabled={!isNew && editingId?.startsWith("worker:") === true}
            className="h-9 w-full min-w-[140px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="expense">مصروف</option>
            <option value="worker_advance">سلف العمال</option>
            <option value="contractor_advance">سلف المقاولين</option>
          </select>
        </td>

        <td className="px-3 py-3 align-top">
          {draft.movementType === "expense" ? (
            <input
              value={draft.category}
              onChange={(event) => updateDraft("category", event.target.value)}
              list={`project-expense-categories-${projectId}`}
              placeholder="التصنيف"
              className="h-9 w-full min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-500"
            />
          ) : (
            <div className="flex h-9 min-w-[150px] items-center rounded-lg bg-slate-100 px-3 text-xs font-extrabold text-slate-600">
              {draft.category}
            </div>
          )}
        </td>

        <td className="px-3 py-3 align-top">
          {draft.movementType === "worker_advance" ? (
            <select
              value={draft.workerId ?? ""}
              onChange={(event) => updateDraft("workerId", event.target.value || undefined)}
              className="h-9 w-full min-w-[150px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
            >
              <option value="">اختر العامل</option>
              {activeWorkers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          ) : draft.movementType === "contractor_advance" ? (
            <div className="space-y-2">
              <select
                value={draft.contractorId ?? ""}
                onChange={(event) => { updateDraft("contractorId", event.target.value || undefined); updateDraft("siteId", undefined); }}
                className="h-9 w-full min-w-[160px] rounded-lg border border-violet-200 bg-white px-2 text-xs font-semibold outline-none focus:border-violet-500"
              >
                <option value="">اختر المقاول</option>
                {projectContractors.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
                ))}
              </select>
              {draft.contractorId && (
                <select
                  value={draft.siteId ?? ""}
                  onChange={(event) => updateDraft("siteId", event.target.value || undefined)}
                  className="h-9 w-full min-w-[160px] rounded-lg border border-violet-200 bg-violet-50 px-2 text-[11px] font-semibold outline-none focus:border-violet-500"
                >
                  <option value="">اختر موقع المقاول</option>
                  {getContractorSiteAssignments(draft.contractorId).map((assignment) => {
                    const site = projectSites.find((item) => item.id === assignment.siteId && item.projectId === projectId);
                    if (!site) return null;
                    return <option key={assignment.id} value={site.id}>{site.name}{assignment.endDate ? " (منتهية)" : " (مستمرة)"}</option>;
                  })}
                </select>
              )}
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-400">-</span>
          )}
        </td>

        <td className="px-3 py-3 align-top">
          <div className="space-y-2">
            <select
              value={draft.custodyId}
              onChange={(event) => changeCustody(event.target.value)}
              className="h-9 w-full min-w-[160px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
            >
              <option value="">اختر العهدة</option>
              {custodies.map((custody) => (
                <option key={custody.id} value={custody.id}>
                  {custody.name}
                </option>
              ))}
            </select>

            {draft.custodyId === "central" && (
              <select
                value={draft.financialAccountId ?? ""}
                onChange={(event) => updateDraft("financialAccountId", event.target.value || undefined)}
                className="h-9 w-full min-w-[160px] rounded-lg border border-blue-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-blue-500"
              >
                <option value="">وسيلة الدفع</option>
                {centralAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {money(account.balance)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </td>

        <td className="px-3 py-3 align-top">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={draft.amount || ""}
            onChange={(event) => updateDraft("amount", Number(event.target.value))}
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
              {isNew ? <Plus className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
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
    <>
      <div className="space-y-6">
      <datalist id={`project-expense-categories-${projectId}`}>
        {allCategories
          .filter(
            (category) =>
              category !== WORKER_CATEGORY &&
              category !== CONTRACTOR_CATEGORY,
          )
          .map((category) => (
            <option key={category} value={category} />
          ))}
      </datalist>

      {/* Add movement only */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                إضافة حركة للمشروع
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                إضافة مصروف أو سلفة جديدة للمشروع وربطها بالعهدة والعامل والتقارير.
              </p>
            </div>

            {!draft || editingId !== "new" ? (
              <button
                type="button"
                onClick={beginNew}
                disabled={editingId !== null}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة مصروف
              </button>
            ) : null}
          </div>
        </div>

        {error && editingId === "new" && (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700 sm:mx-6">
            {error}
          </div>
        )}

        {editingId === "new" && draft && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">التاريخ</th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">البيان</th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">نوع البيان</th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">التصنيف</th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">العامل / المقاول</th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">العهدة الدافعة</th>
                  <th className="px-3 py-3 text-left text-xs font-extrabold text-slate-500">المبلغ</th>
                  <th className="px-3 py-3 text-xs font-extrabold text-slate-500">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {renderEditor(true)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Project movement/history */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                حركة المشروع
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                جميع المصروفات والسلف المسجلة على المشروع، مع إمكانية الفلترة والتعديل والحذف.
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

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold text-slate-400">الإجمالي بعد الفلترة</p>
              <p className="mt-1 text-sm font-extrabold text-red-600">{money(filteredTotal)} جنيه</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-3 py-2">
              <p className="text-[10px] font-bold text-blue-500">المصروفات</p>
              <p className="mt-1 text-sm font-extrabold text-blue-700">{money(ordinaryTotal)} جنيه</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-[10px] font-bold text-amber-500">سلف العمال</p>
              <p className="mt-1 text-sm font-extrabold text-amber-700">{money(workerTotal)} جنيه</p>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-2">
              <p className="text-[10px] font-bold text-violet-500">سلف المقاولين</p>
              <p className="mt-1 text-sm font-extrabold text-violet-700">{money(contractorTotal)} جنيه</p>
            </div>
          </div>

          {error && editingId !== "new" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-3 py-3 text-xs font-extrabold text-slate-500">التاريخ</th>
                <th className="px-3 py-3 text-xs font-extrabold text-slate-500">البيان</th>
                <th className="px-3 py-3 text-xs font-extrabold text-slate-500">نوع البيان</th>
                <th className="px-3 py-3 text-xs font-extrabold text-slate-500">التصنيف</th>
                <th className="px-3 py-3 text-xs font-extrabold text-slate-500">العامل / المقاول</th>
                <th className="px-3 py-3 text-xs font-extrabold text-slate-500">العهدة الدافعة</th>
                <th className="px-3 py-3 text-left text-xs font-extrabold text-slate-500">المبلغ</th>
                <th className="px-3 py-3 text-xs font-extrabold text-slate-500">الإجراء</th>
              </tr>
              <tr className="border-b border-slate-200 bg-white">
                <th className="px-2 py-2">
                  <div className="flex gap-1">
                    <DateInput
                      value={fromDate}
                      onChange={(value) => setFromDate(value)}
                      className="h-8 w-full rounded-md border border-slate-200 px-1 text-[10px]"
                      title="من تاريخ"
                    />
                    <DateInput
                      value={toDate}
                      onChange={(value) => setToDate(value)}
                      className="h-8 w-full rounded-md border border-slate-200 px-1 text-[10px]"
                      title="إلى تاريخ"
                    />
                  </div>
                </th>
                <th className="px-2 py-2">
                  <input
                    value={descriptionFilter}
                    onChange={(event) => setDescriptionFilter(event.target.value)}
                    placeholder="بحث في البيان"
                    className="h-8 w-full rounded-md border border-slate-200 px-2 text-[11px] outline-none focus:border-blue-500"
                  />
                </th>
                <th className="px-2 py-2">
                  <select
                    value={movementFilter}
                    onChange={(event) =>
                      setMovementFilter(
                        event.target.value as "all" | ProjectMovementType,
                      )
                    }
                    className="h-8 w-full rounded-md border border-slate-200 px-1 text-[11px] outline-none focus:border-blue-500"
                  >
                    <option value="all">الكل</option>
                    <option value="expense">مصروف</option>
                    <option value="worker_advance">سلف العمال</option>
                    <option value="contractor_advance">سلف المقاولين</option>
                  </select>
                </th>
                <th className="px-2 py-2">
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="h-8 w-full rounded-md border border-slate-200 px-1 text-[11px] outline-none focus:border-blue-500"
                  >
                    <option value="">كل التصنيفات</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 py-2">
                  <select
                    value={workerFilter}
                    onChange={(event) => setWorkerFilter(event.target.value)}
                    className="h-8 w-full rounded-md border border-slate-200 px-1 text-[11px] outline-none focus:border-blue-500"
                  >
                    <option value="">كل العمال</option>
                    {workerOptions.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 py-2">
                  <select
                    value={custodyFilter}
                    onChange={(event) => setCustodyFilter(event.target.value)}
                    className="h-8 w-full rounded-md border border-slate-200 px-1 text-[11px] outline-none focus:border-blue-500"
                  >
                    <option value="">كل العهد</option>
                    {custodies.map((custody) => (
                      <option key={custody.id} value={custody.id}>
                        {custody.name}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 py-2">
                  <input
                    type="number"
                    min="0"
                    value={amountMin}
                    onChange={(event) => setAmountMin(event.target.value)}
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
              {filteredRows.map((row) => {
                if (editingId === row.id) {
                  return renderEditor(false);
                }

                return (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-3 py-4 text-xs font-semibold text-slate-500">
                      {dateLabel(row.date)}
                    </td>
                    <td className="max-w-[280px] px-3 py-4">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {row.description}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${movementClasses(
                          row.movementType,
                        )}`}
                      >
                        {movementLabel(row.movementType)}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
                        {row.category}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs font-semibold text-slate-600">
                      {row.workerId
                        ? workerMap.get(row.workerId) ?? "عامل غير معروف"
                        : "-"}
                    </td>
                    <td className="px-3 py-4 text-xs font-semibold text-slate-600">
                      {custodyMap.get(row.custodyId) ?? "عهدة غير معروفة"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-left text-sm font-extrabold text-red-600">
                      -{money(row.amount)} جنيه
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          disabled={editingId !== null || saving}
                          onClick={() => beginEdit(row)}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          title="تعديل"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={editingId !== null || saving}
                          onClick={() => removeRow(row)}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 px-2.5 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && editingId !== "new" && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Check className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-700">
                      لا توجد حركات مطابقة للفلاتر
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      جرّب تغيير الفلاتر أو أضف حركة جديدة للمشروع.
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
                  -{money(filteredTotal)} جنيه
                </td>
                <td className="px-3 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      </div>
      {dialog}
    </>
  );
}
