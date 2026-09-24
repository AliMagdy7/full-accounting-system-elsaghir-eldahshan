"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, WalletCards } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  addCustodyFinancialAccount,
  getCustodyFinancialAccounts,
} from "@/lib/data/custody-financial-accounts";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";

const CENTRAL_CUSTODY_ID = "central";

const money = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export default function CustodyAccountsPage() {
  const [accounts, setAccounts] = useState<CustodyFinancialAccount[]>([]);
  const [name, setName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const loadData = () => {
    setAccounts(
      getCustodyFinancialAccounts(CENTRAL_CUSTODY_ID),
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");
    setSaved(false);

    if (!name.trim()) {
      setError("من فضلك اكتب اسم وسيلة الدفع.");
      return;
    }

    const numericOpeningBalance = openingBalance.trim()
      ? Number(openingBalance)
      : 0;

    if (
      !Number.isFinite(numericOpeningBalance) ||
      numericOpeningBalance < 0
    ) {
      setError(
        "الرصيد الافتتاحي يجب أن يكون صفرًا أو أكبر.",
      );
      return;
    }

    try {
      addCustodyFinancialAccount({
        custodyId: CENTRAL_CUSTODY_ID,
        name: name.trim(),
        openingBalance: numericOpeningBalance,
      });

      setName("");
      setOpeningBalance("");
      setSaved(true);
      loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "حدث خطأ أثناء إضافة وسيلة الدفع.",
      );
    }
  };

  return (
    <AppShell>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-5xl space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Link
                href="/custodies"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="العودة إلى العهد"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <WalletCards className="h-5 w-5 text-blue-600" />

                  <span className="text-sm font-bold text-blue-600">
                    عهدتي أنا
                  </span>
                </div>

                <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
                  وسائل الدفع داخل عهدتي أنا
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  أنشئ بنفسك أي وسيلة دفع أو حساب تابع لعهدتك،
                  مثل كاش أو محفظة أو InstaPay، بدون أي قائمة
                  ثابتة داخل النظام.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-extrabold text-slate-900">
                  إضافة وسيلة دفع
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  الرصيد الفارغ = 0 جنيه.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="payment-method-name"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  اسم وسيلة الدفع
                </label>

                <input
                  id="payment-method-name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="مثال: إنستا، كاش، محفظة علي"
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="payment-method-opening-balance"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  الرصيد الافتتاحي{" "}
                  <span className="text-slate-400">
                    (اختياري)
                  </span>
                </label>

                <input
                  id="payment-method-opening-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalance}
                  onChange={(event) =>
                    setOpeningBalance(event.target.value)
                  }
                  placeholder="0"
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {saved && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  تم إنشاء وسيلة الدفع بنجاح داخل عهدتي أنا.
                </div>
              )}

              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-slate-900 text-sm font-bold text-white hover:bg-slate-800"
              >
                إضافة وسيلة الدفع
              </button>
            </div>
          </form>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <h2 className="font-extrabold text-slate-900">
                وسائل الدفع المسجلة
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                وسائل الدفع الموجودة داخل عهدتي أنا فقط.
              </p>
            </div>

            {accounts.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm font-bold text-slate-500">
                لا توجد وسائل دفع مسجلة حتى الآن.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {account.name}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        داخل عهدتي أنا
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-bold text-slate-400">
                        الرصيد الحالي
                      </p>

                      <p
                        className={`mt-1 text-lg font-extrabold ${
                          account.balance < 0
                            ? "text-red-600"
                            : "text-slate-900"
                        }`}
                      >
                        {money(account.balance)} جنيه
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </AppShell>
  );
}