"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Filter,
  ReceiptText,
  RotateCcw,
  WalletCards,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getCustodies,
  getProjectCustody,
} from "@/lib/data/custodies";

import {
  getCustodyTransactionsByCustodyId,
} from "@/lib/data/custody-transactions";

import { getExpenses } from "@/lib/data/expenses";

import { getProjects } from "@/lib/data/projects";
import { getCustodyFinancialAccounts } from "@/lib/data/custody-financial-accounts";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";

import type { Custody } from "@/types/custody";
import type { CustodyTransaction } from "@/types/custody-transaction";
import type { Expense } from "@/types/expense";
import type { Project } from "@/types/project";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const dateLabel = (value?: string) => {
  if (!value) {
    return "-";
  }

  const [y, m, d] = value.split("-");

  return y && m && d
    ? `${d}/${m}/${y}`
    : value;
};

const sortNewest = <
  T extends {
    date: string;
    createdAt: string;
  },
>(
  items: T[],
) =>
  [...items].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt),
  );

const projectName = (
  id: string | undefined,
  projects: Project[],
) =>
  id
    ? projects.find(
        (item) => item.id === id,
      )?.name ?? "مشروع غير موجود"
    : "مصروف عام";

/*
 * تحديد مصدر الوارد الفعلي للعهدة.
 *
 * مهم جدًا:
 *
 * لو الحركة تحويل من عهدة إلى عهدة:
 * relatedCustodyId = العهدة التي حولت المبلغ فعليًا.
 *
 * لذلك:
 *
 * الحاج رمضان
 *      ↓
 * عهدتي أنا
 *      ↓
 * عهدة سيوة
 *
 * في عهدتي أنا:
 * المصدر = الحاج رمضان
 *
 * في عهدة سيوة:
 * المصدر = عهدتي أنا
 *
 * ولا ننقل المصدر الأصلي للحركة إلى العهدة التالية.
 */
const incomingSource = (
  tx: CustodyTransaction,
  custodies: Custody[],
) => {
  /*
   * عهدتي أنا لها معاملة خاصة في المصدر.
   *
   * لو الحاج رمضان مثلًا أرسل 50,000
   * إلى عهدتي أنا، ثم قمت أنا بتحويلها
   * إلى عهدة سيوة، فالمصدر في عهدتي أنا
   * يظل هو الحاج رمضان؛ لأن هذا هو المصدر
   * الأصلي للمبلغ الذي دخل عهدتي.
   *
   * أما في العهدة المستقبلة مثل سيوة،
   * فالمصدر المباشر هو العهدة التي حولت
   * المبلغ فعليًا، أي: عهدتي أنا.
   */
  if (tx.custodyId === "central") {
    if (tx.source?.trim()) {
      return tx.source.trim();
    }

    if (tx.relatedCustodyId) {
      const relatedCustody = custodies.find(
        (custody) =>
          custody.id ===
          tx.relatedCustodyId,
      );

      if (relatedCustody) {
        return relatedCustody.name;
      }
    }
  }

  /*
   * بالنسبة لأي عهدة مستقبلة، نعرض
   * العهدة التي حولت المبلغ مباشرة.
   *
   * مثال:
   * عهدتي أنا -> عهدة سيوة
   *
   * يظهر في سيوة:
   * وارد من عهدتي أنا
   *
   * ولا نأخذ المصدر الأصلي مثل الحاج رمضان
   * وننقله إلى سيوة.
   */
  if (tx.relatedCustodyId) {
    const relatedCustody = custodies.find(
      (custody) =>
        custody.id ===
        tx.relatedCustodyId,
    );

    if (relatedCustody) {
      return relatedCustody.name;
    }
  }

  /*
   * لو الحركة وارد مباشر من جهة خارجية
   * وليس تحويلًا من عهدة أخرى، نستخدم
   * المصدر الذي سجله المستخدم.
   */
  if (tx.source?.trim()) {
    return tx.source.trim();
  }

  return "مصدر غير محدد";
};

function SelectBox({
  id,
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: {
    value: string;
    label: string;
  }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          disabled={disabled}
          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 pl-10 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          ⌄
        </span>
      </div>
    </div>
  );
}

