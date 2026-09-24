"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpLeft,
  CircleDollarSign,
  FileText,
  WalletCards,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import {
  updateCustodyBalance,
} from "@/lib/data/custodies";
import {
  addCustodyTransaction,
} from "@/lib/data/custody-transactions";
import {
  addExpense,
} from "@/lib/data/expenses";
import {
  getProjects,
} from "@/lib/data/projects";
import {
  getCustodyFinancialAccounts,
  getCustodyFinancialAccountById,
  updateCustodyFinancialAccountBalance,
} from "@/lib/data/custody-financial-accounts";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";

import type { CustodyTransactionType } from "@/types/custody-transaction";
import type { Project } from "@/types/project";

type MovementType = "in" | "out" | "transfer";

const movementTypes = [
  {
    value: "in" as MovementType,
    title: "وارد إليَّ",
    description: "مبلغ دخل إلى عهدتي من مصدر خارجي",
    icon: ArrowDownLeft,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "out" as MovementType,
    title: "خارج مني — مصروف",
    description: "مبلغ خرج من عهدتي كمصروف فعلي",
    icon: ArrowUpLeft,
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
  {
    value: "transfer" as MovementType,
    title: "تحويل داخلي",
    description: "تحويل مبلغ بين وسائل الدفع داخل عهدتي أنا",
    icon: WalletCards,
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
  },
];


export default function NewCentralCustodyTransactionPage() {
  const [movementType, setMovementType] =
    useState<MovementType>("in");


  const [projects, setProjects] =
    useState<Project[]>([]);

  const [date, setDate] = useState("");

  const [amount, setAmount] = useState("");

  const [description, setDescription] =
    useState("");

  const [financialAccountId, setFinancialAccountId] =
    useState("");

  const [destinationFinancialAccountId, setDestinationFinancialAccountId] =
    useState("");

  const [financialAccounts, setFinancialAccounts] =
    useState<CustodyFinancialAccount[]>([]);


  const [source, setSource] =
    useState("");


  const [category, setCategory] =
    useState("");

  const [projectId, setProjectId] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  useEffect(() => {
    setProjects(getProjects());
    setFinancialAccounts(
      getCustodyFinancialAccounts("central"),
    );

    setDate(
      new Date()
        .toISOString()
        .split("T")[0],
    );
  }, []);


  const selectedMovement =
    movementTypes.find(
      (item) =>
        item.value === movementType,
    );



  const selectedProject =
    projects.find(
      (project) =>
        project.id === projectId,
    );

  const formatAmount = (
    value: number,
  ) => {
    return value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    );
  };

  const handleMovementTypeChange = (
    type: MovementType,
  ) => {
    setMovementType(type);
    setError("");

    if (type !== "in") {
      setSource("");
    }

    if (type !== "out") {
      setCategory("");
      setProjectId("");
    }
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const numericAmount =
      Number(amount);

    const trimmedDescription =
      description.trim();

    const trimmedCategory =
      category.trim();

    if (!date) {
      setError(
        "من فضلك اختر تاريخ الحركة.",
      );
      return;
    }

    if (
      !amount ||
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "من فضلك أدخل مبلغًا صحيحًا أكبر من صفر.",
      );
      return;
    }

    if (!trimmedDescription) {
      setError(
        "من فضلك أدخل بيان الحركة.",
      );
      return;
    }

    if (
      movementType === "in" &&
      !source.trim()
    ) {
      setError(
        "من فضلك اكتب مصدر المبلغ.",
      );
      return;
    }

    if (
      (movementType === "in" || movementType === "out") &&
      !financialAccountId
    ) {
      setError("من فضلك اختر وسيلة الدفع.");
      return;
    }

    if (
      movementType === "out" &&
      !trimmedCategory
    ) {
      setError(
        "من فضلك اكتب تصنيف المصروف.",
      );
      return;
    }

    if (
      movementType === "transfer" &&
      !financialAccountId
    ) {
      setError("من فضلك اختر وسيلة الدفع المرسلة.");
      return;
    }

    if (
      movementType === "transfer" &&
      !destinationFinancialAccountId
    ) {
      setError("من فضلك اختر وسيلة الدفع المستلمة.");
      return;
    }

    if (
      movementType === "transfer" &&
      financialAccountId === destinationFinancialAccountId
    ) {
      setError("اختر وسيلة دفع مختلفة في التحويل الداخلي.");
      return;
    }

    if (movementType === "transfer") {
      const sourceAccount = getCustodyFinancialAccountById(financialAccountId);

      if (!sourceAccount || sourceAccount.custodyId !== "central") {
        setError("وسيلة الدفع المرسلة غير صالحة.");
        return;
      }

      if (sourceAccount.balance < numericAmount) {
        setError("الرصيد المتاح في وسيلة الدفع المرسلة لا يكفي لإتمام التحويل.");
        return;
      }
    }

    if (
      movementType === "out" &&
      projectId &&
      !selectedProject
    ) {
      setError(
        "المشروع المختار غير موجود.",
      );
      return;
    }

    setError("");
    setIsSaving(true);

    const now =
      new Date().toISOString();

    /*
     * ================================
     * 1. وارد إليَّ
     * ================================
     */

    if (movementType === "in") {
      addCustodyTransaction({
        id: crypto.randomUUID(),
        custodyId: "central",
        type: "in" as CustodyTransactionType,
        amount: numericAmount,
        date,
        description:
          trimmedDescription,
        source: source.trim(),
        financialAccountId,
        createdAt: now,
        updatedAt: now,
      });

      updateCustodyBalance(
        "central",
        numericAmount,
        "in",
      );

      updateCustodyFinancialAccountBalance(
        financialAccountId,
        numericAmount,
        "in",
      );
    }

    /*
     * ================================
     * 2. خارج مني — مصروف
     * ================================
     */

    if (movementType === "out") {
      addExpense({
        id: crypto.randomUUID(),
        date,
        amount: numericAmount,
        category: trimmedCategory,
        description:
          trimmedDescription,
        custodyId: "central",
        financialAccountId,
        ...(projectId
          ? {
              projectId,
            }
          : {}),
        createdAt: now,
        updatedAt: now,
      });

      addCustodyTransaction({
        id: crypto.randomUUID(),
        custodyId: "central",
        type: "out" as CustodyTransactionType,
        amount: numericAmount,
        date,
        description:
          trimmedDescription,
        financialAccountId,
        ...(projectId
          ? {
              projectId,
            }
          : {}),
        createdAt: now,
        updatedAt: now,
      });

      updateCustodyBalance(
        "central",
        numericAmount,
        "out",
      );

      updateCustodyFinancialAccountBalance(
        financialAccountId,
        numericAmount,
        "out",
      );
    }

    /*
     * ================================
     * 3. تحويل داخلي
     * ================================
     *
     * التحويل هنا بين وسائل الدفع داخل عهدتي أنا فقط.
     * إجمالي رصيد العهدة لا يتغير.
     */

    if (
      movementType === "transfer" &&
      financialAccountId &&
      destinationFinancialAccountId
    ) {
      const outgoingTransactionId = crypto.randomUUID();
      const incomingTransactionId = crypto.randomUUID();

      addCustodyTransaction({
        id: outgoingTransactionId,
        custodyId: "central",
        type: "transfer" as CustodyTransactionType,
        amount: numericAmount,
        date,
        description: trimmedDescription,
        financialAccountId,
        relatedFinancialAccountId: destinationFinancialAccountId,
        relatedTransactionId: incomingTransactionId,
        createdAt: now,
        updatedAt: now,
      });

      addCustodyTransaction({
        id: incomingTransactionId,
        custodyId: "central",
        type: "in" as CustodyTransactionType,
        amount: numericAmount,
        date,
        description: trimmedDescription,
        source: "تحويل داخلي من وسيلة دفع أخرى",
        financialAccountId: destinationFinancialAccountId,
        relatedFinancialAccountId: financialAccountId,
        relatedTransactionId: outgoingTransactionId,
        createdAt: now,
        updatedAt: now,
      });

      updateCustodyFinancialAccountBalance(
        financialAccountId,
        numericAmount,
        "out",
      );

      updateCustodyFinancialAccountBalance(
        destinationFinancialAccountId,
        numericAmount,
        "in",
      );
    }

    void notes;

    /*
     * الرجوع إلى كشف عهدتي أنا
     */
    window.location.href =
      "/custodies/central";
  };

  return (
    <AppShell>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-5xl space-y-6"
      >
        {/* ================================
            Page Header
        ================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <Link
              href="/custodies/central"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
              aria-label="العودة إلى عهدتي أنا"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <WalletCards className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  عهدتي أنا
                </span>

                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                  تسجيل حركة
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                إضافة حركة عهدة
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                سجل المبالغ الواردة إلى عهدتك،
                المصروفات، أو التحويلات الداخلية بين وسائل الدفع الخاصة بك.
              </p>
            </div>
          </div>
        </section>

        {/* ================================
            Movement Type
        ================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-extrabold text-slate-900">
              نوع الحركة
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              اختر نوع العملية أولًا، وسيتم إظهار
              البيانات المناسبة لها.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {movementTypes.map(
              (item) => {
                const Icon = item.icon;

                const isSelected =
                  movementType ===
                  item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      handleMovementTypeChange(
                        item.value,
                      )
                    }
                    className={`relative flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-right transition-all duration-200 ${
                      isSelected
                        ? "border-slate-900 bg-slate-50 shadow-sm ring-2 ring-slate-900/5"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.className}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {item.description}
                      </p>
                    </div>

                    <span
                      className={`mr-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-slate-900 bg-slate-900"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* ================================
            Form
        ================================= */}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                {selectedMovement ? (
                  <selectedMovement.icon className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  بيانات الحركة
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  نوع الحركة:{" "}
                  {selectedMovement?.title}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="movement-date"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  تاريخ الحركة
                  <span className="mr-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="movement-date"
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-2 text-[11px] text-slate-400">
                  الشهر يتم تحديده تلقائيًا من
                  التاريخ.
                </p>
              </div>

              <div>
                <label
                  htmlFor="movement-amount"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  المبلغ
                  <span className="mr-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <input
                    id="movement-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value,
                      )
                    }
                    placeholder="0.00"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pl-16 text-left text-base font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    جنيه
                  </span>
                </div>
              </div>
            </div>

            {movementType === "in" && (
              <div>
                <label
                  htmlFor="movement-source"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  مصدر المبلغ
                  <span className="mr-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="movement-source"
                  type="text"
                  value={source}
                  onChange={(event) =>
                    setSource(event.target.value)
                  }
                  placeholder="مثال: الحاج نبيل، الحاج رمضان، أو أي مصدر آخر"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  اختر الشخص أو الجهة التي جاء
                  منها المبلغ.
                </p>
              </div>
            )}

            {(movementType === "in" || movementType === "out") && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="financial-account"
                    className="block text-sm font-bold text-slate-700"
                  >
                    وسيلة الدفع / الحساب
                    <span className="mr-1 text-red-500">*</span>
                  </label>
                  <Link
                    href="/custodies/accounts"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    + إدارة الوسائل
                  </Link>
                </div>
                <select
                  id="financial-account"
                  value={financialAccountId}
                  onChange={(event) => setFinancialAccountId(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="">اختر وسيلة الدفع</option>
                  {financialAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} — الرصيد {formatAmount(account.balance)} جنيه
                    </option>
                  ))}
                </select>
                {!financialAccounts.length && (
                  <p className="mt-2 text-xs font-semibold text-amber-600">
                    لا توجد وسيلة دفع لهذه العهدة. أنشئ واحدة أولًا.
                  </p>
                )}
              </div>
            )}

            {movementType === "out" && (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="movement-category"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    تصنيف المصروف
                    <span className="mr-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    id="movement-category"
                    type="text"
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value,
                      )
                    }
                    placeholder="مثال: معدات، مواصلات، صيانة..."
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <p className="mt-2 text-[11px] text-slate-400">
                    التصنيف حر ويمكنك كتابة أي بيان
                    يناسب المصروف.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="movement-project"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    المشروع / الموقع
                    <span className="mr-1 text-xs font-normal text-slate-400">
                      (اختياري)
                    </span>
                  </label>

                  <select
                    id="movement-project"
                    value={projectId}
                    onChange={(event) =>
                      setProjectId(
                        event.target.value,
                      )
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">
                      مصروف عام — بدون مشروع
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

                  <p className="mt-2 text-[11px] leading-5 text-slate-400">
                    لو المصروف خاص بمشروع، اختاره
                    عشان يظهر في حساب المشروع.
                  </p>
                </div>
              </div>
            )}

            {movementType ===
              "transfer" && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-bold text-slate-700">
                      من وسيلة دفع
                      <span className="mr-1 text-red-500">*</span>
                    </label>
                    <Link
                      href="/custodies/accounts"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      + إدارة الوسائل
                    </Link>
                  </div>

                  <select
                    value={financialAccountId}
                    onChange={(event) =>
                      setFinancialAccountId(event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">اختر وسيلة الدفع المرسلة</option>
                    {financialAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} — الرصيد {formatAmount(account.balance)} جنيه
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-bold text-slate-700">
                      إلى وسيلة دفع
                      <span className="mr-1 text-red-500">*</span>
                    </label>
                    <Link
                      href="/custodies/accounts"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      + إدارة الوسائل
                    </Link>
                  </div>

                  <select
                    value={destinationFinancialAccountId}
                    onChange={(event) =>
                      setDestinationFinancialAccountId(event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">اختر وسيلة الدفع المستلمة</option>
                    {financialAccounts
                      .filter((account) => account.id !== financialAccountId)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} — الرصيد {formatAmount(account.balance)} جنيه
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="movement-description"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                البيان
                <span className="mr-1 text-red-500">
                  *
                </span>
              </label>

              <textarea
                id="movement-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder={
                  movementType === "in"
                    ? "مثال: واصل من الحاج نبيل"
                    : movementType === "out"
                      ? "مثال: شراء مستلزمات للموقع"
                      : "مثال: تحويل من النقدية إلى InstaPay"
                }
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

              <p className="mt-2 text-[11px] text-slate-400">
                اكتب البيان بالشكل الذي تريد ظهوره
                في كشف الحساب.
              </p>
            </div>

            <div>
              <label
                htmlFor="movement-notes"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                ملاحظات
                <span className="mr-1 text-xs font-normal text-slate-400">
                  (اختياري)
                </span>
              </label>

              <textarea
                id="movement-notes"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
                rows={3}
                placeholder="أي ملاحظات إضافية على الحركة..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-semibold leading-6 text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-slate-500" />

                <p className="text-xs font-extrabold text-slate-700">
                  ملخص تأثير الحركة
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-400">
                    عهدتي أنا
                  </p>

                  <p
                    className={`mt-1 text-sm font-extrabold ${
                      movementType === "in"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {movementType === "in"
                      ? "+"
                      : "-"}
                    {amount || "0.00"} جنيه
                  </p>
                </div>

                <div className="rounded-xl border border-white bg-white p-3">
                  <p className="text-[11px] font-semibold text-slate-400">
                    {movementType === "in"
                      ? "مصدر المبلغ"
                      : movementType ===
                          "transfer"
                        ? "التحويل الداخلي"
                        : "المشروع"}
                  </p>

                  <p className="mt-1 truncate text-sm font-extrabold text-slate-700">
                    {movementType === "in"
                      ? source ||
                        "لم يتم الاختيار"
                      : movementType ===
                          "transfer"
                        ? financialAccounts.find(
                            (account) => account.id === financialAccountId,
                          )?.name || "لم يتم الاختيار"
                        : selectedProject
                            ?.name ||
                          "مصروف عام"}
                  </p>
                </div>
              </div>

              {movementType ===
                "transfer" && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-6 text-blue-700">
                  سيتم تحويل {formatAmount(Number(amount) || 0)} جنيه داخل عهدتي أنا من وسيلة الدفع المرسلة إلى وسيلة الدفع المستلمة، بدون تغيير إجمالي رصيد العهدة.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Link
              href="/custodies/central"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
            >
              إلغاء
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CircleDollarSign className="h-4 w-4" />

              {isSaving
                ? "جاري التسجيل..."
                : "تسجيل الحركة"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
