"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  FolderKanban,
  ReceiptText,
  Users,
  WalletCards,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getCustodies,
} from "@/lib/data/custodies";

import {
  getCustodyTransactions,
} from "@/lib/data/custody-transactions";

import {
  getExpenses,
} from "@/lib/data/expenses";

import {
  getProjects,
} from "@/lib/data/projects";

import type { Custody } from "@/types/custody";
import type { CustodyTransaction } from "@/types/custody-transaction";
import type { Expense } from "@/types/expense";
import type { Project } from "@/types/project";

function formatAmount(
  amount: number,
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

function formatDate(
  date?: string,
): string {
  if (!date) {
    return "-";
  }

  const parts =
    date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getTransactionLabel(
  type: CustodyTransaction["type"],
): string {
  switch (type) {
    case "in":
      return "وارد";

    case "out":
      return "خارج";

    case "transfer":
      return "تحويل";

    default:
      return "حركة";
  }
}

function getTransactionClasses(
  type: CustodyTransaction["type"],
): string {
  switch (type) {
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
    transaction.type === "out" ||
    transaction.type === "transfer"
  ) {
    return -Math.abs(
      transaction.amount,
    );
  }

  return Math.abs(
    transaction.amount,
  );
}

export default function DashboardPage() {
  const [custodies, setCustodies] =
    useState<Custody[]>([]);

  const [transactions, setTransactions] =
    useState<CustodyTransaction[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const loadDashboardData = () => {
    const allCustodies =
      getCustodies();

    const allTransactions =
      getCustodyTransactions();

    const allExpenses =
      getExpenses();

    const allProjects =
      getProjects();

    setCustodies(
      allCustodies,
    );

    setTransactions(
      allTransactions,
    );

    setExpenses(
      allExpenses,
    );

    setProjects(
      allProjects,
    );

    setIsLoaded(true);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalCustodyBalance =
    useMemo(() => {
      return custodies.reduce(
        (total, custody) =>
          total +
          Number(
            custody.balance ?? 0,
          ),
        0,
      );
    }, [custodies]);

  const totalProjectExpenses =
    useMemo(() => {
      return expenses
        .filter(
          (expense) =>
            Boolean(
              expense.projectId,
            ),
        )
        .reduce(
          (total, expense) =>
            total +
            Number(
              expense.amount ?? 0,
            ),
          0,
        );
    }, [expenses]);

  const projectsCount =
    projects.length;

  const workersCount = 0;

  const totalIncoming =
    useMemo(() => {
      return transactions
        .filter(
          (transaction) =>
            transaction.type ===
            "in",
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amount ?? 0,
            ),
          0,
        );
    }, [transactions]);

  const totalOutgoing =
    useMemo(() => {
      return transactions
        .filter(
          (transaction) =>
            transaction.type ===
              "out" ||
            transaction.type ===
              "transfer",
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amount ?? 0,
            ),
          0,
        );
    }, [transactions]);

  const custodyMap =
    useMemo(() => {
      return new Map(
        custodies.map(
          (custody) => [
            custody.id,
            custody.name,
          ],
        ),
      );
    }, [custodies]);

  const projectMap =
    useMemo(() => {
      return new Map(
        projects.map(
          (project) => [
            project.id,
            project.name,
          ],
        ),
      );
    }, [projects]);

  const latestTransactions =
    useMemo(() => {
      return [
        ...transactions,
      ]
        .sort(
          (a, b) => {
            const dateCompare =
              b.date.localeCompare(
                a.date,
              );

            if (
              dateCompare !==
              0
            ) {
              return dateCompare;
            }

            return b.createdAt.localeCompare(
              a.createdAt,
            );
          },
        )
        .slice(0, 6);
    }, [transactions]);

  const latestProjects =
    useMemo(() => {
      return [
        ...projects,
      ]
        .sort(
          (a, b) =>
            b.updatedAt.localeCompare(
              a.updatedAt,
            ),
        )
        .slice(0, 5);
    }, [projects]);

  const expensesCount =
    expenses.length;

  const latestTransactionDate =
    latestTransactions[0]?.date;

  if (!isLoaded) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-bold text-slate-500">
            جاري تحميل لوحة التحكم...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">
                  النظام المحاسبي
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                لوحة التحكم
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                نظرة سريعة على العهد، المشاريع،
                المصروفات، والبيانات المالية الحالية.
              </p>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400">
                  حالة النظام
                </p>

                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  النظام يعمل
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              الملخص المالي والإداري
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              أهم الأرقام الحالية في النظام.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <WalletCards className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">
                  حالي
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي العهد
              </p>

              <p
                className={`mt-2 text-2xl font-extrabold tracking-tight ${
                  totalCustodyBalance <
                  0
                    ? "text-red-600"
                    : "text-slate-900"
                }`}
              >
                {formatAmount(
                  totalCustodyBalance,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>

              <p className="mt-2 text-xs text-slate-400">
                الرصيد الحالي لجميع العهد
              </p>

              <Link
                href="/custodies"
                className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <span>
                  عرض العهد
                </span>

                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">
                  فعلي
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                مصروفات المشاريع
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {formatAmount(
                  totalProjectExpenses,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>

              <p className="mt-2 text-xs text-slate-400">
                إجمالي المصروفات المرتبطة بالمشاريع
              </p>

              <Link
                href="/expenses"
                className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <span>
                  عرض المصروفات
                </span>

                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FolderKanban className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">
                  فعلي
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                المشاريع والمواقع
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {projectsCount}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                المشاريع المسجلة بالنظام
              </p>

              <Link
                href="/projects"
                className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <span>
                  عرض المشاريع
                </span>

                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Users className="h-5 w-5" />
                </div>

                <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">
                  حالي
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                العمال
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {workersCount}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                العمال المسجلون بالنظام
              </p>

              <Link
                href="/workers"
                className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <span>
                  عرض العمال
                </span>

                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              الحركة المالية
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              ملخص سريع لحركة الحسابات والعهد.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>

                <span className="text-xs font-bold text-emerald-600">
                  الداخل
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي الوارد
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatAmount(
                  totalIncoming,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ArrowUpRight className="h-5 w-5" />
                </div>

                <span className="text-xs font-bold text-red-600">
                  الخارج
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي الخارج
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatAmount(
                  totalOutgoing,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <span className="text-xs font-bold text-slate-400">
                  عمليات
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                عدد المصروفات
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {expensesCount}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                إجمالي سجلات المصروفات
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  آخر الحركات
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  أحدث العمليات المالية المسجلة فعليًا.
                </p>
              </div>

              {latestTransactionDate && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  آخر حركة:{" "}
                  {formatDate(
                    latestTransactionDate,
                  )}
                </div>
              )}
            </div>

            {latestTransactions.length ===
            0 ? (
              <div className="flex min-h-64 items-center justify-center px-5 py-10">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <ReceiptText className="h-6 w-6" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-700">
                    لا توجد حركات حتى الآن
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                    عند تسجيل أول حركة عهدة ستظهر هنا تلقائيًا.
                  </p>

                  <Link
                    href="/custodies/central/new"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    تسجيل حركة
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500">
                        التاريخ
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500">
                        الحركة
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500">
                        البيان
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500">
                        المبلغ
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {latestTransactions.map(
                      (transaction) => {
                        const amount =
                          getTransactionAmount(
                            transaction,
                          );

                        const isPositive =
                          amount >= 0;

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
                                  transaction.type,
                                )}`}
                              >
                                {transaction.type ===
                                "in" ? (
                                  <ArrowDownLeft className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                )}

                                {getTransactionLabel(
                                  transaction.type,
                                )}
                              </span>
                            </td>

                            <td className="max-w-[320px] px-5 py-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">
                                  {
                                    transaction.description
                                  }
                                </p>

                                {custodyMap.get(
                                  transaction.custodyId,
                                ) && (
                                  <p className="mt-1 truncate text-[11px] text-slate-400">
                                    {custodyMap.get(
                                      transaction.custodyId,
                                    )}
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`text-sm font-extrabold ${
                                  isPositive
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {isPositive
                                  ? "+"
                                  : ""}
                                {formatAmount(
                                  amount,
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
            )}

            {latestTransactions.length >
              0 && (
              <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
                <Link
                  href="/custodies"
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900"
                >
                  عرض كل حركات العهد
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  المشاريع والمواقع
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  المشاريع الموجودة فعليًا بالنظام.
                </p>
              </div>

              <Link
                href="/projects"
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                الكل
              </Link>
            </div>

            {latestProjects.length ===
            0 ? (
              <div className="flex min-h-64 items-center justify-center px-5 py-10">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <BriefcaseBusiness className="h-6 w-6" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-700">
                    لا توجد مشاريع حتى الآن
                  </h3>

                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
                    أضف مشروعًا أو موقعًا ليظهر هنا تلقائيًا.
                  </p>

                  <Link
                    href="/projects/new"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    إضافة مشروع
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {latestProjects.map(
                  (project) => {
                    const projectExpenses =
                      expenses
                        .filter(
                          (expense) =>
                            expense.projectId ===
                            project.id,
                        )
                        .reduce(
                          (
                            total,
                            expense,
                          ) =>
                            total +
                            Number(
                              expense.amount ??
                                0,
                            ),
                          0,
                        );

                    return (
                      <Link
                        key={
                          project.id
                        }
                        href={`/projects/${project.id}`}
                        className="block px-5 py-4 transition-colors hover:bg-slate-50 sm:px-6"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <BriefcaseBusiness className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-slate-800">
                                  {
                                    project.name
                                  }
                                </p>

                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  المسؤول:{" "}
                                  {project.currentResponsible ||
                                    "غير محدد"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <ArrowLeft className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                              project.status ===
                              "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : project.status ===
                                    "stopped"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {project.status ===
                            "active"
                              ? "نشط"
                              : project.status ===
                                  "stopped"
                                ? "متوقف"
                                : "مغلق"}
                          </span>

                          <span className="text-xs font-extrabold text-red-600">
                            {formatAmount(
                              projectExpenses,
                            )}{" "}
                            جنيه مصروفات
                          </span>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              إحصائيات النظام
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              أرقام إضافية محسوبة من البيانات الحالية.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-slate-500" />

                <span className="text-xs font-bold text-slate-500">
                  عدد العهد
                </span>
              </div>

              <p className="mt-3 text-xl font-extrabold text-slate-900">
                {custodies.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-slate-500" />

                <span className="text-xs font-bold text-slate-500">
                  عدد المصروفات
                </span>
              </div>

              <p className="mt-3 text-xl font-extrabold text-slate-900">
                {expensesCount}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-slate-500" />

                <span className="text-xs font-bold text-slate-500">
                  عدد المشاريع
                </span>
              </div>

              <p className="mt-3 text-xl font-extrabold text-slate-900">
                {projectsCount}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />

                <span className="text-xs font-bold text-slate-500">
                  عدد العمال
                </span>
              </div>

              <p className="mt-3 text-xl font-extrabold text-slate-900">
                {workersCount}
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}