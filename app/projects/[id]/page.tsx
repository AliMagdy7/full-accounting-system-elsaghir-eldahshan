"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  CircleDollarSign,
  Edit3,
  History,
  Plus,
  ReceiptText,
  UserRound,
  WalletCards,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getCustodyById,
  getProjectCustody,
} from "@/lib/data/custodies";

import {
  getCustodyTransactionsByCustodyId,
} from "@/lib/data/custody-transactions";

import {
  getExpensesByProjectId,
} from "@/lib/data/expenses";

import { getProjectById } from "@/lib/data/projects";

import type {
  Project,
  ProjectResponsibleHistory,
} from "@/types/project";

import type { CustodyTransaction } from "@/types/custody-transaction";

import type { Expense } from "@/types/expense";

interface ProjectCustodySummary {
  balance: number;
  totalIn: number;
  totalOut: number;
}

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

function getStatusLabel(
  status: Project["status"],
): string {
  switch (status) {
    case "active":
      return "نشط";

    case "stopped":
      return "متوقف";

    case "closed":
      return "مغلق";

    default:
      return "غير محدد";
  }
}

function getStatusClasses(
  status: Project["status"],
): {
  badge: string;
  text: string;
  icon: string;
} {
  switch (status) {
    case "active":
      return {
        badge: "bg-emerald-50 text-emerald-600",
        text: "text-emerald-600",
        icon: "bg-emerald-50 text-emerald-600",
      };

    case "stopped":
      return {
        badge: "bg-amber-50 text-amber-600",
        text: "text-amber-600",
        icon: "bg-amber-50 text-amber-600",
      };

    case "closed":
      return {
        badge: "bg-slate-100 text-slate-600",
        text: "text-slate-600",
        icon: "bg-slate-100 text-slate-600",
      };

    default:
      return {
        badge: "bg-slate-100 text-slate-600",
        text: "text-slate-600",
        icon: "bg-slate-100 text-slate-600",
      };
  }
}