function DateBox({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <CalendarDays className="pointer-events-none absolute right-4 top-3.5 h-5 w-5 text-slate-400" />

        <input
          id={id}
          type="date"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
        />
      </div>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ReceiptText className="h-6 w-6" />
      </div>

      <p className="mt-4 text-sm font-bold text-slate-600">
        {text}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        غيّر الفلاتر أو سجّل حركة جديدة.
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const [projects, setProjects] =
    useState<Project[]>([]);

  const [custodies, setCustodies] =
    useState<Custody[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [transactions, setTransactions] =
    useState<CustodyTransaction[]>([]);

  const [financialAccounts, setFinancialAccounts] =
    useState<CustodyFinancialAccount[]>([]);

  const [
    expenseProject,
    setExpenseProject,
  ] = useState("");

  const [
    expenseCategory,
    setExpenseCategory,
  ] = useState("");

  const [
    expenseCustody,
    setExpenseCustody,
  ] = useState("");

  const [
    expenseFrom,
    setExpenseFrom,
  ] = useState("");

  const [
    expenseTo,
    setExpenseTo,
  ] = useState("");

  const [
    incomingCustody,
    setIncomingCustody,
  ] = useState("");

  const [
    incomingSourceFilter,
    setIncomingSourceFilter,
  ] = useState("");

  const [
    incomingFrom,
    setIncomingFrom,
  ] = useState("");

  const [
    incomingTo,
    setIncomingTo,
  ] = useState("");

  const [
    transferProject,
    setTransferProject,
  ] = useState("");

  const [
    transferFrom,
    setTransferFrom,
  ] = useState("");

  const [
    transferTo,
    setTransferTo,
  ] = useState("");

  const [
    projectReportProject,
    setProjectReportProject,
  ] = useState("");

  const [
    projectReportFrom,
    setProjectReportFrom,
  ] = useState("");

  const [
    projectReportTo,
    setProjectReportTo,
  ] = useState("");

  const [personReportName, setPersonReportName] = useState("");

  const [personReportFrom, setPersonReportFrom] = useState("");

  const [personReportTo, setPersonReportTo] = useState("");

  const [loaded, setLoaded] =
    useState(false);

  const loadData = () => {
    const allCustodies =
      getCustodies();

    setProjects(getProjects());

    setCustodies(
      allCustodies,
    );

    setExpenses(
      getExpenses(),
    );

    setFinancialAccounts(
      getCustodyFinancialAccounts(),
    );

    setTransactions(
      allCustodies.flatMap(
        (custody) =>
          getCustodyTransactionsByCustodyId(
            custody.id,
          ),
      ),
    );

    setLoaded(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  const financialAccountName = (id?: string) =>
    id
      ? financialAccounts.find((account) => account.id === id)?.name ?? "وسيلة دفع غير موجودة"
      : "غير محددة";

  /*
   * فلاتر المصروفات تعمل بشكل متدرج:
   *
   * 1) العهدة الدافعة
   * 2) تصنيف المصروف
   * 3) المكان / المشروع الذي اتصرف فيه
   *
   * وكل اختيار يحدد الخيارات المتاحة في الفلتر الذي بعده.
   */
  const expenseCustodyOptions =
    useMemo(() => {
      const ids = new Set(
        expenses
          .filter(
            (item) =>
              (!expenseFrom ||
                item.date >=
                  expenseFrom) &&
              (!expenseTo ||
                item.date <=
                  expenseTo),
          )
          .map(
            (item) =>
              item.custodyId,
          ),
      );

      return custodies
        .filter((item) =>
          ids.has(item.id),
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "ar",
          ),
        );
    }, [
      expenses,
      custodies,
      expenseFrom,
      expenseTo,
    ]);

  const expenseCategoryOptions =
    useMemo(() => {
      const values = expenses
        .filter(
          (item) =>
            (!expenseCustody ||
              item.custodyId ===
                expenseCustody) &&
            (!expenseFrom ||
              item.date >=
                expenseFrom) &&
            (!expenseTo ||
              item.date <=
                expenseTo),
        )
        .map((item) =>
          item.category?.trim(),
        )
        .filter(Boolean);

      return Array.from(
        new Set(values),
      )
        .sort((a, b) =>
          a.localeCompare(
            b,
            "ar",
          ),
        )
        .map((value) => ({
          value,
          label: value,
        }));
    }, [
      expenses,
      expenseCustody,
      expenseFrom,
      expenseTo,
    ]);

  const expenseProjectOptions =
    useMemo(() => {
      const projectIds = new Set(
        expenses
          .filter(
            (item) =>
              (!expenseCustody ||
                item.custodyId ===
                  expenseCustody) &&
              (!expenseCategory ||
                item.category ===
                  expenseCategory) &&
              (!expenseFrom ||
                item.date >=
                  expenseFrom) &&
              (!expenseTo ||
                item.date <=
                  expenseTo),
          )
          .map(
            (item) =>
              item.projectId,
          ),
      );

      const projectsWithExpenses =
        projects
          .filter((item) =>
            projectIds.has(item.id),
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
              "ar",
            ),
          );

      const hasGeneralExpenses =
        expenses.some(
          (item) =>
            !item.projectId &&
            (!expenseCustody ||
              item.custodyId ===
                expenseCustody) &&
            (!expenseCategory ||
              item.category ===
                expenseCategory) &&
            (!expenseFrom ||
              item.date >=
                expenseFrom) &&
            (!expenseTo ||
              item.date <=
                expenseTo),
        );

      if (hasGeneralExpenses) {
        return [
          {
            id: "__general__",
            name: "مصروف عام",
          },
          ...projectsWithExpenses,
        ];
      }

      return projectsWithExpenses;
    }, [
      expenses,
      projects,
      expenseCustody,
      expenseCategory,
      expenseFrom,
      expenseTo,
    ]);

  const filteredExpenses =
    useMemo(
      () =>
        sortNewest(
          expenses.filter(
            (item) =>
              (!expenseCustody ||
                item.custodyId ===
                  expenseCustody) &&
              (!expenseCategory ||
                item.category ===
                  expenseCategory) &&
              (!expenseProject ||
                (expenseProject ===
                  "__general__"
                  ? !item.projectId
                  : item.projectId ===
                    expenseProject)) &&
              (!expenseFrom ||
                item.date >=
                  expenseFrom) &&
              (!expenseTo ||
                item.date <=
                  expenseTo),
          ),
        ),
      [
        expenses,
        expenseProject,
        expenseCategory,
        expenseCustody,
        expenseFrom,
        expenseTo,
      ],
    );

  const expenseTotal =
    useMemo(
      () =>
        filteredExpenses.reduce(
          (sum, item) =>
            sum + item.amount,
          0,
        ),
      [filteredExpenses],
    );

  const incomingCustodyOptions =
    useMemo(
      () =>
        [...custodies].sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "ar",
            ),
        ),
      [custodies],
    );

  const selectedIncomingCustody =
    useMemo(
      () =>
        custodies.find(
          (item) =>
            item.id ===
            incomingCustody,
        ),
      [
        custodies,
        incomingCustody,
      ],
    );

  const incomingTransactions =
    useMemo(
      () =>
        incomingCustody
          ? transactions.filter(
              (tx) =>
                tx.custodyId ===
                  incomingCustody &&
                tx.type === "in",
            )
          : [],
      [
        transactions,
        incomingCustody,
      ],
    );

  const incomingSourceOptions =
    useMemo(() => {
      const values =
        incomingTransactions.map(
          (tx) =>
            incomingSource(
              tx,
              custodies,
            ),
        );

      return Array.from(
        new Set(values),
      )
        .sort((a, b) =>
          a.localeCompare(
            b,
            "ar",
          ),
        )
        .map((value) => ({
          value,
          label: value,
        }));
    }, [
      incomingTransactions,
      custodies,
    ]);

  const filteredIncoming =
    useMemo(
      () =>
        sortNewest(
          incomingTransactions.filter(
            (tx) => {
              const source =
                incomingSource(
                  tx,
                  custodies,
                );

              return (
                (!incomingSourceFilter ||
                  source ===
                    incomingSourceFilter) &&
                (!incomingFrom ||
                  tx.date >=
                    incomingFrom) &&
                (!incomingTo ||
                  tx.date <=
                    incomingTo)
              );
            },
          ),
        ),
      [
        incomingTransactions,
        custodies,
        incomingSourceFilter,
        incomingFrom,
        incomingTo,
      ],
    );

  const incomingTotal =
    useMemo(
      () =>
        filteredIncoming.reduce(
          (sum, tx) =>
            sum + tx.amount,
          0,
        ),
      [filteredIncoming],
    );

  /*
   * التحويلات الخارجة من المواقع.
   *
   * التحويل من موقع إلى موقع ليس مصروفًا فعليًا.
   * لذلك نعرضه كتقرير مستقل، ونحدد المشروع
   * من العهدة المرسلة نفسها وليس من projectId
   * الموجود على المعاملة؛ لأن المشروع المستلم قد
   * يكون هو الموجود في projectId في بعض الحركات.
   */
  const projectCustodyMap = useMemo(
    () =>
      new Map(
        custodies
          .filter((custody) => custody.type === "project")
          .map((custody) => [custody.id, custody]),
      ),
    [custodies],
  );

  const transferProjectOptions = useMemo(
    () =>
      [...projects].sort((a, b) =>
        a.name.localeCompare(b.name, "ar"),
      ),
    [projects],
  );

  const filteredOutgoingTransfers = useMemo(() => {
    const result = transactions.filter((tx) => {
      if (tx.type !== "transfer") {
        return false;
      }

      const sourceCustody = projectCustodyMap.get(
        tx.custodyId,
      );

      if (!sourceCustody) {
        return false;
      }

      return (
        (!transferProject ||
          sourceCustody.projectId === transferProject) &&
        (!transferFrom || tx.date >= transferFrom) &&
        (!transferTo || tx.date <= transferTo)
      );
    });

    return sortNewest(result);
  }, [
    transactions,
    projectCustodyMap,
    transferProject,
    transferFrom,
    transferTo,
  ]);

  const transferTotal = useMemo(
    () =>
      filteredOutgoingTransfers.reduce(
        (sum, tx) => sum + Math.abs(tx.amount),
        0,
      ),
    [filteredOutgoingTransfers],
  );

  const projectReportData = useMemo(() => {
    if (!projectReportProject) {
      return {
        custody: undefined as Custody | undefined,
        projectExpenses: [] as Expense[],
        projectTransactions: [] as CustodyTransaction[],
        incomingTransactions: [] as CustodyTransaction[],
        outgoingTransfers: [] as CustodyTransaction[],
        actualExpensesTotal: 0,
        incomingTotal: 0,
        outgoingTransfersTotal: 0,
        totalOutgoing: 0,
        balance: 0,
      };
    }

    const custody = getProjectCustody(projectReportProject);

    const projectExpenses = sortNewest(
      expenses.filter(
        (expense) =>
          expense.projectId === projectReportProject &&
          (!projectReportFrom || expense.date >= projectReportFrom) &&
          (!projectReportTo || expense.date <= projectReportTo),
      ),
    );

    const projectTransactions = custody
      ? sortNewest(
          transactions.filter(
            (tx) =>
              tx.custodyId === custody.id &&
              (!projectReportFrom || tx.date >= projectReportFrom) &&
              (!projectReportTo || tx.date <= projectReportTo),
          ),
        )
      : [];

    const incomingTransactions = projectTransactions.filter(
      (tx) => tx.type === "in",
    );

    const outgoingTransfers = projectTransactions.filter(
      (tx) => tx.type === "transfer",
    );

    const actualExpensesTotal = projectExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const incomingTotal = incomingTransactions.reduce(
      (sum, tx) => sum + Math.abs(tx.amount),
      0,
    );

    const outgoingTransfersTotal = outgoingTransfers.reduce(
      (sum, tx) => sum + Math.abs(tx.amount),
      0,
    );

    return {
      custody,
      projectExpenses,
      projectTransactions,
      incomingTransactions,
      outgoingTransfers,
      actualExpensesTotal,
      incomingTotal,
      outgoingTransfersTotal,
      totalOutgoing: actualExpensesTotal + outgoingTransfersTotal,
      balance: custody?.balance ?? 0,
    };
  }, [
    projectReportProject,
    projectReportFrom,
    projectReportTo,
    expenses,
    transactions,
  ]);

  const resetProjectReport = () => {
    setProjectReportProject("");
    setProjectReportFrom("");
    setProjectReportTo("");
  };

  useEffect(() => {
    if (
      expenseCustody &&
      !expenseCustodyOptions.some(
        (item) =>
          item.id ===
          expenseCustody,
      )
    ) {
      setExpenseCustody("");
      setExpenseCategory("");
      setExpenseProject("");
    }
  }, [
    expenseCustody,
    expenseCustodyOptions,
  ]);

  useEffect(() => {
    if (
      expenseCategory &&
      !expenseCategoryOptions.some(
        (item) =>
          item.value ===
          expenseCategory,
      )
    ) {
      setExpenseCategory("");
      setExpenseProject("");
    }
  }, [
    expenseCategory,
    expenseCategoryOptions,
  ]);

  useEffect(() => {
    if (
      expenseProject &&
      !expenseProjectOptions.some(
        (item) =>
          item.id ===
          expenseProject,
      )
    ) {
      setExpenseProject("");
    }
  }, [
    expenseProject,
    expenseProjectOptions,
  ]);

  useEffect(() => {
    if (
      incomingSourceFilter &&
      !incomingSourceOptions.some(
        (item) =>
          item.value ===
          incomingSourceFilter,
      )
    ) {
      setIncomingSourceFilter("");
    }
  }, [
    incomingSourceFilter,
    incomingSourceOptions,
  ]);

  const resetExpenses = () => {
    setExpenseProject("");
    setExpenseCategory("");
    setExpenseCustody("");
    setExpenseFrom("");
    setExpenseTo("");
  };

  const resetIncoming = () => {
    setIncomingCustody("");
    setIncomingSourceFilter("");
    setIncomingFrom("");
    setIncomingTo("");
  };

  const personReportOptions = useMemo(() => {
    return Array.from(
      new Set(
        custodies
          .flatMap((custody) => {
            if (custody.type === "person") {
              return custody.name.trim()
                ? [custody.name.trim()]
                : [];
            }

            const responsiblePerson =
              custody.responsiblePerson?.trim();

            return responsiblePerson
              ? [responsiblePerson]
              : [];
          }),
      ),
    ).sort((a, b) => a.localeCompare(b, "ar"));
  }, [custodies]);

  const personReportData = useMemo(() => {
    const selectedCustodies = custodies.filter(
      (custody) =>
        custody.responsiblePerson?.trim() === personReportName ||
        (custody.type === "person" &&
          custody.name.trim() === personReportName),
    );

    const selectedCustodyIds = new Set(selectedCustodies.map((custody) => custody.id));

    if (!personReportName) {return {
        custodies: [],
        actualExpensesTotal: 0,
        incomingTotal: 0,
        incomingTransfersTotal: 0,
        outgoingTransfersTotal: 0,
        totalOutgoing: 0,
        balance: 0,
        movements: [] as Array<{ id: string; date: string; createdAt: string; custodyName: string; projectName: string; type: "in" | "expense" | "transfer-in" | "transfer-out"; description: string; source: string; amount: number }>,
      };
    }

    const movementList: Array<{
      id: string;
      date: string;
      createdAt: string;
      custodyName: string;
      projectName: string;
      type: "in" | "expense" | "transfer-in" | "transfer-out";
      description: string;
      source: string;
      amount: number;
    }> = [];

    expenses.forEach((expense) => {
      if (!selectedCustodyIds.has(expense.custodyId)) return;
      if (personReportFrom && expense.date < personReportFrom) return;
      if (personReportTo && expense.date > personReportTo) return;

      const custody = selectedCustodies.find((item) => item.id === expense.custodyId);

      movementList.push({
        id: `person-expense-${expense.id}`,
        date: expense.date,
        createdAt: expense.createdAt,
        custodyName: custody?.name ?? "عهدة غير معروفة",
        projectName: expense.projectId ? projectName(expense.projectId, projects) : "مصروف عام",
        type: "expense",
        description: expense.description,
        source: custody?.name ?? "عهدة غير معروفة",
        amount: -Math.abs(expense.amount),
      });
    });

    transactions.forEach((tx) => {
      if (personReportFrom && tx.date < personReportFrom) return;
      if (personReportTo && tx.date > personReportTo) return;

      if (tx.type === "in" && selectedCustodyIds.has(tx.custodyId)) {
        const custody = selectedCustodies.find(
          (item) => item.id === tx.custodyId,
        );
        const project = custody?.projectId
          ? projectName(custody.projectId, projects)
          : "عهدة شخصية / عامة";

        movementList.push({
          id: `person-in-${tx.id}`,
          date: tx.date,
          createdAt: tx.createdAt,
          custodyName: custody?.name ?? "عهدة غير معروفة",
          projectName: project,
          type: tx.relatedCustodyId ? "transfer-in" : "in",
          description: tx.description,
          source: incomingSource(tx, custodies),
          amount: Math.abs(tx.amount),
        });
      }

      if (
        tx.type === "transfer" &&
        selectedCustodyIds.has(tx.custodyId)
      ) {
        const sourceCustody = selectedCustodies.find(
          (item) => item.id === tx.custodyId,
        );
        const destinationCustody = tx.relatedCustodyId
          ? custodies.find(
              (item) => item.id === tx.relatedCustodyId,
            )
          : undefined;

        movementList.push({
          id: `person-transfer-out-${tx.id}`,
          date: tx.date,
          createdAt: tx.createdAt,
          custodyName:
            sourceCustody?.name ?? "عهدة غير معروفة",
          projectName: sourceCustody?.projectId
            ? projectName(
                sourceCustody.projectId,
                projects,
              )
            : "عهدة شخصية / عامة",
          type: "transfer-out",
          description: tx.description,
          source:
            destinationCustody?.name ?? "جهة غير محددة",
          amount: -Math.abs(tx.amount),
        });
      }
    });

    const actualExpensesTotal = movementList
      .filter((movement) => movement.type === "expense")
      .reduce((sum, movement) => sum + Math.abs(movement.amount), 0);

    const incomingTotal = movementList
      .filter((movement) => movement.type === "in")
      .reduce((sum, movement) => sum + Math.abs(movement.amount), 0);

    const incomingTransfersTotal = movementList
      .filter((movement) => movement.type === "transfer-in")
      .reduce((sum, movement) => sum + Math.abs(movement.amount), 0);

    const outgoingTransfersTotal = movementList
      .filter((movement) => movement.type === "transfer-out")
      .reduce((sum, movement) => sum + Math.abs(movement.amount), 0);

    const balance = selectedCustodies.reduce((sum, custody) => sum + custody.balance, 0);

    return {
      custodies: selectedCustodies,
      actualExpensesTotal,
      incomingTotal,
      incomingTransfersTotal,
      outgoingTransfersTotal,
      totalOutgoing: actualExpensesTotal + outgoingTransfersTotal,
      balance,
      movements: sortNewest(movementList),
    };
  }, [
    personReportName,
    personReportFrom,
    personReportTo,
    custodies,
    expenses,
    transactions,
    projects,
  ]);

  const resetPersonReport = () => {
    setPersonReportName("");
    setPersonReportFrom("");
    setPersonReportTo("");
  };

  const resetTransfers = () => {
    setTransferProject("");
    setTransferFrom("");
    setTransferTo("");
  };

  if (!loaded) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-bold text-slate-500 shadow-sm">
            جاري تحميل التقارير...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <WalletCards className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                  التقارير
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  تقارير الوارد والمصروفات مع
                  إمكانية التصفية حسب البيانات
                  الفعلية المسجلة.
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowRight className="h-4 w-4" />
              الرئيسية
            </Link>
          </div>
        </section>

        {/* Expenses Report */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ArrowUpRight className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    تقرير المصروفات
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    اختر العهدة الدافعة ثم تصنيف المصروف،
                    وبعدها يظهر لك المكان الذي اتصرف فيه.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetExpenses}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                مسح فلاتر المصروفات
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SelectBox
                id="expense-custody"
                label="العهدة الدافعة"
                value={expenseCustody}
                onChange={(value) => {
                  setExpenseCustody(value);
                  setExpenseCategory("");
                  setExpenseProject("");
                }}
                placeholder="اختر العهدة الدافعة"
                options={expenseCustodyOptions.map(
                  (item) => ({
                    value: item.id,
                    label: item.name,
                  }),
                )}
              />

              <SelectBox
                id="expense-category"
                label="تصنيف المصروف"
                value={expenseCategory}
                onChange={(value) => {
                  setExpenseCategory(value);
                  setExpenseProject("");
                }}
                placeholder={
                  expenseCustody
                    ? "كل التصنيفات"
                    : "اختر العهدة الدافعة أولًا"
                }
                options={
                  expenseCategoryOptions
                }
                disabled={!expenseCustody}
              />

              <SelectBox
                id="expense-project"
                label="المكان / المشروع"
                value={expenseProject}
                onChange={setExpenseProject}
                placeholder={
                  expenseCustody &&
                  expenseCategory
                    ? "كل الأماكن"
                    : "اختر العهدة والتصنيف أولًا"
                }
                options={expenseProjectOptions.map(
                  (item) => ({
                    value: item.id,
                    label: item.name,
                  }),
                )}
                disabled={
                  !expenseCustody ||
                  !expenseCategory
                }
              />

              <DateBox
                id="expense-from"
                label="من تاريخ"
                value={expenseFrom}
                onChange={setExpenseFrom}
              />

              <DateBox
                id="expense-to"
                label="إلى تاريخ"
                value={expenseTo}
                onChange={setExpenseTo}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400">
                عدد المصروفات
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {filteredExpenses.length}
              </p>
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <p className="text-xs font-bold text-red-500">
                إجمالي المصروفات
              </p>

              <p className="mt-2 text-2xl font-extrabold text-red-600">
                {money(expenseTotal)}{" "}
                <span className="text-xs">
                  جنيه
                </span>
              </p>
            </div>
          </div>

          <div>
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h3 className="font-extrabold text-slate-900">
                قائمة المصروفات
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                كل صف هنا مطابق للفلاتر المختارة.
              </p>
            </div>

            {!filteredExpenses.length ? (
              <EmptyState text="لا توجد مصروفات مطابقة للفلاتر الحالية." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      {[
                        "التاريخ",
                        "المشروع / الموقع",
                        "العهدة الدافعة",
                        "وسيلة الدفع",
                        "التصنيف",
                        "البيان",
                        "المبلغ",
                      ].map(
                        (title) => (
                          <th
                            key={title}
                            className="px-5 py-4 text-right text-xs font-extrabold text-slate-500"
                          >
                            {title}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredExpenses.map(
                      (expense) => {
                        const custody =
                          custodies.find(
                            (item) =>
                              item.id ===
                              expense.custodyId,
                          );

                        return (
                          <tr
                            key={expense.id}
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                          >
                            <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                              {dateLabel(
                                expense.date,
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm font-bold text-slate-700">
                              {projectName(
                                expense.projectId,
                                projects,
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                              {custody?.name ??
                                "عهدة غير موجودة"}
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700">
                                {financialAccountName(
                                  expense.financialAccountId,
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">
                                {expense.category ||
                                  "غير مصنف"}
                              </span>
                            </td>

                        <td className="max-w-[360px] px-5 py-4 text-sm font-semibold leading-6 text-slate-700">
                              {expense.description ||
                                "-"}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-left text-sm font-extrabold text-red-600">
                              {money(
                                expense.amount,
                              )}{" "}
                              <span className="text-[11px]">
                                جنيه
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
          </div>
        </section>

        {/* Incoming Report */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    تقرير وارد العهد
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    اختر عهدة فعلية ثم اختر مصدرًا موجودًا فعليًا في واردها.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetIncoming}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                مسح فلاتر الوارد
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectBox
                id="incoming-custody"
                label="العهدة"
                value={incomingCustody}
                onChange={(value) => {
                  setIncomingCustody(
                    value,
                  );
                  setIncomingSourceFilter(
                    "",
                  );
                }}
                placeholder="اختر العهدة"
                options={incomingCustodyOptions.map(
                  (item) => ({
                    value: item.id,
                    label: item.name,
                  }),
                )}
              />

              <SelectBox
                id="incoming-source"
                label="مصدر الوارد"
                value={incomingSourceFilter}
                onChange={
                  setIncomingSourceFilter
                }
                placeholder={
                  incomingCustody
                    ? "كل مصادر الوارد"
                    : "اختر العهدة أولًا"
                }
                options={
                  incomingSourceOptions
                }
                disabled={
                  !incomingCustody
                }
              />

              <DateBox
                id="incoming-from"
                label="من تاريخ"
                value={incomingFrom}
                onChange={setIncomingFrom}
              />

              <DateBox
                id="incoming-to"
                label="إلى تاريخ"
                value={incomingTo}
                onChange={setIncomingTo}
              />
            </div>

            {incomingCustody && (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                <p className="text-xs font-bold text-emerald-700">
                  العهدة المختارة
                </p>

                <p className="mt-1 text-sm font-extrabold text-slate-800">
                  {selectedIncomingCustody?.name ??
                    "عهدة غير موجودة"}
                </p>

                <p className="mt-1 text-[11px] text-emerald-700">
                  مصادر القائمة مستخرجة من حركات الوارد الفعلية لهذه العهدة.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400">
                عدد حركات الوارد
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {incomingCustody
                  ? filteredIncoming.length
                  : 0}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="text-xs font-bold text-emerald-600">
                إجمالي الوارد
              </p>

              <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                {money(
                  incomingCustody
                    ? incomingTotal
                    : 0,
                )}{" "}
                <span className="text-xs">
                  جنيه
                </span>
              </p>
            </div>
          </div>

          <div>
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h3 className="font-extrabold text-slate-900">
                قائمة وارد العهدة
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                النتائج مأخوذة من سجل الوارد الحقيقي للعهدة.
              </p>
            </div>

            {!incomingCustody ? (
              <EmptyState text="اختر العهدة أولًا لعرض واردها ومصادره الفعلية." />
            ) : !filteredIncoming.length ? (
              <EmptyState text="لا توجد حركات وارد مطابقة للفلاتر الحالية." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      {[
                        "التاريخ",
                        "العهدة",
                        "مصدر الوارد",
                        "وسيلة الدفع",
                        "البيان",
                        "المبلغ",
                      ].map(
                        (title) => (
                          <th
                            key={title}
                            className="px-5 py-4 text-right text-xs font-extrabold text-slate-500"
                          >
                            {title}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredIncoming.map(
                      (tx) => (
                        <tr
                          key={tx.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {dateLabel(
                              tx.date,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {selectedIncomingCustody?.name ??
                              "-"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
                              {incomingSource(
                                tx,
                                custodies,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700">
                              {financialAccountName(tx.financialAccountId)}
                            </span>
                          </td>

                          <td className="max-w-[380px] px-5 py-4 text-sm font-semibold leading-6 text-slate-700">
                            {tx.description ||
                              "-"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-left text-sm font-extrabold text-emerald-600">
                            +
                            {money(
                              tx.amount,
                            )}{" "}
                            <span className="text-[11px]">
                              جنيه
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-emerald-50/60">
                      <td
                        colSpan={6}
                        className="px-5 py-4 text-right text-sm font-extrabold text-slate-700"
                      >
                        إجمالي الوارد الظاهر
                      </td>

                      <td className="px-5 py-4 text-left text-sm font-extrabold text-emerald-700">
                        {money(
                          incomingTotal,
                        )}{" "}
                        جنيه
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Outgoing Transfers Report */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ArrowUpRight className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    تقرير التحويلات الخارجة من المواقع
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    التحويل من موقع إلى موقع يظهر هنا كخروج من الموقع المرسل، وليس كمصروف فعلي.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetTransfers}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                مسح فلاتر التحويلات
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SelectBox
                id="transfer-project"
                label="المشروع / الموقع المرسل"
                value={transferProject}
                onChange={setTransferProject}
                placeholder="كل المشاريع والمواقع"
                options={transferProjectOptions.map(
                  (project) => ({
                    value: project.id,
                    label: project.name,
                  }),
                )}
              />

              <DateBox
                id="transfer-from"
                label="من تاريخ"
                value={transferFrom}
                onChange={setTransferFrom}
              />

              <DateBox
                id="transfer-to"
                label="إلى تاريخ"
                value={transferTo}
                onChange={setTransferTo}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400">
                عدد التحويلات الخارجة
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {filteredOutgoingTransfers.length}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
              <p className="text-xs font-bold text-amber-600">
                إجمالي التحويلات الخارجة
              </p>

              <p className="mt-2 text-2xl font-extrabold text-amber-600">
                {money(transferTotal)}{" "}
                <span className="text-xs">
                  جنيه
                </span>
              </p>
            </div>
          </div>

          <div>
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h3 className="font-extrabold text-slate-900">
                قائمة التحويلات الخارجة
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                المبلغ هنا يقلل رصيد الموقع المرسل، لكنه لا يضاف إلى المصروفات الفعلية.
              </p>
            </div>

            {!filteredOutgoingTransfers.length ? (
              <EmptyState text="لا توجد تحويلات خارجة مطابقة للفلاتر الحالية." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      {[
                        "التاريخ",
                        "المشروع / الموقع المرسل",
                        "العهدة المرسلة",
                        "العهدة المستلمة",
                        "وسيلة الدفع",
                        "البيان",
                        "المبلغ",
                      ].map((title) => (
                        <th
                          key={title}
                          className="px-5 py-4 text-right text-xs font-extrabold text-slate-500"
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOutgoingTransfers.map((tx) => {
                      const sourceCustody = custodies.find(
                        (custody) => custody.id === tx.custodyId,
                      );

                      const destinationCustody = tx.relatedCustodyId
                        ? custodies.find(
                            (custody) =>
                              custody.id === tx.relatedCustodyId,
                          )
                        : undefined;

                      return (
                        <tr
                          key={tx.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {dateLabel(tx.date)}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {sourceCustody?.projectId
                              ? projectName(
                                  sourceCustody.projectId,
                                  projects,
                                )
                              : "-"}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {sourceCustody?.name ??
                              "عهدة غير موجودة"}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {destinationCustody?.name ??
                              "غير محدد"}
                          </td>

                          <td className="max-w-[360px] px-5 py-4 text-sm font-semibold leading-6 text-slate-700">
                            {tx.description || "تحويل بين العهد"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-left text-sm font-extrabold text-amber-600">
                            -{money(Math.abs(tx.amount))}{" "}
                            <span className="text-[11px]">
                              جنيه
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className="bg-amber-50/60">
                      <td
                        colSpan={5}
                        className="px-5 py-4 text-right text-sm font-extrabold text-slate-700"
                      >
                        إجمالي التحويلات الخارجة الظاهرة
                      </td>

                      <td className="px-5 py-4 text-left text-sm font-extrabold text-amber-700">
                        {money(transferTotal)}{" "}
                        جنيه
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Project Full Report */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    التقرير الكامل للمشروع
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    تقرير موحد يوضح الوارد والمصروفات الفعلية والتحويلات الخارجة والرصيد الحالي للمشروع.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetProjectReport}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                مسح تقرير المشروع
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectBox
                id="project-report-project"
                label="المشروع / الموقع"
                value={projectReportProject}
                onChange={setProjectReportProject}
                placeholder="اختر المشروع / الموقع"
                options={projects
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, "ar"))
                  .map((project) => ({
                    value: project.id,
                    label: project.name,
                  }))}
              />

              <DateBox
                id="project-report-from"
                label="من تاريخ"
                value={projectReportFrom}
                onChange={setProjectReportFrom}
              />

              <DateBox
                id="project-report-to"
                label="إلى تاريخ"
                value={projectReportTo}
                onChange={setProjectReportTo}
              />
            </div>
          </div>

          {!projectReportProject ? (
            <EmptyState text="اختر المشروع أولًا لعرض التقرير المالي الكامل." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-bold text-blue-600">الرصيد الحالي</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">
                    {money(projectReportData.balance)}{" "}
                    <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="text-xs font-bold text-emerald-600">إجمالي الوارد</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                    {money(projectReportData.incomingTotal)}{" "}
                    <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
                  <p className="text-xs font-bold text-red-500">المصروفات الفعلية</p>
                  <p className="mt-2 text-2xl font-extrabold text-red-600">
                    {money(projectReportData.actualExpensesTotal)}{" "}
                    <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                  <p className="text-xs font-bold text-amber-600">التحويلات الخارجة</p>
                  <p className="mt-2 text-2xl font-extrabold text-amber-600">
                    {money(projectReportData.outgoingTransfersTotal)}{" "}
                    <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">إجمالي الخارج</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">
                    {money(projectReportData.totalOutgoing)}{" "}
                    <span className="text-xs">جنيه</span>
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    مصروف فعلي + تحويلات خارجة
                  </p>
                </div>
              </div>

              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900">
                      ملخص المشروع: {projectName(projectReportProject, projects)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">التحويلات لا تدخل ضمن المصروفات الفعلية، وتظهر كبند مستقل.
                    </p>
                  </div>

                  <Link
                    href={`/projects/${projectReportProject}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    تفاصيل المشروع
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      {[
                        "التاريخ",
                        "نوع الحركة",
                        "البيان",
                        "المصدر / الجهة",
                        "المبلغ",
                      ].map((title) => (
                        <th
                          key={title}
                          className="px-5 py-4 text-right text-xs font-extrabold text-slate-500"
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {[
                      ...projectReportData.projectExpenses.map((expense) => ({
                        id: `expense-${expense.id}`,
                        date: expense.date,
                        createdAt: expense.createdAt,
                        type: "expense" as const,
                        description: expense.description,
                        source:
                          custodies.find(
                            (custody) => custody.id === expense.custodyId,
                          )?.name ?? "عهدة غير موجودة",
                        amount: -Math.abs(expense.amount),
                      })),
                      ...projectReportData.projectTransactions
                        .filter(
                          (tx) =>
                            tx.type === "in" || tx.type === "transfer",
                        )
                        .map((tx) => ({
                          id: `transaction-${tx.id}`,
                          date: tx.date,
                          createdAt: tx.createdAt,
                          type: tx.type,
                          description: tx.description,
                          source:
                            tx.type === "in"
                              ? incomingSource(tx, custodies)
                              : tx.relatedCustodyId
                                ? custodies.find(
                                    (custody) =>
                                      custody.id ===
                                      tx.relatedCustodyId,
                                  )?.name ?? "عهدة غير محددة"
                                : "—",
                          amount:
                            tx.type === "transfer"
                              ? -Math.abs(tx.amount)
                              : Math.abs(tx.amount),
                        })),
                    ]
                      .sort(
                        (a, b) =>
                          b.date.localeCompare(a.date) ||
                          b.createdAt.localeCompare(a.createdAt),
                      )
                      .map((movement) => (
                        <tr
                          key={movement.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {dateLabel(movement.date)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                                movement.type === "in"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : movement.type === "transfer"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                              }`}
                            >
                              {movement.type === "in"
                                ? "وارد"
                                : movement.type === "transfer"
                                  ? "تحويل خارج"
                                  : "مصروف فعلي"}
                            </span>
                          </td>

                          <td className="max-w-[360px] px-5 py-4 text-sm font-semibold leading-6 text-slate-700">
                            {movement.description || "-"}
                          </td>

                          <td className="max-w-[260px] px-5 py-4 text-xs font-semibold leading-5 text-slate-500">
                            {movement.source}
                          </td>

                          <td
                            className={`whitespace-nowrap px-5 py-4 text-left text-sm font-extrabold ${
                              movement.amount > 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {movement.amount > 0 ? "+" : "-"}
                            {money(Math.abs(movement.amount))}{" "}
                            <span className="text-[11px]">جنيه</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>

                  <tfoot>
                    <tr className="bg-slate-50/70">
                      <td
                        colSpan={4}
                        className="px-5 py-4 text-right text-sm font-extrabold text-slate-700"
                      >
                        إجمالي الخارج من المشروع
                      </td>
                      <td className="px-5 py-4 text-left text-sm font-extrabold text-red-600">
                        {money(projectReportData.totalOutgoing)} جنيه
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>


        {/* Person Full Report */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    التقرير الكامل للشخص
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    تقرير موحد لكل العهد المسجلة باسم الشخص، مع الوارد والمصروفات والتحويلات والرصيد.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetPersonReport}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                مسح تقرير الشخص
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectBox
                id="person-report-person"
                label="الشخص / مسؤول العهدة"
                value={personReportName}
                onChange={setPersonReportName}
                placeholder="اختر الشخص"
                options={personReportOptions.map((name) => ({
                  value: name,
                  label: name,
                }))}
              />

              <DateBox
                id="person-report-from"
                label="من تاريخ"
                value={personReportFrom}
                onChange={setPersonReportFrom}
              />

              <DateBox
                id="person-report-to"
                label="إلى تاريخ"
                value={personReportTo}
                onChange={setPersonReportTo}
              />
            </div>
          </div>

          {!personReportName ? (
            <EmptyState text="اختر الشخص أولًا لعرض التقرير المالي الكامل." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-bold text-blue-600">الرصيد الحالي</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">
                    {money(personReportData.balance)} <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="text-xs font-bold text-emerald-600">إجمالي الوارد</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                    {money(personReportData.incomingTotal)} <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
                  <p className="text-xs font-bold text-red-500">المصروفات الفعلية</p>
                  <p className="mt-2 text-2xl font-extrabold text-red-600">
                    {money(personReportData.actualExpensesTotal)} <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                  <p className="text-xs font-bold text-amber-600">التحويلات الخارجة</p>
                  <p className="mt-2 text-2xl font-extrabold text-amber-600">
                    {money(personReportData.outgoingTransfersTotal)} <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
                  <p className="text-xs font-bold text-cyan-600">التحويلات الداخلة</p>
                  <p className="mt-2 text-2xl font-extrabold text-cyan-600">
                    {money(personReportData.incomingTransfersTotal)} <span className="text-xs">جنيه</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">إجمالي الخارج</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">
                    {money(personReportData.totalOutgoing)} <span className="text-xs">جنيه</span>
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    مصروف فعلي + تحويلات خارجة
                  </p>
                </div>
              </div>

              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h3 className="font-extrabold text-slate-900">
                  حساب: {personReportName}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  العهد المرتبطة بالشخص: {personReportData.custodies.map((item) => item.name).join("، ") || "لا توجد عهد"}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      {["التاريخ", "العهدة", "المشروع / الموقع", "نوع الحركة", "البيان", "المصدر / الجهة", "المبلغ"].map((title) => (
                        <th key={title} className="px-5 py-4 text-right text-xs font-extrabold text-slate-500">
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {personReportData.movements.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <EmptyState text="لا توجد حركات لهذا الشخص في الفترة المختارة." />
                        </td>
                      </tr>
                    ) : (
                      personReportData.movements.map((movement) => (
                        <tr key={movement.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {dateLabel(movement.date)}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {movement.custodyName}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {movement.projectName}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-bold ${movement.type === "in" ? "bg-emerald-50 text-emerald-700" : movement.type === "transfer-in" ? "bg-cyan-50 text-cyan-700" : movement.type === "transfer-out" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                              {movement.type === "in" ? "وارد" : movement.type === "transfer-in" ? "تحويل داخل" : movement.type === "transfer-out" ? "تحويل خارج" : "مصروف فعلي"}
                            </span>
                          </td>
                          <td className="max-w-[320px] px-5 py-4 text-sm font-semibold leading-6 text-slate-700">
                            {movement.description || "-"}
                          </td>
                          <td className="max-w-[240px] px-5 py-4 text-xs font-semibold leading-5 text-slate-500">
                            {movement.source}
                          </td>
                          <td className={`whitespace-nowrap px-5 py-4 text-left text-sm font-extrabold ${movement.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {movement.amount >= 0 ? "+" : "-"}{money(Math.abs(movement.amount))} <span className="text-[11px]">جنيه</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-slate-50/70">
                      <td colSpan={6} className="px-5 py-4 text-right text-sm font-extrabold text-slate-700">
                        إجمالي الخارج من حساب الشخص
                      </td>
                      <td className="px-5 py-4 text-left text-sm font-extrabold text-red-600">
                        {money(personReportData.totalOutgoing)} جنيه
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Current Filters Summary */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Filter className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                ملخص الفلاتر الحالية
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                يوضح لك ما تم اختياره في التقريرين.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              [
                "المكان / المشروع",
                expenseProject
                  ? expenseProject ===
                    "__general__"
                    ? "مصروف عام"
                    : projectName(
                        expenseProject,
                        projects,
                      )
                  : "كل الأماكن",
              ],
              [
                "تصنيف المصروف",
                expenseCategory ||
                  "كل التصنيفات",
              ],
              [
                "عهدة المصروفات",
                expenseCustody
                  ? custodies.find(
                      (item) =>
                        item.id ===
                        expenseCustody,
                    )?.name ??
                    "عهدة غير موجودة"
                  : "كل العهد",
              ],
              [
                "عهدة الوارد",
                incomingCustody
                  ? selectedIncomingCustody?.name ??
                    "عهدة غير موجودة"
                  : "لم يتم الاختيار",
              ],
              [
                "مصدر الوارد",
                incomingSourceFilter ||
                  "كل المصادر",
              ],
              [
                "مشروع التحويلات",
                transferProject
                  ? projectName(
                      transferProject,
                      projects,
                    )
                  : "كل المشاريع",
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-[11px] font-bold text-slate-400">
                    {label}
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-slate-700">
                    {value}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}