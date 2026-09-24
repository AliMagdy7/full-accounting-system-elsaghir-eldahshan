"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  FileText,
  WalletCards,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  getCustodyById,
  updateCustodyBalance,
} from "@/lib/data/custodies";
import { addCustodyTransaction } from "@/lib/data/custody-transactions";

export default function NewPersonCustodyTransactionPage() {
  const router = useRouter();
  const params = useParams();

  const custodyId = Array.isArray(params.id) ? params.id[0] : params.id;

  const custody = custodyId ? getCustodyById(custodyId) : undefined;

  const [type, setType] = useState<"in" | "out">("in");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!custody) {
      setError("العهدة غير موجودة.");
      return;
    }

    if (!date) {
      setError("من فضلك اختر تاريخ الحركة.");
      return;
    }

    const numericAmount = Number(amount);

    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("من فضلك أدخل مبلغًا صحيحًا أكبر من صفر.");
      return;
    }

    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      setError("من فضلك أدخل بيان الحركة.");
      return;
    }

    const trimmedSource = source.trim();

    if (type === "in" && !trimmedSource) {
      setError("من فضلك أدخل مصدر المبلغ.");
      return;
    }

    setError("");
    setIsSaving(true);

    const now = new Date().toISOString();

    const transaction = {
      id: crypto.randomUUID(),
      custodyId: custody.id,
      type,
      amount: numericAmount,
      date,
      description: trimmedDescription,
      ...(type === "in" && trimmedSource
        ? { source: trimmedSource }
        : {}),
      createdAt: now,
      updatedAt: now,
    };

    addCustodyTransaction(transaction);

    updateCustodyBalance(
      custody.id,
      numericAmount,
      type,
    );

    router.push(`/custodies/person/${custody.id}`);
  };

  if (!custody) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-3xl">
          <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              العهدة المطلوبة غير موجودة.
            </div>

            <Link
              href="/custodies/person"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition-all hover:bg-slate-800"
            >
              <ArrowRight className="h-4 w-4" />
              العودة إلى العهد الشخصية
            </Link>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Page Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <Link
              href={`/custodies/person/${custody.id}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
              aria-label="العودة إلى كشف العهدة"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <WalletCards className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  العهد الشخصية
                </span>

                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                  تسجيل حركة
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                تسجيل حركة جديدة
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                تسجيل حركة مالية جديدة على عهدة{" "}
                <span className="font-bold text-slate-700">
                  {custody.name}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Current Balance */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-400">
                الرصيد الحالي
              </p>

              <p
                dir="ltr"
                className={`mt-1 text-2xl font-extrabold ${
                  custody.balance < 0
                    ? "text-red-600"
                    : custody.balance > 0
                      ? "text-emerald-600"
                      : "text-slate-900"
                }`}
              >
                {custody.balance.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <WalletCards className="h-6 w-6" />
            </div>
          </div>
        </section>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 className="text-base font-extrabold text-slate-900">
              بيانات الحركة
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              أدخل تفاصيل المبلغ والحركة التي تمت على العهدة.
            </p>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {/* Movement Type */}
            <div>
              <label className="mb-3 block text-sm font-bold text-slate-700">
                نوع الحركة
                <span className="mr-1 text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setType("in");
                    setError("");
                  }}
                  className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all ${
                    type === "in"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <ArrowDownLeft className="h-5 w-5" />
                  وارد
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType("out");
                    setError("");
                  }}
                  className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all ${
                    type === "out"
                      ? "border-red-500 bg-red-50 text-red-700 ring-4 ring-red-500/10"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <ArrowUpRight className="h-5 w-5" />
                  منصرف
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="transaction-date"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                تاريخ الحركة
                <span className="mr-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="transaction-date"
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setError("");
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="transaction-amount"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                المبلغ
                <span className="mr-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <WalletCards className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="transaction-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError("");
                  }}
                  placeholder="مثال: 50000"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Source */}
            {type === "in" && (
              <div>
                <label
                  htmlFor="transaction-source"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  مصدر المبلغ
                  <span className="mr-1 text-red-500">*</span>
                </label>

                <input
                  id="transaction-source"
                  type="text"
                  value={source}
                  onChange={(event) => {
                    setSource(event.target.value);
                    setError("");
                  }}
                  placeholder="مثال: الحاج نبيل"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  اكتب مصدر المبلغ، مثل الحاج نبيل أو الحاج رمضان أو الشركة.
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <label
                htmlFor="transaction-description"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                بيان الحركة
                <span className="mr-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <FileText className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-slate-400" />

                <textarea
                  id="transaction-description"
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setError("");
                  }}
                  rows={4}
                  placeholder={
                    type === "in"
                      ? "مثال: واصل من الحاج نبيل إلى عهدة أحمد زكريا"
                      : "مثال: مصروفات موقع سيوة"
                  }
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Preview */}
            <div
              className={`rounded-2xl border p-4 ${
                type === "in"
                  ? "border-emerald-100 bg-emerald-50/60"
                  : "border-red-100 bg-red-50/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${
                    type === "in"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {type === "in" ? (
                    <ArrowDownLeft className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    {type === "in"
                      ? "حركة وارد"
                      : "حركة منصرف"}
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    {type === "in"
                      ? "سيتم إضافة المبلغ إلى رصيد العهدة."
                      : "سيتم خصم المبلغ من رصيد العهدة."}
                  </p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Link
              href={`/custodies/person/${custody.id}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
            >
              إلغاء
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <WalletCards className="h-4 w-4" />

              {isSaving
                ? "جاري الحفظ..."
                : "حفظ الحركة"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}