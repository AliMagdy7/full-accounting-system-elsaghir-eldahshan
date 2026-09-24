"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { addCustody } from "@/lib/data/custodies";
import type { Custody } from "@/types/custody";

export default function NewPersonCustodyPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("من فضلك أدخل اسم صاحب العهدة.");
      return;
    }

    if (!startDate) {
      setError("من فضلك اختر تاريخ بداية العهدة.");
      return;
    }

    setError("");
    setIsSaving(true);

    const now = new Date().toISOString();

    const custody: Custody = {
      id: crypto.randomUUID(),
      name: trimmedName,
      type: "person",
      balance: 0,
      totalIn: 0,
      totalOut: 0,
      createdAt: now,
      updatedAt: now,
    };

    addCustody(custody);

    /*
      تاريخ البداية والملاحظات سنضيفهما إلى نموذج العهدة
      بشكل مستقل عندما نحتاجهما في تفاصيل العهدة.
    */
    void startDate;
    void notes;

    router.push("/custodies/person");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Page Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
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
                  العهد الشخصية
                </span>

                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">
                  إضافة عهدة
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                إضافة عهدة شخصية
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                إنشاء عهدة شخصية جديدة لشخص أو موزع لمتابعة
                رصيده وحركته المالية بشكل مستقل.
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <WalletCards className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  بيانات العهدة
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  أدخل البيانات الأساسية للعهدة الشخصية.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {/* Name */}
            <div>
              <label
                htmlFor="custody-name"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                اسم صاحب العهدة
                <span className="mr-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <UserRound className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="custody-name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                  placeholder="مثال: أحمد زكريا"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                الاسم سيظهر في قوائم العهد والتحويلات وكشوف
                الحساب.
              </p>
            </div>

            {/* Start Date */}
            <div>
              <label
                htmlFor="custody-start-date"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                تاريخ بداية العهدة
                <span className="mr-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="custody-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setError("");
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                التاريخ يحدد بداية تسجيل العهدة، ولا يغير الرصيد
                الافتتاحي.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="custody-notes"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                ملاحظات
                <span className="mr-1 text-xs font-normal text-slate-400">
                  (اختياري)
                </span>
              </label>

              <div className="relative">
                <FileText className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-slate-400" />

                <textarea
                  id="custody-notes"
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  rows={4}
                  placeholder="أي ملاحظات إضافية عن صاحب العهدة..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Initial Balance */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    الرصيد الافتتاحي
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    العهدة الجديدة ستبدأ برصيد <strong>0</strong>.
                    أي مبلغ سيتم تسليمه للشخص سيتم تسجيله كحركة
                    وارد مستقلة بتاريخها ومصدرها.
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
              href="/custodies/person"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
            >
              إلغاء
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserRound className="h-4 w-4" />

              {isSaving
                ? "جاري الحفظ..."
                : "حفظ العهدة"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}