"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpLeft,
  CalendarDays,
  FileText,
  Filter,
  History,
  RotateCcw,
  Search,
  Wallet,
  WalletCards,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getCustodies,
  getCustodyById,
} from "@/lib/data/custodies";

import {
  getCustodyTransactionsByCustodyId,
} from "@/lib/data/custody-transactions";

import type { Custody } from "@/types/custody";

import type {
  CustodyTransaction,
} from "@/types/custody-transaction";
import { getCustodyFinancialAccounts } from "@/lib/data/custody-financial-accounts";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";

function formatAmount(
  amount: number,
): string {
  return new Intl.NumberFormat(
    "ar-EG",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

function formatDate(
  date: string,
): string {
  if (!date) {
    return "-";
  }

  const parts =
    date.split("-");

  if (
    parts.length !== 3
  ) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getTransactionLabel(
  transaction: CustodyTransaction,
): string {
  switch (
    transaction.type
  ) {
    case "in":
      return "وارد";

    case "out":
      return "صرف";

    case "transfer":
      return "تحويل";

    default:
      return "حركة";
  }
}

function getTransactionClasses(
  transaction: CustodyTransaction,
): string {
  switch (
    transaction.type
  ) {
    case "in":
      return "bg-emerald-50 text-emerald-700";

    case "out":
      return "bg-red-50 text-red-700";

    case "transfer":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getTransactionAmount(
  transaction: CustodyTransaction,
): number {
  if (
    transaction.type ===
      "out" ||
    transaction.type ===
      "transfer"
  ) {
    return -Math.abs(
      transaction.amount,
    );
  }

  return Math.abs(
    transaction.amount,
  );
}

export default function CentralCustodyPage() {
  const [custody, setCustody] =
    useState<
      Custody | undefined
    >();

  /*
   * مهم جدًا:
   *
   * البيانات محفوظة في localStorage.
   * لذلك لا نعرض نتيجة وجود/عدم وجود العهدة
   * إلا بعد تحميل البيانات على المتصفح.
   *
   * هذا يمنع Hydration Mismatch.
   */
  const [isHydrated, setIsHydrated] =
    useState(false);

  const [transactions, setTransactions] =
    useState<
      CustodyTransaction[]
    >([]);

  const [custodies, setCustodies] =
    useState<Custody[]>([]);

  const [financialAccounts, setFinancialAccounts] =
    useState<CustodyFinancialAccount[]>([]);

  /*
   * ============================================================
   * الفلاتر
   * ============================================================
   */

  const [sourceFilter, setSourceFilter] =
    useState("");

  const [destinationFilter, setDestinationFilter] =
    useState("");

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [movementType, setMovementType] =
    useState("");

  /*
   * ============================================================
   * تحميل البيانات
   * ============================================================
   */

  const loadData = () => {
    const currentCustody =
      getCustodyById(
        "central",
      );

    const currentTransactions =
      getCustodyTransactionsByCustodyId(
        "central",
      );

    const allCustodies =
      getCustodies();

    const sortedTransactions =
      [
        ...currentTransactions,
      ].sort(
        (a, b) => {
          const dateCompare =
            b.date.localeCompare(
              a.date,
            );

          if (
            dateCompare !== 0
          ) {
            return dateCompare;
          }

          return b.createdAt.localeCompare(
            a.createdAt,
          );
        },
      );

    setCustody(
      currentCustody,
    );

    setTransactions(
      sortedTransactions,
    );

    setCustodies(
      allCustodies,
    );

    setFinancialAccounts(
      getCustodyFinancialAccounts("central"),
    );
  };

  useEffect(() => {
    loadData();

    setIsHydrated(true);
  }, []);

  const financialAccountName = (id?: string) =>
    id
      ? financialAccounts.find((account) => account.id === id)?.name ?? "وسيلة دفع غير موجودة"
      : "غير محددة";

  /*
   * ============================================================
   * خريطة العهد
   * ============================================================
   */

  const custodyMap =
    useMemo(() => {
      return new Map(
        custodies.map(
          (item) => [
            item.id,
            item.name,
          ],
        ),
      );
    }, [custodies]);

  /*
   * ============================================================
   * مصادر الأموال
   * ============================================================
   *
   * الوارد:
   * transaction.source
   *
   * التحويل الخارجي:
   * transaction.fundingSource
   */

  const availableSources =
    useMemo(() => {
      const sources =
        new Set<string>();

      transactions.forEach(
        (transaction) => {
          const source =
            transaction.fundingSource?.trim() ||
            (
              transaction.type ===
              "in"
                ? transaction.source?.trim()
                : ""
            );

          if (source) {
            sources.add(
              source,
            );
          }
        },
      );

      return Array.from(
        sources,
      ).sort(
        (a, b) =>
          a.localeCompare(
            b,
            "ar",
          ),
      );
    }, [transactions]);

  /*
   * ============================================================
   * العهد التي أرسلنا إليها
   * ============================================================
   */

  const availableDestinations =
    useMemo(() => {
      const destinations =
        new Map<
          string,
          string
        >();

      transactions.forEach(
        (transaction) => {
          if (
            transaction.type !==
            "transfer"
          ) {
            return;
          }

          if (
            !transaction.relatedCustodyId
          ) {
            return;
          }

          const custodyName =
            custodyMap.get(
              transaction.relatedCustodyId,
            );

          if (
            custodyName
          ) {
            destinations.set(
              transaction.relatedCustodyId,
              custodyName,
            );
          }
        },
      );

      return Array.from(
        destinations.entries(),
      ).sort(
        (a, b) =>
          a[1].localeCompare(
            b[1],
            "ar",
          ),
      );
    }, [
      transactions,
      custodyMap,
    ]);

  /*
   * ============================================================
   * الحركات بعد الفلترة
   * ============================================================
   */

  const filteredTransactions =
    useMemo(() => {
      return transactions.filter(
        (transaction) => {

          /*
           * فلتر المصدر الأساسي
           *
           * في الوارد:
           * source
           *
           * في التحويل الخارجي:
           * fundingSource
           */

          if (
            sourceFilter
          ) {
            const transactionSource =
              transaction.fundingSource?.trim() ||
              (
                transaction.type ===
                "in"
                  ? transaction.source?.trim()
                  : ""
              );

            if (
              transactionSource !==
              sourceFilter
            ) {
              return false;
            }
          }

          /*
           * فلتر العهدة المستلمة
           */

          if (
            destinationFilter
          ) {
            if (
              transaction.type !==
              "transfer"
            ) {
              return false;
            }

            if (
              transaction.relatedCustodyId !==
              destinationFilter
            ) {
              return false;
            }
          }

          /*
           * من تاريخ
           */

          if (
            fromDate &&
            transaction.date <
              fromDate
          ) {
            return false;
          }

          /*
           * إلى تاريخ
           */

          if (
            toDate &&
            transaction.date >
              toDate
          ) {
            return false;
          }

          /*
           * نوع الحركة
           */

          if (
            movementType &&
            transaction.type !==
              movementType
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      transactions,
      sourceFilter,
      destinationFilter,
      fromDate,
      toDate,
      movementType,
    ]);

  /*
   * ============================================================
   * ملخص الحركات المفلترة
   * ============================================================
   */

  const filteredTotalIn =
    useMemo(() => {
      return filteredTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            "in",
        )
        .reduce(
          (
            total,
            transaction,
          ) =>
            total +
            Math.abs(
              transaction.amount,
            ),
          0,
        );
    }, [
      filteredTransactions,
    ]);

  const filteredTotalOut =
    useMemo(() => {
      return filteredTransactions
        .filter(
          (transaction) =>
            transaction.type ===
              "out" ||
            transaction.type ===
              "transfer",
        )
        .reduce(
          (
            total,
            transaction,
          ) =>
            total +
            Math.abs(
              transaction.amount,
            ),
          0,
        );
    }, [
      filteredTransactions,
    ]);

  const filteredTransfers =
    useMemo(() => {
      return filteredTransactions.filter(
        (transaction) =>
          transaction.type ===
          "transfer",
      );
    }, [
      filteredTransactions,
    ]);

  const filteredIncoming =
    useMemo(() => {
      return filteredTransactions.filter(
        (transaction) =>
          transaction.type ===
          "in",
      );
    }, [
      filteredTransactions,
    ]);

  const resetFilters =
    () => {
      setSourceFilter("");
      setDestinationFilter(
        "",
      );
      setFromDate("");
      setToDate("");
      setMovementType("");
    };

  const hasFilters =
    Boolean(
      sourceFilter,
    ) ||
    Boolean(
      destinationFilter,
    ) ||
    Boolean(
      fromDate,
    ) ||
    Boolean(
      toDate,
    ) ||
    Boolean(
      movementType,
    );

  /*
   * ============================================================
   * انتظار تحميل بيانات المتصفح
   * ============================================================
   *
   * localStorage غير موجود على السيرفر.
   * لذلك لا نحسم وجود العهدة إلا بعد hydration.
   */

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

            <p className="mt-4 text-sm font-semibold text-slate-500">
              جاري تحميل بيانات العهدة...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  /*
   * ============================================================
   * العهدة غير موجودة
   * ============================================================
   */

  if (!custody) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <WalletCards className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-lg font-extrabold text-slate-900">
              العهدة المركزية غير موجودة
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              لم يتم العثور على عهدتي أنا في النظام.
            </p>

            <Link
              href="/custodies"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              <ArrowRight className="h-4 w-4" />
              العودة إلى العهد
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">

        {/* ================================================== */}
        {/* Header */}
        {/* ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex min-w-0 items-start gap-3">

              <Link
                href="/custodies"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
                aria-label="العودة إلى العهد"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>

              <div className="min-w-0">

                <div className="mb-2 flex flex-wrap items-center gap-2">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Wallet className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-bold text-blue-600">
                    العهدة المركزية
                  </span>

                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                    نشطة
                  </span>
                </div>

                <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {custody.name}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  متابعة الأموال الداخلة إلى عهدتي أنا،
                  والتحويلات التي أرسلها إلى باقي العهد.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">

              <Link
                href="/reports?custody=central"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
              >
                <FileText className="h-4 w-4" />
                التقرير الكامل
              </Link>

              <Link
                href="/transfers/new?from=central"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
              >
                <WalletCards className="h-4 w-4" />
                تحويل من عهدتي
              </Link>

              <Link
                href="/custodies/accounts"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
              >
                تسجيل حركة
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* Summary */}
        {/* ================================================== */}

        <section>
          <div className="mb-4">

            <h2 className="text-lg font-extrabold text-slate-900">
              ملخص العهدة
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الوضع المالي الحالي لعهدتي أنا.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* Balance */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <WalletCards className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-400">
                  حالي
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                الرصيد الحالي
              </p>

              <p
                className={`mt-2 text-2xl font-extrabold tracking-tight ${
                  custody.balance < 0
                    ? "text-red-600"
                    : custody.balance > 0
                      ? "text-emerald-600"
                      : "text-slate-900"
                }`}
              >
                {formatAmount(
                  custody.balance,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            {/* Total In */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-600">
                  وارد
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي الداخل
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {formatAmount(
                  custody.totalIn,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            {/* Total Out */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ArrowUpLeft className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600">
                  خارج
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي الخارج
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {formatAmount(
                  custody.totalOut,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            {/* Operations */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <History className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-400">
                  حركة
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                عدد العمليات
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {transactions.length}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  عملية
                </span>
              </p>
            </div>
          </div>

          {/* Financial Accounts Balances */}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  أرصدة وسائل الدفع
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  الرصيد الحالي لكل وسيلة دفع داخل عهدتي أنا.
                </p>
              </div>

              <Link
                href="/custodies/accounts"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
              >
                إدارة وسائل الدفع
              </Link>
            </div>

            {financialAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-bold text-slate-500">
                  لا توجد وسائل دفع مسجلة حتى الآن
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  أضف محفظة أو نقدية أو InstaPay أو أي وسيلة دفع أخرى من إدارة وسائل الدفع.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {financialAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-700">
                          {account.name}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          رصيد وسيلة الدفع
                        </p>
                      </div>

                      <WalletCards className="h-5 w-5 shrink-0 text-slate-400" />
                    </div>

                    <p
                      className={`mt-4 text-xl font-extrabold tracking-tight ${
                        account.balance < 0
                          ? "text-red-600"
                          : account.balance > 0
                            ? "text-emerald-600"
                            : "text-slate-900"
                      }`}
                    >
                      {formatAmount(account.balance)}

                      <span className="mr-2 text-xs font-medium text-slate-400">
                        جنيه
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================================================== */}
        {/* Filters */}
        {/* ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Filter className="h-5 w-5" />
              </div>

              <div>

                <h2 className="text-base font-extrabold text-slate-900">
                  فلترة حركة عهدتي أنا
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  اعرض الأموال حسب مصدرها الأساسي أو التحويلات حسب العهدة
                  التي أرسلت إليها.
                </p>
              </div>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

            {/* Source */}

            <div>
              <label
                htmlFor="central-source-filter"
                className="mb-2 block text-xs font-bold text-slate-600"
              >
                مصدر الأموال الأساسي
              </label>

              <select
                id="central-source-filter"
                value={
                  sourceFilter
                }
                onChange={(event) =>
                  setSourceFilter(
                    event.target.value,
                  )
                }
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">
                  كل المصادر
                </option>

                {availableSources.map(
                  (source) => (
                    <option
                      key={
                        source
                      }
                      value={
                        source
                      }
                    >
                      {source}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Destination */}

            <div>
              <label
                htmlFor="central-destination-filter"
                className="mb-2 block text-xs font-bold text-slate-600"
              >
                العهدة المرسلة إليها
              </label>

              <select
                id="central-destination-filter"
                value={
                  destinationFilter
                }
                onChange={(event) =>
                  setDestinationFilter(
                    event.target.value,
                  )
                }
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">
                  كل العهد
                </option>

                {availableDestinations.map(
                  ([
                    id,
                    name,
                  ]) => (
                    <option
                      key={id}
                      value={id}
                    >
                      {name}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Movement Type */}

            <div>
              <label
                htmlFor="central-type-filter"
                className="mb-2 block text-xs font-bold text-slate-600"
              >
                نوع الحركة
              </label>

              <select
                id="central-type-filter"
                value={
                  movementType
                }
                onChange={(event) =>
                  setMovementType(
                    event.target.value,
                  )
                }
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">
                  كل الحركات
                </option>

                <option value="in">
                  وارد
                </option>

                <option value="out">
                  صرف
                </option>

                <option value="transfer">
                  تحويل لعهدة
                </option>
              </select>
            </div>

            {/* From Date */}

            <div>
              <label
                htmlFor="central-from-date"
                className="mb-2 block text-xs font-bold text-slate-600"
              >
                من تاريخ
              </label>

              <div className="relative">

                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="central-from-date"
                  type="date"
                  value={
                    fromDate
                  }
                  onChange={(event) =>
                    setFromDate(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-10 text-sm text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* To Date */}

            <div>
              <label
                htmlFor="central-to-date"
                className="mb-2 block text-xs font-bold text-slate-600"
              >
                إلى تاريخ
              </label>

              <div className="relative">

                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="central-to-date"
                  type="date"
                  value={
                    toDate
                  }
                  onChange={(event) =>
                    setToDate(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-10 text-sm text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>
          </div>

          {/* Active Filters */}

          {hasFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">

              <span className="text-xs font-bold text-slate-400">
                الفلاتر الحالية:
              </span>

              {sourceFilter && (
                <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  المصدر الأساسي:{" "}
                  {
                    sourceFilter
                  }
                </span>
              )}

              {destinationFilter && (
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  إلى:{" "}
                  {
                    custodyMap.get(
                      destinationFilter,
                    ) ??
                    "عهدة غير معروفة"
                  }
                </span>
              )}

              {movementType && (
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  النوع:{" "}
                  {movementType ===
                  "in"
                    ? "وارد"
                    : movementType ===
                        "out"
                      ? "صرف"
                      : "تحويل لعهدة"}
                </span>
              )}

              {fromDate && (
                <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                  من:{" "}
                  {formatDate(
                    fromDate,
                  )}
                </span>
              )}

              {toDate && (
                <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                  إلى:{" "}
                  {formatDate(
                    toDate,
                  )}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ================================================== */}
        {/* Filtered Summary */}
        {/* ================================================== */}

        {hasFilters && (
          <section>

            <div className="mb-4">

              <h2 className="text-lg font-extrabold text-slate-900">
                نتيجة الفلترة
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                الملخص التالي خاص بالحركات المطابقة للفلاتر الحالية فقط.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {/* Total In */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-bold text-slate-400">
                  إجمالي الوارد
                </p>

                <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                  {formatAmount(
                    filteredTotalIn,
                  )}

                  <span className="mr-2 text-xs font-medium text-slate-400">
                    جنيه
                  </span>
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  {
                    filteredIncoming.length
                  }{" "}
                  حركة وارد
                </p>
              </div>

              {/* Total Out */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-bold text-slate-400">
                  إجمالي الخارج
                </p>

                <p className="mt-2 text-2xl font-extrabold text-red-600">
                  {formatAmount(
                    filteredTotalOut,
                  )}

                  <span className="mr-2 text-xs font-medium text-slate-400">
                    جنيه
                  </span>
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  صرف + تحويل
                </p>
              </div>

              {/* Transfers */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-bold text-slate-400">
                  إجمالي التحويلات
                </p>

                <p className="mt-2 text-2xl font-extrabold text-blue-600">
                  {
                    filteredTransfers.length
                  }
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  تحويل لعهد أخرى
                </p>
              </div>

              {/* Count */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-bold text-slate-400">
                  عدد الحركات
                </p>

                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {
                    filteredTransactions.length
                  }
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  حركة مطابقة
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* Movement */}
        {/* ================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div>

              <h2 className="text-base font-extrabold text-slate-900">
                كشف حركة عهدتي أنا
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                جميع عمليات الاستلام والصرف والتحويل المسجلة على العهدة
                المركزية.
              </p>
            </div>

            <span className="flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
              <History className="h-3.5 w-3.5" />

              {
                filteredTransactions.length
              }{" "}
              حركة
            </span>
          </div>

          {filteredTransactions.length ===
          0 ? (
            <div className="flex min-h-60 items-center justify-center px-5 py-10">

              <div className="max-w-md text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-extrabold text-slate-700">
                  لا توجد حركات مطابقة
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  جرّب تغيير مصدر الأموال أو العهدة المستلمة أو الفترة
                  المحددة.
                </p>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    عرض كل الحركات
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[1000px] text-right">

                  <thead>

                    <tr className="border-b border-slate-100 bg-slate-50/70">

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        التاريخ
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        الحركة
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        البيان
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        المصدر
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        العهدة المستلمة
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        المبلغ
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {filteredTransactions.map(
                      (
                        transaction,
                      ) => {

                        const isIncoming =
                          transaction.type ===
                          "in";

                        const isTransfer =
                          transaction.type ===
                          "transfer";

                        const amount =
                          getTransactionAmount(
                            transaction,
                          );

                        const destinationName =
                          transaction.relatedCustodyId
                            ? custodyMap.get(
                                transaction.relatedCustodyId,
                              )
                            : undefined;

                        return (
                          <tr
                            key={
                              transaction.id
                            }
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                          >

                            <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                              {formatDate(
                                transaction.date,
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${getTransactionClasses(
                                  transaction,
                                )}`}
                              >

                                {isIncoming ? (
                                  <ArrowDownLeft className="h-3.5 w-3.5" />
                                ) : isTransfer ? (
                                  <WalletCards className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowUpLeft className="h-3.5 w-3.5" />
                                )}

                                {
                                  getTransactionLabel(
                                    transaction,
                                  )
                                }
                              </span>
                            </td>

                            <td className="max-w-[360px] px-5 py-4">

                              <p className="text-sm font-bold text-slate-800">
                                {
                                  transaction.description
                                }
                              </p>
                            </td>

                            <td className="max-w-[280px] px-5 py-4">

                              {isIncoming ||
                              transaction.fundingSource ? (
                                <span className="text-xs font-semibold text-emerald-700">
                                  <span className="block">
                                    {transaction.fundingSource ||
                                      transaction.source ||
                                      "مصدر غير محدد"}
                                  </span>
                                  <span className="mt-1 block text-[10px] text-blue-600">
                                    وسيلة الدفع: {financialAccountName(transaction.financialAccountId)}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="max-w-[260px] px-5 py-4">

                              {isTransfer ? (
                                <span className="text-xs font-semibold text-blue-700">
                                  {
                                    destinationName ||
                                    "عهدة غير معروفة"
                                  }
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">

                              <span
                                className={`text-sm font-extrabold ${
                                  amount >
                                  0
                                    ? "text-emerald-600"
                                    : amount <
                                        0
                                      ? "text-red-600"
                                      : "text-slate-600"
                                }`}
                              >
                                {amount >
                                0
                                  ? "+"
                                  : amount <
                                      0
                                    ? "-"
                                    : ""}

                                {formatAmount(
                                  Math.abs(
                                    amount,
                                  ),
                                )}{" "}
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

              {/* Mobile */}

              <div className="divide-y divide-slate-100 md:hidden">

                {filteredTransactions.map(
                  (
                    transaction,
                  ) => {

                    const isIncoming =
                      transaction.type ===
                      "in";

                    const isTransfer =
                      transaction.type ===
                      "transfer";

                    const amount =
                      getTransactionAmount(
                        transaction,
                      );

                    const destinationName =
                      transaction.relatedCustodyId
                        ? custodyMap.get(
                            transaction.relatedCustodyId,
                          )
                        : undefined;

                    return (
                      <div
                        key={
                          transaction.id
                        }
                        className="p-5"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="text-xs font-semibold text-slate-400">
                              {formatDate(
                                transaction.date,
                              )}
                            </p>

                            <p className="mt-1 text-sm font-extrabold text-slate-800">
                              {
                                transaction.description
                              }
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${getTransactionClasses(
                              transaction,
                            )}`}
                          >
                            {
                              getTransactionLabel(
                                transaction,
                              )
                            }
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2">

                          {(isIncoming ||
                            transaction.fundingSource) && (
                            <div className="rounded-xl bg-emerald-50/70 p-3">

                              <p className="text-[10px] font-bold text-emerald-600">
                                مصدر الأموال الأساسي
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-700">
                                {transaction.fundingSource ||
                                  transaction.source ||
                                  "مصدر غير محدد"}
                              </p>

                              <p className="mt-1 text-[10px] font-bold text-blue-600">
                                وسيلة الدفع: {financialAccountName(transaction.financialAccountId)}
                              </p>
                            </div>
                          )}

                          {isTransfer && (
                            <div className="rounded-xl bg-blue-50/70 p-3">

                              <p className="text-[10px] font-bold text-blue-600">
                                العهدة المرسلة إليها
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-700">
                                {
                                  destinationName ||
                                  "عهدة غير معروفة"
                                }
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">

                          <span className="text-xs font-semibold text-slate-400">
                            المبلغ
                          </span>

                          <span
                            className={`text-base font-extrabold ${
                              amount >
                              0
                                ? "text-emerald-600"
                                : amount <
                                    0
                                  ? "text-red-600"
                                  : "text-slate-600"
                            }`}
                          >
                            {amount >
                            0
                              ? "+"
                              : amount <
                                  0
                                ? "-"
                                : ""}

                            {formatAmount(
                              Math.abs(
                                amount,
                              ),
                            )}{" "}
                            جنيه
                          </span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}
        </section>

        {/* ================================================== */}
        {/* Explanation */}
        {/* ================================================== */}

        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <WalletCards className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-sm font-extrabold text-slate-800">
                طريقة قراءة عهدتي أنا
              </h2>

              <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
                الأموال الداخلة يمكن تصفيتها حسب مصدرها الأساسي، مثل
                الحاج نبيل أو الحاج رمضان أو أي مصدر آخر. وإذا تم تحويل
                مبلغ إلى عهدة أخرى وكان مصدره جهة خارجية، يظهر نفس المصدر
                على التحويل ويمكن تصفيته به. أما التحويل المباشر من رصيد
                عهدتي أنا فلا يكون له مصدر خارجي. ويمكن كذلك تصفية
                التحويلات حسب العهدة التي تم إرسال المبلغ إليها.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}