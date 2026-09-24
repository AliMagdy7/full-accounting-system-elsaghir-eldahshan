"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  CalendarDays,
  Filter,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Tag,
  Wallet,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getCustodies,
} from "@/lib/data/custodies";

import {
  getExpenses,
} from "@/lib/data/expenses";

import {
  getProjects,
} from "@/lib/data/projects";

import type { Custody } from "@/types/custody";
import type { Expense } from "@/types/expense";
import type { Project } from "@/types/project";

function formatAmount(
  amount: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

function formatDate(
  date: string,
) {
  if (!date) {
    return "-";
  }

  const [year, month, day] =
    date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [custodies, setCustodies] =
    useState<Custody[]>([]);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [custodyId, setCustodyId] =
    useState("");

  const [projectId, setProjectId] =
    useState("");

  useEffect(() => {
    setExpenses(
      getExpenses().sort(
        (a, b) =>
          b.date.localeCompare(
            a.date,
          ),
      ),
    );

    setCustodies(
      getCustodies(),
    );

    setProjects(
      getProjects(),
    );

    setIsLoaded(true);
  }, []);

  const custodyMap = useMemo(() => {
    return new Map(
      custodies.map((custody) => [
        custody.id,
        custody.name,
      ]),
    );
  }, [custodies]);

  const projectMap = useMemo(() => {
    return new Map(
      projects.map((project) => [
        project.id,
        project.name,
      ]),
    );
  }, [projects]);

  /*
    التصنيفات يتم استخراجها من المصروفات
    نفسها، وليس من قائمة ثابتة.
  */
  const availableCategories =
    useMemo(() => {
      const uniqueCategories =
        new Set<string>();

      expenses.forEach(
        (expense) => {
          const value =
            expense.category?.trim();

          if (value) {
            uniqueCategories.add(
              value,
            );
          }
        },
      );

      return Array.from(
        uniqueCategories,
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "ar",
        ),
      );
    }, [expenses]);

  const filteredExpenses =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return expenses.filter(
        (expense) => {
          const matchesSearch =
            !normalizedSearch ||
            expense.description
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            expense.category
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesFromDate =
            !fromDate ||
            expense.date >=
              fromDate;

          const matchesToDate =
            !toDate ||
            expense.date <=
              toDate;

          const matchesCategory =
            !category ||
            expense.category ===
              category;

          const matchesCustody =
            !custodyId ||
            expense.custodyId ===
              custodyId;

          const matchesProject =
            !projectId ||
            expense.projectId ===
              projectId;

          return (
            matchesSearch &&
            matchesFromDate &&
            matchesToDate &&
            matchesCategory &&
            matchesCustody &&
            matchesProject
          );
        },
      );
    }, [
      expenses,
      search,
      fromDate,
      toDate,
      category,
      custodyId,
      projectId,
    ]);

  const totalAmount =
    useMemo(() => {
      return filteredExpenses.reduce(
        (total, expense) =>
          total + expense.amount,
        0,
      );
    }, [filteredExpenses]);

  const projectExpenses =
    useMemo(() => {
      return filteredExpenses
        .filter(
          (expense) =>
            Boolean(
              expense.projectId,
            ),
        )
        .reduce(
          (total, expense) =>
            total + expense.amount,
          0,
        );
    }, [filteredExpenses]);

  const averageAmount =
    filteredExpenses.length > 0
      ? totalAmount /
        filteredExpenses.length
      : 0;

  const resetFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setCategory("");
    setCustodyId("");
    setProjectId("");
  };

  if (!isLoaded) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-bold text-slate-500">
            جاري تحميل البيانات...
          </p>
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
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  الإدارة المالية
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                المصروفات
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                تسجيل ومتابعة المصروفات مع
                إمكانية الفلترة حسب التصنيف
                والمشروع والعهدة والفترة.
              </p>
            </div>

            <Link
              href="/expenses/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              إضافة مصروف
            </Link>
          </div>
        </section>

        {/* Statistics */}

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              ملخص المصروفات
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الملخص يتغير تلقائيًا حسب الفلاتر
              المستخدمة.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Total Expenses */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <ReceiptText className="h-5 w-5" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي المصروفات
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {formatAmount(
                  totalAmount,
                )}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                جنيه
              </p>
            </div>

            {/* Project Expenses */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Wallet className="h-5 w-5" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                مصروفات المشاريع
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {formatAmount(
                  projectExpenses,
                )}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                جنيه
              </p>
            </div>

            {/* Average */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Tag className="h-5 w-5" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                متوسط المصروف
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {formatAmount(
                  averageAmount,
                )}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                جنيه للعملية
              </p>
            </div>

            {/* Operations */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <CalendarDays className="h-5 w-5" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                عدد العمليات
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {filteredExpenses.length}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                عملية
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />

              <div>
                <h2 className="text-sm font-extrabold text-slate-800">
                  البحث والتصفية
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  التصنيفات الموجودة هنا يتم
                  إنشاؤها تلقائيًا من المصروفات
                  التي سجلتها.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              إعادة ضبط
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {/* Search */}

            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="ابحث في البيان أو التصنيف..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            {/* Category */}

            <div className="relative">
              <Tag className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value,
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm text-slate-700 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              >
                <option value="">
                  كل التصنيفات
                </option>

                {availableCategories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Project */}

            <div>
              <select
                value={projectId}
                onChange={(event) =>
                  setProjectId(
                    event.target.value,
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              >
                <option value="">
                  كل المشاريع
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

            {/* Custody */}

            <div className="pt-6">
              <select
                value={custodyId}
                onChange={(event) =>
                  setCustodyId(
                    event.target.value,
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              >
                <option value="">
                  كل العهد
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
            </div>

            {/* From */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                من تاريخ
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            {/* To */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                إلى تاريخ
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
            </div>
          </div>
        </section>

        {/* Table */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                سجل المصروفات
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {filteredExpenses.length}{" "}
                عملية مطابقة للفلاتر الحالية.
              </p>
            </div>

            <div className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-600">
              الإجمالي:{" "}
              {formatAmount(
                totalAmount,
              )}{" "}
              جنيه
            </div>
          </div>

          {filteredExpenses.length ===
          0 ? (
            <div className="flex min-h-72 items-center justify-center px-5 py-10">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ReceiptText className="h-6 w-6" />
                </div>

                <p className="mt-4 text-sm font-bold text-slate-700">
                  لا توجد مصروفات مطابقة
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  جرّب تغيير الفلاتر أو تسجيل
                  مصروف جديد.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-250 text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        التاريخ
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        التصنيف
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        البيان
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        المشروع
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        دافع المصروف
                      </th>

                      <th className="px-5 py-4 text-xs font-bold text-slate-500">
                        المبلغ
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredExpenses.map(
                      (expense) => (
                        <tr
                          key={expense.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {formatDate(
                              expense.date,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
                              {expense.category}
                            </span>
                          </td>

                          <td className="max-w-95 px-5 py-4">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {
                                expense.description
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {expense.projectId
                              ? projectMap.get(
                                  expense.projectId,
                                ) ??
                                "مشروع غير معروف"
                              : "مصروف عام"}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {custodyMap.get(
                              expense.custodyId,
                            ) ??
                              "عهدة غير معروفة"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="text-sm font-extrabold text-red-600">
                              -
                              {formatAmount(
                                expense.amount,
                              )}{" "}
                              جنيه
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-slate-50/70">
                      <td
                        colSpan={5}
                        className="px-5 py-4 text-sm font-extrabold text-slate-700"
                      >
                        إجمالي المصروفات
                      </td>

                      <td className="px-5 py-4 text-sm font-extrabold text-red-600">
                        -
                        {formatAmount(
                          totalAmount,
                        )}{" "}
                        جنيه
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile */}

              <div className="space-y-3 p-4 md:hidden">
                {filteredExpenses.map(
                  (expense) => (
                    <div
                      key={expense.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900">
                            {
                              expense.description
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              expense.date,
                            )}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-extrabold text-red-600">
                          -
                          {formatAmount(
                            expense.amount,
                          )}{" "}
                          جنيه
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
                          {expense.category}
                        </span>

                        <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700">
                          {expense.projectId
                            ? projectMap.get(
                                expense.projectId,
                              ) ??
                              "مشروع غير معروف"
                            : "مصروف عام"}
                        </span>

                        <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500">
                          {custodyMap.get(
                            expense.custodyId,
                          ) ??
                            "عهدة غير معروفة"}
                        </span>
                      </div>
                    </div>
                  ),
                )}

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-extrabold text-red-600">
                  إجمالي المصروفات:{" "}
                  {formatAmount(
                    totalAmount,
                  )}{" "}
                  جنيه
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}