function getTransactionTypeLabel(
  transaction: CustodyTransaction,
): string {
  switch (transaction.type) {
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

function getTransactionTypeClasses(
  transaction: CustodyTransaction,
): string {
  switch (transaction.type) {
    case "in":
      return "bg-emerald-50 text-emerald-600";

    case "out":
      return "bg-red-50 text-red-600";

    case "transfer":
      return "bg-blue-50 text-blue-600";

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
    return -Math.abs(transaction.amount);
  }

  return Math.abs(transaction.amount);
}

function formatTransactionAmount(
  transaction: CustodyTransaction,
): string {
  const amount =
    getTransactionAmount(transaction);

  const absoluteAmount =
    Math.abs(amount);

  const prefix =
    amount > 0
      ? "+"
      : amount < 0
        ? "-"
        : "";

  return `${prefix}${formatAmount(
    absoluteAmount,
  )}`;
}

export default function ProjectDetailsPage() {
  const params = useParams();

  const projectId =
    String(params.id);

  const [project, setProject] =
    useState<Project | null>(null);

  const [custodySummary, setCustodySummary] =
    useState<ProjectCustodySummary>({
      balance: 0,
      totalIn: 0,
      totalOut: 0,
    });

  const [transactions, setTransactions] =
    useState<CustodyTransaction[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadProject = () => {
      const currentProject =
        getProjectById(projectId);

      if (!currentProject) {
        setProject(null);
        setTransactions([]);
        setExpenses([]);
        setLoading(false);
        return;
      }

      setProject({
        ...currentProject,
        responsibleHistory: [
          ...currentProject.responsibleHistory,
        ],
      });

      const projectCustody =
        getProjectCustody(projectId);

      if (projectCustody) {
        setCustodySummary({
          balance:
            projectCustody.balance,
          totalIn:
            projectCustody.totalIn,
          totalOut:
            projectCustody.totalOut,
        });

        const projectTransactions =
          getCustodyTransactionsByCustodyId(
            projectCustody.id,
          )
            .slice()
            .sort((a, b) => {
              const dateComparison =
                b.date.localeCompare(
                  a.date,
                );

              if (
                dateComparison !== 0
              ) {
                return dateComparison;
              }

              return b.createdAt.localeCompare(
                a.createdAt,
              );
            });

        setTransactions(
          projectTransactions,
        );
      } else {
        setCustodySummary({
          balance: 0,
          totalIn: 0,
          totalOut: 0,
        });

        setTransactions([]);
      }

      const projectExpenses =
        getExpensesByProjectId(
          projectId,
        )
          .slice()
          .sort((a, b) => {
            const dateComparison =
              b.date.localeCompare(
                a.date,
              );

            if (
              dateComparison !== 0
            ) {
              return dateComparison;
            }

            return b.createdAt.localeCompare(
              a.createdAt,
            );
          });

      setExpenses(
        projectExpenses,
      );

      setLoading(false);
    };

    loadProject();
  }, [projectId]);

  const totalProjectExpenses =
    useMemo(() => {
      return expenses.reduce(
        (total, expense) =>
          total + expense.amount,
        0,
      );
    }, [expenses]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

            <p className="mt-4 text-sm font-semibold text-slate-500">
              جاري تحميل بيانات المشروع...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى المشاريع
          </Link>

          <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-extrabold text-red-700">
              المشروع غير موجود
            </h1>

            <p className="mt-2 text-sm text-red-600">
              لم يتم العثور على المشروع المطلوب.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  const statusClasses =
    getStatusClasses(
      project.status,
    );

  const responsibleHistory: ProjectResponsibleHistory[] =
    project.responsibleHistory ??
    [];

  const currentResponsible =
    project.currentResponsible?.trim() ||
    "";

  const hasResponsibleHistory =
    responsibleHistory.length > 0;

  return (
    <AppShell>
      <div
        dir="rtl"
        className="space-y-6"
      >
        {/* Header */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href="/projects"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
                aria-label="العودة إلى المشاريع"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-bold text-blue-600">
                    تفاصيل المشروع
                  </span>

                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${statusClasses.badge}`}
                  >
                    {getStatusLabel(
                      project.status,
                    )}
                  </span>
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  مشروع {project.name}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  عرض تفاصيل وحركة المشروع والعهدة
                  المرتبطة به.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/expenses/new?project=${projectId}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                إضافة مصروف للمشروع
              </Link>

              <Link
                href={`/projects/${projectId}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
              >
                <Edit3 className="h-4 w-4" />
                تعديل المشروع
              </Link>
            </div>
          </div>
        </section>

        {/* Project Information */}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <UserRound className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400">
                  المسؤول الحالي
                </p>

                <p className="mt-1 truncate text-sm font-extrabold text-slate-900">
                  {currentResponsible ||
                    "لا يوجد مسؤول حالي"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400">
                  بداية المسؤولية
                </p>

                <p className="mt-1 text-sm font-extrabold text-slate-900">
                  {formatDate(
                    project.assignmentStartDate,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${statusClasses.icon}`}
              >
                <WalletCards className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400">
                  حالة المشروع
                </p>

                <p
                  className={`mt-1 text-sm font-extrabold ${statusClasses.text}`}
                >
                  {getStatusLabel(
                    project.status,
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Financial Summary */}

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              الملخص المالي
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              ملخص حساب المشروع والعهدة المرتبطة به.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <WalletCards className="h-5 w-5" />
                </div>

                <span className="text-[11px] font-bold text-slate-400">
                  حالي
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                رصيد عهدة المشروع
              </p>

              <p
                className={`mt-2 text-2xl font-extrabold ${
                  custodySummary.balance < 0
                    ? "text-red-600"
                    : "text-slate-900"
                }`}
              >
                {formatAmount(
                  custodySummary.balance,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <span className="text-[11px] font-bold text-slate-400">
                  فعلي
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي المصروفات الفعلية
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatAmount(
                  totalProjectExpenses,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CircleDollarSign className="h-5 w-5" />
                </div>

                <span className="text-[11px] font-bold text-slate-400">
                  وارد
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي الوارد
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatAmount(
                  custodySummary.totalIn,
                )}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  جنيه
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <History className="h-5 w-5" />
                </div>

                <span className="text-[11px] font-bold text-slate-400">
                  حركة
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                عدد العمليات
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {transactions.length}

                <span className="mr-2 text-xs font-medium text-slate-400">
                  عملية
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Actual Project Expenses */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                مصروفات المشروع
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                المصروفات الفعلية المسجلة على هذا المشروع.
              </p>
            </div>

            <Link
              href={`/expenses/new?project=${projectId}`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة مصروف
            </Link>
          </div>

          {expenses.length === 0 ? (
            <div className="flex min-h-52 items-center justify-center px-5 py-10">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ReceiptText className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-700">
                  لا توجد مصروفات حتى الآن
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  أضف أول مصروف للمشروع وسيظهر هنا.
                </p>

                <Link
                  href={`/expenses/new?project=${projectId}`}
                  className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة مصروف للمشروع
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      التاريخ
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      البيان
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      التصنيف
                    </th>

                    <th className="px-5 py-4 text-xs font-bold text-slate-500">
                      العهدة الدافعة
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                      المبلغ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {expenses.map(
                    (expense) => {
                      const custody =
                        getCustodyById(
                          expense.custodyId,
                        );

                      return (
                        <tr
                          key={expense.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {formatDate(
                              expense.date,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[360px] text-sm font-bold leading-6 text-slate-800">
                              {
                                expense.description
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
                              {expense.category}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {custody?.name ??
                              "عهدة غير معروفة"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-left">
                            <span className="text-sm font-extrabold text-red-600">
                              -
                              {formatAmount(
                                expense.amount,
                              )}{" "}
                              جنيه
                            </span>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-50/70">
                    <td
                      colSpan={4}
                      className="px-5 py-4 text-sm font-extrabold text-slate-700"
                    >
                      إجمالي المصروفات
                    </td>

                    <td className="px-5 py-4 text-left text-sm font-extrabold text-red-600">
                      -
                      {formatAmount(
                        totalProjectExpenses,
                      )}{" "}
                      جنيه
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Project Movement */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                حركة المشروع
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                جميع العمليات المالية المسجلة على عهدة المشروع.
              </p>
            </div>

            <Link
              href={`/reports?project=${projectId}`}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-slate-50 px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              التقرير الكامل

              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div className="flex min-h-60 items-center justify-center px-5 py-10">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ReceiptText className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-700">
                  لا توجد حركات حتى الآن
                </h3>

                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                  عند تسجيل أول حركة مالية مرتبطة
                  بهذا المشروع، ستظهر تفاصيلها هنا.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-right">
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
                      المصدر
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                      المبلغ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {transactions.map(
                    (transaction) => {
                      const transactionAmount =
                        getTransactionAmount(
                          transaction,
                        );

                      return (
                        <tr
                          key={
                            transaction.id
                          }
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {formatDate(
                              transaction.date,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${getTransactionTypeClasses(
                                transaction,
                              )}`}
                            >
                              {getTransactionTypeLabel(
                                transaction,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[360px] text-sm font-bold leading-6 text-slate-800">
                              {
                                transaction.description
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[240px] text-xs leading-5 text-slate-500">
                              {transaction.source ||
                                "—"}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-left">
                            <span
                              className={`text-sm font-extrabold ${
                                transactionAmount >
                                0
                                  ? "text-emerald-600"
                                  : transactionAmount <
                                      0
                                    ? "text-red-600"
                                    : "text-slate-700"
                              }`}
                            >
                              {formatTransactionAmount(
                                transaction,
                              )}
                            </span>

                            <span className="mr-1 text-[10px] font-medium text-slate-400">
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
        </section>

        {/* Responsible History */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <History className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  سجل المسؤولين
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  تاريخ الأشخاص المسؤولين عن عهدة المشروع.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {!hasResponsibleHistory ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <UserRound className="mx-auto h-7 w-7 text-slate-300" />

                <p className="mt-3 text-sm font-bold text-slate-500">
                  لا يوجد سجل مسؤولين حتى الآن
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  عند تعيين مسؤول للمشروع سيظهر هنا.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute bottom-4 right-5 top-4 w-px bg-slate-200" />

                <div className="space-y-4">
                  {responsibleHistory
                    .slice()
                    .reverse()
                    .map(
                      (
                        history,
                        index,
                      ) => {
                        const isCurrent =
                          !history.endDate &&
                          history.personName ===
                            currentResponsible;

                        return (
                          <div
                            key={
                              history.id ||
                              `${history.personName}-${history.startDate}-${index}`
                            }
                            className="relative flex items-start gap-4"
                          >
                            <div
                              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white text-white shadow-sm ${
                                isCurrent
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                              }`}
                            >
                              <UserRound className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-extrabold text-slate-900">
                                    {
                                      history.personName
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {isCurrent
                                      ? "المسؤول الحالي"
                                      : "مسؤول سابق"}
                                  </p>
                                </div>

                                <span
                                  className={`w-fit rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                                    isCurrent
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {isCurrent
                                    ? "حتى الآن"
                                    : "انتهت المسؤولية"}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                                <span className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4 text-slate-400" />

                                  بداية المسؤولية:{" "}
                                  {formatDate(
                                    history.startDate,
                                  )}
                                </span>

                                {history.endDate && (
                                  <span className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-slate-400" />

                                    نهاية المسؤولية:{" "}
                                    {formatDate(
                                      history.endDate,
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Notes */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-extrabold text-slate-900">
              ملاحظات المشروع
            </h2>
          </div>

          <div className="p-5 sm:p-6">
            {project.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-500">
                {project.notes}
              </p>
            ) : (
              <p className="text-sm leading-7 text-slate-400">
                لا توجد ملاحظات مسجلة حاليًا.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}