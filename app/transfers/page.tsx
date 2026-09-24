"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function TransfersPage() {
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [transactions, setTransactions] = useState<CustodyTransaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = () => {
    const allCustodies = getCustodies();
    const allTransactions = getCustodyTransactions();

    setCustodies(allCustodies);

    setTransactions(
      [...allTransactions]
        .filter((transaction) => transaction.type === "transfer")
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);

          if (dateCompare !== 0) {
            return dateCompare;
          }

          return b.createdAt.localeCompare(a.createdAt);
        }),
    );
  };

  useEffect(() => {
    loadData();
    setIsLoaded(true);

    const handleStorage = () => {
      loadData();
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const custodyMap = useMemo(() => {
    return new Map(
      custodies.map((custody) => [custody.id, custody]),
    );
  }, [custodies]);

  const totalTransfers = transactions.length;

  const totalAmount = useMemo(() => {
    return transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );
  }, [transactions]);

  const uniqueFromCustodies = useMemo(() => {
    return new Set(
      transactions.map((transaction) => transaction.custodyId),
    ).size;
  }, [transactions]);

  const uniqueToCustodies = useMemo(() => {
    return new Set(
      transactions
        .map((transaction) => transaction.relatedCustodyId)
        .filter(Boolean),
    ).size;
  }, [transactions]);

  if (!isLoaded) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <ArrowRightLeft className="h-6 w-6 animate-pulse text-slate-400" />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-500">
              جاري تحميل التحويلات...
            </p>
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
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  الإدارة المالية
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                التحويلات
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                متابعة التحويلات المالية بين العهد المختلفة مع
                معرفة الجهة المرسلة والجهة المستلمة وقيمة كل تحويل.
              </p>
            </div>

            <Link
              href="/transfers/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              تسجيل تحويل جديد
            </Link>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ArrowRightLeft className="h-5 w-5" />
              </div>

              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">
                العمليات
              </span>
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
              إجمالي التحويلات
            </p>

            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              {totalTransfers}
              <span className="mr-2 text-xs font-medium text-slate-400">
                تحويل
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>

              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                القيمة
              </span>
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
              إجمالي مبالغ التحويل
            </p>

            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              {formatAmount(totalAmount)}
              <span className="mr-2 text-xs font-medium text-slate-400">
                جنيه
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ArrowRightLeft className="h-5 w-5" />
              </div>

              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                إرسال
              </span>
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
              العهد المرسلة
            </p>

            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              {uniqueFromCustodies}
              <span className="mr-2 text-xs font-medium text-slate-400">
                عهدة
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ArrowRightLeft className="h-5 w-5" />
              </div>

              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                استلام
              </span>
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
              العهد المستلمة
            </p>

            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              {uniqueToCustodies}
              <span className="mr-2 text-xs font-medium text-slate-400">
                عهدة
              </span>
            </p>
          </div>
        </section>

        {/* Transfers Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                سجل التحويلات
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                جميع التحويلات المسجلة بين العهد.
              </p>
            </div>

            <span className="w-fit rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
              {totalTransfers} تحويل
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center px-5 py-10">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ArrowRightLeft className="h-7 w-7" />
                </div>

                <h3 className="mt-5 text-base font-extrabold text-slate-800">
                  لا توجد تحويلات حتى الآن
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  عند تسجيل أول تحويل بين عهدتين، ستظهر تفاصيل
                  التحويل هنا.
                </p>

                <Link
                  href="/transfers/new"
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  تسجيل أول تحويل
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
                      من عهدة
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      إلى عهدة
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      البيان
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      المبلغ
                    </th>

                    <th className="px-5 py-3 text-xs font-bold text-slate-500">
                      التفاصيل
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => {
                    const fromCustody = custodyMap.get(
                      transaction.custodyId,
                    );

                    const toCustody = transaction.relatedCustodyId
                      ? custodyMap.get(transaction.relatedCustodyId)
                      : undefined;

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {formatDate(transaction.date)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                              <ArrowLeft className="h-4 w-4" />
                            </div>

                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {fromCustody?.name ||
                                  transaction.custodyId}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-400">
                                المرسل
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <ArrowLeft className="h-4 w-4 rotate-180" />
                            </div>

                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {toCustody?.name ||
                                  transaction.relatedCustodyId ||
                                  "—"}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-400">
                                المستلم
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="max-w-70 px-5 py-4">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {transaction.description}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="text-sm font-extrabold text-blue-600">
                            {formatAmount(transaction.amount)} جنيه
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {fromCustody ? (
                            <Link
                              href={
                                fromCustody.type === "central"
                                  ? "/custodies/central"
                                  : fromCustody.type === "person"
                                    ? `/custodies/person/${fromCustody.id}`
                                    : "/custodies"
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            >
                              كشف المرسل
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Information Note */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <Wallet className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
                طبيعة التحويل
              </h2>

              <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
                التحويل بين العهد ليس مصروفًا. المبلغ يخرج من
                العهدة المرسلة ويضاف إلى العهدة المستلمة، مع
                الاحتفاظ بتفاصيل العملية في سجل التحويلات.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}