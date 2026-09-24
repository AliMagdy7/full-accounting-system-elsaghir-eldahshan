"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Wallet,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { getCustodies } from "@/lib/data/custodies";
import { getCustodyTransactions } from "@/lib/data/custody-transactions";
import type { Custody } from "@/types/custody";
import type { CustodyTransaction } from "@/types/custody-transaction";

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
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

export default function CustodiesPage() {
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [transactions, setTransactions] = useState<
    CustodyTransaction[]
  >([]);

  const loadData = () => {
    const allCustodies = getCustodies();
    const allTransactions = getCustodyTransactions();

    setCustodies(allCustodies);

    setTransactions(
      [...allTransactions].sort((a, b) => {
        const dateCompare =
          b.date.localeCompare(a.date);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return b.createdAt.localeCompare(a.createdAt);
      }),
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const centralCustody = useMemo(
    () =>
      custodies.find(
        (custody) => custody.id === "central",
      ),
    [custodies],
  );

  const personCustodies = useMemo(
    () =>
      custodies.filter(
        (custody) => custody.type === "person",
      ),
    [custodies],
  );

  const projectCustodies = useMemo(
    () =>
      custodies.filter(
        (custody) => custody.type === "project",
      ),
    [custodies],
  );

  const workerCustodies = useMemo(
    () =>
      custodies.filter(
        (custody) => custody.type === "worker",
      ),
    [custodies],
  );

  const totalBalance = useMemo(
    () =>
      custodies.reduce(
        (total, custody) =>
          total + custody.balance,
        0,
      ),
    [custodies],
  );

  const latestTransactions = transactions.slice(0, 8);

  const custodyTypes = [
    {
      title: "العهدة المركزية",
      description:
        "العهدة الرئيسية الخاصة بالإدارة",
      balance: centralCustody?.balance ?? 0,
      incoming: centralCustody?.totalIn ?? 0,
      outgoing: centralCustody?.totalOut ?? 0,
      count: centralCustody ? 1 : 0,
      href: "/custodies/central",
    },
    {
      title: "عهد المواقع",
      description:
        "العهد المرتبطة بالمشاريع والمواقع",
      balance: projectCustodies.reduce(
        (total, custody) =>
          total + custody.balance,
        0,
      ),
      incoming: projectCustodies.reduce(
        (total, custody) =>
          total + custody.totalIn,
        0,
      ),
      outgoing: projectCustodies.reduce(
        (total, custody) =>
          total + custody.totalOut,
        0,
      ),
      count: projectCustodies.length,
      href: "/custodies",
    },
    {
      title: "عهد الأشخاص",
      description:
        "العهد المسلمة للموزعين والأفراد",
      balance: personCustodies.reduce(
        (total, custody) =>
          total + custody.balance,
        0,
      ),
      incoming: personCustodies.reduce(
        (total, custody) =>
          total + custody.totalIn,
        0,
      ),
      outgoing: personCustodies.reduce(
        (total, custody) =>
          total + custody.totalOut,
        0,
      ),
      count: personCustodies.length,
      href: "/custodies",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Wallet className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  الإدارة المالية
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                العهد
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                متابعة أرصدة العهد، الحركات المالية، والتحويلات
                بين العهد.
              </p>
            </div>

            <Link
              href="/custodies/central/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              إضافة حركة عهدة
            </Link>
          </div>
        </section>

        {/* Main Balance */}
        <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">
                إجمالي أرصدة العهد
              </p>

              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span
                  className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${
                    totalBalance < 0
                      ? "text-red-300"
                      : "text-white"
                  }`}
                >
                  {formatAmount(totalBalance)}
                </span>

                <span className="text-sm font-medium text-slate-400">
                  جنيه
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                الرصيد الحالي لجميع العهد المسجلة بالنظام.
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Wallet className="h-7 w-7 text-blue-300" />
            </div>
          </div>
        </section>

        {/* Custody Cards */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              أنواع العهد
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              نظرة عامة على أرصدة كل نوع من أنواع العهد.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {custodyTypes.map((custody) => (
              <div
                key={custody.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {custody.title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {custody.description}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-semibold text-slate-400">
                    الرصيد الحالي
                  </p>

                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className={`text-2xl font-extrabold ${
                        custody.balance < 0
                          ? "text-red-600"
                          : "text-slate-900"
                      }`}
                    >
                      {formatAmount(custody.balance)}
                    </span>

                    <span className="text-xs text-slate-400">
                      جنيه
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-emerald-600" />

                      <span className="text-xs font-semibold text-emerald-700">
                        الداخل
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-extrabold text-slate-900">
                      {formatAmount(custody.incoming)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-red-600" />

                      <span className="text-xs font-semibold text-red-700">
                        الخارج
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-extrabold text-slate-900">
                      {formatAmount(custody.outgoing)}
                    </p>
                  </div>
                </div>

                {custody.href === "/custodies/central" ? (
                  <Link
                    href={custody.href}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    عرض التفاصيل
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    عرض التفاصيل
                  </button>
                )}

                <div className="mt-3 text-center">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {custody.count} عهدة مسجلة
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Person Custodies */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                العهد الشخصية
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                الأشخاص والموزعون الذين لديهم عهد شخصية.
              </p>
            </div>

            <Link
              href="/custodies/person/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              إضافة عهدة شخصية
            </Link>
          </div>

          {personCustodies.length === 0 ? (
            <div className="flex min-h-60 items-center justify-center px-5 py-10">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Wallet className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-700">
                  لا توجد عهد شخصية حتى الآن
                </h3>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                  أضف أول عهدة شخصية لبدء متابعة أرصدة الأشخاص
                  وحركتهم المالية.
                </p>

                <Link
                  href="/custodies/person/new"
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  إضافة أول عهدة
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {personCustodies.map((custody) => (
                <div
                  key={custody.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold text-slate-900">
                        {custody.name}
                      </h3>

                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        عهدة شخصية
                      </p>
                    </div>

                    <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                      نشطة
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold text-slate-400">
                      الرصيد الحالي
                    </p>

                    <p
                      className={`mt-1 text-2xl font-extrabold ${
                        custody.balance < 0
                          ? "text-red-600"
                          : "text-slate-900"
                      }`}
                    >
                      {formatAmount(custody.balance)}

                      <span className="mr-2 text-xs font-medium text-slate-400">
                        جنيه
                      </span>
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs font-semibold text-emerald-700">
                        الداخل
                      </p>

                      <p className="mt-2 text-sm font-extrabold text-slate-900">
                        {formatAmount(custody.totalIn)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-700">
                        الخارج
                      </p>

                      <p className="mt-2 text-sm font-extrabold text-slate-900">
                        {formatAmount(custody.totalOut)}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/custodies/person/${custody.id}`}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    عرض كشف العهدة
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Workers Custody Note */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                عهد العمال
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                عهد العمال منفصلة عن حسابات الأجور والسلف، وسيتم
                ربطها عند بناء نظام العمال.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-center">
              <p className="text-[11px] font-semibold text-slate-400">
                عدد العهد
              </p>

              <p className="mt-1 text-sm font-extrabold text-slate-700">
                {workerCustodies.length}
              </p>
            </div>
          </div>
        </section>

        {/* Latest Transactions */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                آخر حركات العهد
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                أحدث عمليات الاستلام، الصرف، والتحويل.
              </p>
            </div>

            <span className="w-fit rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
              {latestTransactions.length} حركة
            </span>
          </div>

          {latestTransactions.length === 0 ? (
            <div className="flex min-h-60 items-center justify-center px-5 py-10">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Wallet className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-700">
                  لا توجد حركات عهدة حتى الآن
                </h3>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                  عند تسجيل أول حركة، ستظهر تفاصيلها هنا مع مصدر
                  المبلغ والجهة المستلمة والرصيد الناتج.
                </p>

                <Link
                  href="/custodies/central/new"
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  تسجيل أول حركة
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-212.5 text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      التاريخ
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      الحركة
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      البيان
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      المبلغ
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {latestTransactions.map((transaction) => {
                    const isIn =
                      transaction.type === "in";

                    const isTransfer =
                      transaction.type === "transfer";

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
                                : isTransfer
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {isIn ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            )}

                            {isIn
                              ? "وارد"
                              : isTransfer
                                ? "تحويل"
                                : "خارج"}
                          </span>
                        </td>

                        <td className="max-w-[420px] px-5 py-4">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {transaction.description}
                          </p>
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
                            {formatAmount(transaction.amount)}{" "}
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
      </div>
    </AppShell>
  );
}