"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Save,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  getCustodyById,
  updateCustody,
} from "@/lib/data/custodies";
import type { Custody } from "@/types/custody";

export default function EditPersonCustodyPage() {
  const params = useParams();
  const router = useRouter();

  const custodyId = params.id as string;

  const [custody, setCustody] = useState<
    Custody | undefined
  >();

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const currentCustody =
      getCustodyById(custodyId);

    setCustody(currentCustody);

    if (currentCustody) {
      setName(currentCustody.name);
    }
  }, [custodyId]);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!custody) {
      setError("العهدة غير موجودة.");
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("من فضلك أدخل اسم صاحب العهدة.");
      return;
    }

    setError("");
    setIsSaving(true);

    updateCustody(custody.id, {
      name: trimmedName,
    });

    router.push(`/custodies/person/${custody.id}`);
  };

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
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header */}
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
                  <UserRound className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  العهد الشخصية
                </span>

                <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                  تعديل
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                تعديل العهدة الشخصية
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                تعديل بيانات {custody.name} مع الحفاظ على جميع
                الحركات والرصيد كما هي.
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
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  بيانات العهدة
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  يمكنك تعديل اسم صاحب العهدة.
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
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                تغيير الاسم هنا لا يؤثر على الرصيد أو الحركات
                السابقة للعهدة.
              </p>
            </div>

            {/* Current Balance */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    الرصيد الحالي
                  </h3>

                  <p className="mt-1 text-xl font-extrabold text-slate-900">
                    {custody.balance.toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      },
                    )}{" "}
                    <span className="text-xs font-medium text-slate-400">
                      جنيه
                    </span>
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    الرصيد لا يتم تعديله من شاشة التعديل. أي تغيير
                    مالي يتم من خلال تسجيل حركة جديدة.
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Data */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-400">
                  إجمالي الداخل
                </p>

                <p className="mt-2 text-lg font-extrabold text-emerald-600">
                  {custody.totalIn.toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    },
                  )}{" "}
                  جنيه
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-400">
                  إجمالي الخارج
                </p>

                <p className="mt-2 text-lg font-extrabold text-red-600">
                  {custody.totalOut.toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    },
                  )}{" "}
                  جنيه
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    تنبيه
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    تعديل بيانات العهدة لا يحذف ولا يعدل أي حركة
                    مالية سابقة، ولا يغير الرصيد الحالي.
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
              <Save className="h-4 w-4" />

              {isSaving
                ? "جاري الحفظ..."
                : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}