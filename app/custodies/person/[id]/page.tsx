"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Edit3,
  FileText,
  Filter,
  FolderKanban,
  Plus,
  ReceiptText,
  RotateCcw,
  Tag,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useParams } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { getCustodyById } from "@/lib/data/custodies";
import { getCustodyTransactionsByCustodyId } from "@/lib/data/custody-transactions";
import { getExpensesByCustodyId } from "@/lib/data/expenses";
import { getProjects } from "@/lib/data/projects";

import type { Custody } from "@/types/custody";
import type { CustodyTransaction } from "@/types/custody-transaction";
import type { Expense } from "@/types/expense";
import type { Project } from "@/types/project";

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "ar-EG",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );
}

export default function PersonCustodyDetailsPage() {
  const params = useParams();
  const custodyId = params.id as string;

  const [custody, setCustody] = useState<
    Custody | undefined
  >();

  const [transactions, setTransactions] = useState<
    CustodyTransaction[]
  >([]);

  const [expenses, setExpenses] = useState<Expense[]>(
    [],
  );

  const [projects, setProjects] = useState<Project[]>(
    [],
  );

  const [expenseFromDate, setExpenseFromDate] =
    useState("");

  const [expenseToDate, setExpenseToDate] =
    useState("");

  const [expenseCategory, setExpenseCategory] =
    useState("");

  const [expenseProjectId, setExpenseProjectId] =
    useState("");

  const loadData = () => {
    const currentCustody =
      getCustodyById(custodyId);

    const currentTransactions =
      getCustodyTransactionsByCustodyId(custodyId);

    const currentExpenses =
      getExpensesByCustodyId(custodyId);

    const currentProjects = getProjects();

    const sortedTransactions =
      [...currentTransactions].sort((a, b) => {
        const dateCompare =
          b.date.localeCompare(a.date);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return b.createdAt.localeCompare(a.createdAt);
      });

    const sortedExpenses = [...currentExpenses].sort(
      (a, b) => {
        const dateCompare =
          b.date.localeCompare(a.date);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return b.createdAt.localeCompare(a.createdAt);
      },
    );

    setCustody(currentCustody);
    setTransactions(sortedTransactions);
    setExpenses(sortedExpenses);
    setProjects(currentProjects);
  };

  useEffect(() => {
    loadData();
  }, [custodyId]);

  const totalIn = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.type === "in",
        )
        .reduce(
          (total, transaction) =>
            total + transaction.amount,
          0,
        ),
    [transactions],
  );

  const totalOut = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.type === "out",
        )
        .reduce(
          (total, transaction) =>
            total + transaction.amount,
          0,
        ),
    [transactions],
  );

  const availableExpenseCategories = useMemo(() => {
    return Array.from(
      new Set(
        expenses
          .map((expense) => expense.category.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) =>
      a.localeCompare(b, "ar"),
    );
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (
        expenseFromDate &&
        expense.date < expenseFromDate
      ) {
        return false;
      }

      if (
        expenseToDate &&
        expense.date > expenseToDate
      ) {
        return false;
      }

      if (
        expenseCategory &&
        expense.category !== expenseCategory
      ) {
        return false;
      }

      if (
        expenseProjectId &&
        expense.projectId !== expenseProjectId
      ) {
        return false;
      }

      return true;
    });
  }, [
    expenses,
    expenseFromDate,
    expenseToDate,
    expenseCategory,
    expenseProjectId,
  ]);

  const filteredExpensesTotal = useMemo(
    () =>
      filteredExpenses.reduce(
        (total, expense) =>
          total + expense.amount,
        0,
      ),
    [filteredExpenses],
  );

  const projectMap = useMemo(() => {
    return new Map(
      projects.map((project) => [
        project.id,
        project.name,
      ]),
    );
  }, [projects]);

  const resetExpenseFilters = () => {
    setExpenseFromDate("");
    setExpenseToDate("");
    setExpenseCategory("");
    setExpenseProjectId("");
  };

  const hasExpenseFilters =
    Boolean(expenseFromDate) ||
    Boolean(expenseToDate) ||
    Boolean(expenseCategory) ||
    Boolean(expenseProjectId);

  if (!custody) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UserRound className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-lg font-extrabold text-slate-900">
              العهدة غير موجودة
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              لم يتم العثور على العهدة الشخصية المطلوبة.
            </p>

            <Link
              href="/custodies/person"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              <ArrowRight className="h-4 w-4" />
              العودة إلى العهد الشخصية
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href="/custodies/person"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
                aria-label="العودة إلى العهد الشخصية"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-bold text-blue-600">
                    كشف العهدة
                  </span>

                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                    نشطة
                  </span>
                </div>

                <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {custody.name}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  متابعة رصيد العهدة وحركتها المالية
                  والمصروفات المرتبطة بها.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/custodies/person/${custodyId}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
              >
                <Edit3 className="h-4 w-4" />
                تعديل العهدة
              </Link>

              <Link
                href={`/custodies/person/${custodyId}/new`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                تسجيل حركة
              </Link>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              ملخص العهدة
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الوضع المالي الحالي لـ {custody.name}.
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
                    : "text-slate-900"
                }`}
              >
                {formatAmount(custody.balance)}{" "}
                <span className="text-xs font-semibold text-slate-400">
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
                  داخل
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي الوارد
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-600">
                {formatAmount(totalIn)}{" "}
                <span className="text-xs font-semibold text-slate-400">
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
                إجمالي المنصرف
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-red-600">
                {formatAmount(totalOut)}{" "}
                <span className="text-xs font-semibold text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            {/* Transactions Count */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <FileText className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-400">
                  حركة
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                عدد الحركات
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {transactions.length}
              </p>
            </div>
          </div>
        </section>

        {/* Transactions */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  حركة العهدة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  جميع عمليات الاستلام والصرف والتحويل
                  الخاصة بالعهدة.
                </p>
              </div>

              <Link
                href={`/custodies/person/${custodyId}/new`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                تسجيل حركة
              </Link>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="flex min-h-60 items-center justify-center px-5 py-10">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-extrabold text-slate-800">
                  لا توجد حركات حتى الآن
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  لم يتم تسجيل أي حركة مالية على هذه
                  العهدة حتى الآن.
                </p>

                <Link
                  href={`/custodies/person/${custodyId}/new`}
                  className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  تسجيل أول حركة
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      التاريخ
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      النوع
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      البيان
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      المصدر
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      المبلغ
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => {
                    const isIn =
                      transaction.type === "in";

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                          {formatDate(transaction.date)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                              isIn
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {isIn ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpLeft className="h-3.5 w-3.5" />
                            )}

                            {isIn
                              ? "وارد"
                              : transaction.type ===
                                "transfer"
                              ? "تحويل"
                              : "منصرف"}
                          </span>
                        </td>

                        <td className="max-w-[420px] px-5 py-4">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {transaction.description}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-xs font-semibold text-slate-500">
                            {transaction.source || "—"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`text-sm font-extrabold ${
                              isIn
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {isIn ? "+" : "-"}
                            {formatAmount(
                              transaction.amount,
                            )}{" "}
                            جنيه
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Expenses */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <ReceiptText className="h-5 w-5" />
                  </div>

                  <h2 className="text-lg font-extrabold text-slate-900">
                    مصروفات العهدة
                  </h2>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  فلترة وتحليل المصروفات المسجلة على هذه
                  العهدة حسب الفترة والتصنيف والمشروع.
                </p>
              </div>

              <Link
                href="/expenses/new"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                تسجيل مصروف
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />

              <h3 className="text-sm font-extrabold text-slate-700">
                فلترة المصروفات
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* From Date */}
              <div>
                <label
                  htmlFor="expense-from-date"
                  className="mb-1.5 block text-[11px] font-bold text-slate-500"
                >
                  من تاريخ
                </label>

                <input
                  id="expense-from-date"
                  type="date"
                  value={expenseFromDate}
                  onChange={(event) =>
                    setExpenseFromDate(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* To Date */}
              <div>
                <label
                  htmlFor="expense-to-date"
                  className="mb-1.5 block text-[11px] font-bold text-slate-500"
                >
                  إلى تاريخ
                </label>

                <input
                  id="expense-to-date"
                  type="date"
                  value={expenseToDate}
                  onChange={(event) =>
                    setExpenseToDate(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="expense-category-filter"
                  className="mb-1.5 block text-[11px] font-bold text-slate-500"
                >
                  التصنيف
                </label>

                <div className="relative">
                  <Tag className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />

                  <select
                    id="expense-category-filter"
                    value={expenseCategory}
                    onChange={(event) =>
                      setExpenseCategory(
                        event.target.value,
                      )
                    }
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-xs text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  >
                    <option value="">
                      كل التصنيفات
                    </option>

                    {availableExpenseCategories.map(
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
                </div>
              </div>

              {/* Project */}
              <div>
                <label
                  htmlFor="expense-project-filter"
                  className="mb-1.5 block text-[11px] font-bold text-slate-500"
                >
                  المشروع / الموقع
                </label>

                <div className="relative">
                  <FolderKanban className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />

                  <select
                    id="expense-project-filter"
                    value={expenseProjectId}
                    onChange={(event) =>
                      setExpenseProjectId(
                        event.target.value,
                      )
                    }
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-xs text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  >
                    <option value="">
                      كل المشاريع
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
                </div>
              </div>
            </div>

            {hasExpenseFilters && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={resetExpenseFilters}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  إعادة ضبط الفلاتر
                </button>
              </div>
            )}
          </div>

          {/* Expense Summary */}
          <div className="px-5 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[11px] font-semibold text-slate-400">
                  إجمالي المصروفات
                </p>

                <p className="mt-1 text-lg font-extrabold text-red-600">
                  {formatAmount(
                    filteredExpensesTotal,
                  )}{" "}
                  <span className="text-[10px] font-semibold text-slate-400">
                    جنيه
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[11px] font-semibold text-slate-400">
                  عدد المصروفات
                </p>

                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  {filteredExpenses.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[11px] font-semibold text-slate-400">
                  متوسط المصروف
                </p>

                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  {filteredExpenses.length > 0
                    ? formatAmount(
                        filteredExpensesTotal /
                          filteredExpenses.length,
                      )
                    : "0"}{" "}
                  <span className="text-[10px] font-semibold text-slate-400">
                    جنيه
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Expenses Empty */}
          {filteredExpenses.length === 0 ? (
            <div className="flex min-h-60 items-center justify-center px-5 py-10">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ReceiptText className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-extrabold text-slate-800">
                  لا توجد مصروفات مطابقة
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {hasExpenseFilters
                    ? "لا توجد مصروفات تطابق الفلاتر المحددة."
                    : "لم يتم تسجيل أي مصروف على هذه العهدة حتى الآن."}
                </p>

                {hasExpenseFilters && (
                  <button
                    type="button"
                    onClick={resetExpenseFilters}
                    className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    عرض كل المصروفات
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      التاريخ
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      التصنيف
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      البيان
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      المشروع / الموقع
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      المبلغ
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(expense.date)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700">
                          <Tag className="h-3.5 w-3.5" />
                          {expense.category}
                        </span>
                      </td>

                      <td className="max-w-[420px] px-5 py-4">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {expense.description}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {expense.projectId ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                            {projectMap.get(
                              expense.projectId,
                            ) || "مشروع غير معروف"}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            مصروف عام
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="text-sm font-extrabold text-red-600">
                          {formatAmount(
                            expense.amount,
                          )}{" "}
                          جنيه
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/70">
                    <td
                      colSpan={4}
                      className="px-5 py-4 text-sm font-extrabold text-slate-700"
                    >
                      إجمالي المصروفات بعد الفلترة
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-base font-extrabold text-red-600">
                      {formatAmount(
                        filteredExpensesTotal,
                      )}{" "}
                      جنيه
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Note */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <WalletCards className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
                طبيعة العهدة
              </h2>

              <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
                هذه العهدة مستقلة عن حساب المصروفات وحساب
                العامل أو المقاول. استلام مبلغ يزيد رصيدها،
                بينما الصرف أو التحويل يقلل الرصيد. وتعديل
                بيانات العهدة لا يؤثر على الحركات المالية
                السابقة.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}