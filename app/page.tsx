"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FolderKanban,
  HandCoins,
  ReceiptText,
  RefreshCw,
  Users,
  WalletCards,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { getCustodies } from "@/lib/data/custodies";
import { getCustodyTransactions } from "@/lib/data/custody-transactions";
import { getExpenses } from "@/lib/data/expenses";
import { getProjects } from "@/lib/data/projects";
import { getWorkers } from "@/lib/data/workers";
import { getContractors } from "@/lib/data/contractors";
import { getCompanies } from "@/lib/data/companies";
import { getSettlements, getSettlementPaidAmount } from "@/lib/data/settlements";
import { getCompanyChecks } from "@/lib/data/company-checks";
import { getPartnerFinancialAccounts } from "@/lib/data/partner-financial-accounts";

import type { Custody } from "@/types/custody";
import type { CustodyTransaction } from "@/types/custody-transaction";
import type { Expense } from "@/types/expense";
import type { Project } from "@/types/project";
import type { Settlement } from "@/types/settlement";
import type { CompanyCheck } from "@/types/check";

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date?: string): string {
  if (!date) return "-";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateAfter(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTransactionLabel(type: CustodyTransaction["type"]): string {
  if (type === "in") return "وارد";
  if (type === "out") return "خارج";
  return "تحويل";
}

function getTransactionClasses(type: CustodyTransaction["type"]): string {
  if (type === "in") return "bg-emerald-50 text-emerald-700";
  if (type === "out") return "bg-red-50 text-red-700";
  return "bg-blue-50 text-blue-700";
}

function getTransactionAmount(transaction: CustodyTransaction): number {
  return transaction.type === "in"
    ? Math.abs(transaction.amount)
    : -Math.abs(transaction.amount);
}

function getSettlementStatusLabel(status: Settlement["status"]): string {
  const labels: Record<Settlement["status"], string> = {
    draft: "مسودة",
    review: "مراجعة",
    approved: "معتمد",
    paid: "مدفوع",
    rejected: "مرفوض",
  };
  return labels[status];
}

function getCheckStatusLabel(status: CompanyCheck["status"]): string {
  const labels: Record<CompanyCheck["status"], string> = {
    received: "مستلم",
    due: "مستحق",
    collected: "محصل",
    returned: "مرتجع",
    cancelled: "ملغي",
  };
  return labels[status];
}

export default function DashboardPage() {
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [transactions, setTransactions] = useState<CustodyTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workersCount, setWorkersCount] = useState(0);
  const [contractorsCount, setContractorsCount] = useState(0);
  const [companies, setCompanies] = useState(() => getCompanies());
  const [companiesCount, setCompaniesCount] = useState(0);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [checks, setChecks] = useState<CompanyCheck[]>([]);
  const [partnerAccounts, setPartnerAccounts] = useState(() => getPartnerFinancialAccounts());
  const [isLoaded, setIsLoaded] = useState(false);

  const loadDashboardData = () => {
    setCustodies(getCustodies());
    setTransactions(getCustodyTransactions());
    setExpenses(getExpenses());
    setProjects(getProjects());
    setWorkersCount(getWorkers().length);
    setContractorsCount(getContractors().length);
    const allCompanies = getCompanies();
    setCompanies(allCompanies);
    setCompaniesCount(allCompanies.length);
    setSettlements(getSettlements());
    setChecks(getCompanyChecks());
    setPartnerAccounts(getPartnerFinancialAccounts());
    setIsLoaded(true);
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdated = () => loadDashboardData();
    window.addEventListener("elsaghir-data-updated", handleUpdated);
    return () => window.removeEventListener("elsaghir-data-updated", handleUpdated);
  }, []);

  const today = getToday();
  const nextSevenDays = getDateAfter(7);

  const centralCustody = useMemo(
    () => custodies.find((custody) => custody.type === "central"),
    [custodies],
  );

  const operatingCustodyBalance = useMemo(
    () => custodies
      .filter((custody) => custody.type !== "central")
      .reduce((sum, custody) => sum + Number(custody.balance ?? 0), 0),
    [custodies],
  );

  const projectExpenses = useMemo(
    () => expenses
      .filter((expense) => Boolean(expense.projectId))
      .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0),
    [expenses],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0),
    [expenses],
  );

  const incoming = useMemo(
    () => transactions
      .filter((transaction) => transaction.type === "in")
      .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
    [transactions],
  );

  const outgoing = useMemo(
    () => transactions
      .filter((transaction) => transaction.type === "out")
      .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
    [transactions],
  );

  const transferTotal = useMemo(
    () => transactions
      .filter((transaction) => transaction.type === "transfer")
      .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
    [transactions],
  );

  const settlementSummary = useMemo(() => {
    const total = settlements.reduce((sum, settlement) => sum + Number(settlement.netValue ?? 0), 0);
    const collected = settlements.reduce((sum, settlement) => sum + getSettlementPaidAmount(settlement.id), 0);
    return { total, collected, remaining: Math.max(0, total - collected) };
  }, [settlements]);

  const activeChecks = useMemo(
    () => checks.filter((check) => check.status !== "cancelled" && check.status !== "returned"),
    [checks],
  );

  const pendingChecks = useMemo(
    () => activeChecks.filter((check) => check.status !== "collected"),
    [activeChecks],
  );

  const overdueChecks = useMemo(
    () => pendingChecks.filter((check) => check.dueDate < today),
    [pendingChecks, today],
  );

  const upcomingChecks = useMemo(
    () => pendingChecks
      .filter((check) => check.dueDate >= today && check.dueDate <= nextSevenDays)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5),
    [pendingChecks, today, nextSevenDays],
  );

  const pendingSettlements = useMemo(
    () => settlements
      .map((settlement) => ({
        settlement,
        remaining: Math.max(0, settlement.netValue - getSettlementPaidAmount(settlement.id)),
      }))
      .filter(({ settlement, remaining }) => remaining > 0 && settlement.status !== "rejected")
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 5),
    [settlements],
  );

  const latestTransactions = useMemo(
    () => [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 7),
    [transactions],
  );

  const latestProjects = useMemo(
    () => [...projects]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
    [projects],
  );

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies],
  );

  const totalPartnerBalance = useMemo(
    () => partnerAccounts.reduce((sum, account) => sum + Number(account.balance ?? 0), 0),
    [partnerAccounts],
  );

  if (!isLoaded) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-bold text-slate-500">جاري تحميل لوحة التحكم...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div dir="rtl" className="space-y-6 pb-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700">
                    النظام المحاسبي
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">نظرة تشغيلية كاملة</span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">الرئيسية</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  كل ما يحتاجه القرار اليومي في مكان واحد: أرصدة العهد، حسابات الحجاج، المستخلصات، الشيكات، المشاريع والحركة المالية.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">حالة النظام</p>
                  <p className="mt-0.5 text-xs font-extrabold text-slate-700">البيانات متزامنة</p>
                </div>
                <button
                  type="button"
                  onClick={loadDashboardData}
                  className="mr-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  title="تحديث البيانات"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">الصورة المالية الآن</h2>
              <p className="mt-1 text-sm text-slate-500">أرقام منفصلة تمنع خلط العهد التشغيلية مع عهدتك الشخصية.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              icon={<WalletCards className="h-5 w-5" />}
              iconClass="bg-slate-100 text-slate-700"
              label="رصيد عهدتي أنا"
              value={centralCustody?.balance ?? 0}
              suffix="جنيه"
              negative={(centralCustody?.balance ?? 0) < 0}
              href="/custodies/central"
              action="فتح العهدة"
            />
            <DashboardCard
              icon={<BriefcaseBusinessIcon />}
              iconClass="bg-indigo-50 text-indigo-600"
              label="أرصدة العهد التشغيلية"
              value={operatingCustodyBalance}
              suffix="جنيه"
              href="/custodies"
              action="عرض العهد"
            />
            <DashboardCard
              icon={<HandCoins className="h-5 w-5" />}
              iconClass="bg-amber-50 text-amber-600"
              label="أرصدة حسابات الحجاج"
              value={totalPartnerBalance}
              suffix="جنيه"
              href="/partner-accounts"
              action="حسابات الحجاج"
            />
            <DashboardCard
              icon={<FileCheck2 className="h-5 w-5" />}
              iconClass="bg-emerald-50 text-emerald-600"
              label="المتبقي من المستخلصات"
              value={settlementSummary.remaining}
              suffix="جنيه"
              href="/settlements"
              action="المستخلصات"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoStat icon={<ArrowDownLeft className="h-5 w-5" />} title="إجمالي الداخل" value={incoming} tone="emerald" />
          <InfoStat icon={<ArrowUpRight className="h-5 w-5" />} title="إجمالي الخارج" value={outgoing} tone="red" />
          <InfoStat icon={<RefreshCw className="h-5 w-5" />} title="إجمالي التحويلات" value={transferTotal} tone="blue" />
          <InfoStat icon={<ReceiptText className="h-5 w-5" />} title="إجمالي المصروفات" value={totalExpenses} tone="orange" />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">المستخلصات والشيكات</h2>
                <p className="mt-1 text-xs text-slate-400">المبالغ المستحقة والشيكات التي تحتاج متابعة.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/settlements" className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800">المستخلصات</Link>
                <Link href="/checks" className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50">الشيكات</Link>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniMetric title="إجمالي المستخلصات" value={settlementSummary.total} />
              <MiniMetric title="المحصل" value={settlementSummary.collected} tone="emerald" />
              <MiniMetric title="المتبقي" value={settlementSummary.remaining} tone="amber" />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-extrabold text-red-800">شيكات متأخرة</span>
                  </div>
                  <span className="text-lg font-extrabold text-red-700">{overdueChecks.length}</span>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-red-700/70">شيكات غير محصلة وتاريخ استحقاقها مرّ.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-extrabold text-blue-800">مستحق خلال 7 أيام</span>
                  </div>
                  <span className="text-lg font-extrabold text-blue-700">{upcomingChecks.length}</span>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-blue-700/70">شيكات تحتاج متابعة قريبة.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">حسابات الحجاج</h2>
                <p className="mt-1 text-xs text-slate-400">أرصدة الشيكات التي دخلت حساباتهم.</p>
              </div>
              <Link href="/partner-accounts" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {partnerAccounts.map((account) => (
                <div key={account.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-600">{account.name}</span>
                    <span className="text-sm font-extrabold text-slate-900">{formatAmount(account.balance)} ج.م</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                    <span>داخل: {formatAmount(account.totalIn)}</span>
                    <span>خارج: {formatAmount(account.totalOut)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">الشيكات القريبة</h2>
                <p className="mt-1 text-xs text-slate-400">أقرب الشيكات غير المحصلة خلال 7 أيام.</p>
              </div>
              <Link href="/checks" className="text-xs font-bold text-blue-600 hover:text-blue-700">كل الشيكات</Link>
            </div>
            {upcomingChecks.length === 0 ? (
              <EmptyState text="لا توجد شيكات مستحقة خلال 7 أيام." icon={<CheckCircle2 className="h-5 w-5" />} />
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingChecks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/70">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-800">شيك #{check.number}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">{companyMap.get(check.companyId) ?? "شركة غير معروفة"} • {getCheckStatusLabel(check.status)}</p>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-sm font-extrabold text-slate-900">{formatAmount(check.amount)} ج.م</p>
                      <p className="mt-1 text-[10px] font-bold text-blue-600">استحقاق {formatDate(check.dueDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">المستخلصات المفتوحة</h2>
                <p className="mt-1 text-xs text-slate-400">أكبر الأرصدة المتبقية التي تحتاج متابعة.</p>
              </div>
              <Link href="/settlements" className="text-xs font-bold text-blue-600 hover:text-blue-700">كل المستخلصات</Link>
            </div>
            {pendingSettlements.length === 0 ? (
              <EmptyState text="لا توجد مستخلصات مفتوحة حاليًا." icon={<CheckCircle2 className="h-5 w-5" />} />
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingSettlements.map(({ settlement, remaining }) => (
                  <div key={settlement.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/70">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-800">مستخلص #{settlement.number}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">{companyMap.get(settlement.companyId) ?? "شركة غير معروفة"} • {getSettlementStatusLabel(settlement.status)}</p>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-sm font-extrabold text-amber-700">{formatAmount(remaining)} ج.م</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">من صافي {formatAmount(settlement.netValue)} ج.م</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">آخر الحركات</h2>
                <p className="mt-1 text-xs text-slate-400">أحدث العمليات المالية المسجلة في العهد.</p>
              </div>
              <Link href="/custodies" className="text-xs font-bold text-blue-600 hover:text-blue-700">عرض الكل</Link>
            </div>
            {latestTransactions.length === 0 ? (
              <EmptyState text="لا توجد حركات حتى الآن." icon={<ReceiptText className="h-5 w-5" />} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500">التاريخ</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500">الحركة</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500">البيان</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-500">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestTransactions.map((transaction) => {
                      const amount = getTransactionAmount(transaction);
                      return (
                        <tr key={transaction.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">{formatDate(transaction.date)}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${getTransactionClasses(transaction.type)}`}>
                              {transaction.type === "in" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                              {getTransactionLabel(transaction.type)}
                            </span>
                          </td>
                          <td className="max-w-[330px] px-5 py-4">
                            <p className="truncate text-sm font-bold text-slate-800">{transaction.description}</p>
                          </td>
                          <td className={`whitespace-nowrap px-5 py-4 text-left text-sm font-extrabold ${amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {amount >= 0 ? "+" : "-"}{formatAmount(Math.abs(amount))} ج.م
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">ملخص النظام</h2>
                <p className="mt-1 text-xs text-slate-400">حجم البيانات الحالية.</p>
              </div>
              <CircleDollarSign className="h-5 w-5 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SummaryItem icon={<Building2 className="h-4 w-4" />} label="الشركات" value={companiesCount} href="/companies" />
              <SummaryItem icon={<FolderKanban className="h-4 w-4" />} label="المشاريع" value={projects.length} href="/projects" />
              <SummaryItem icon={<Users className="h-4 w-4" />} label="العمال" value={workersCount} href="/workers" />
              <SummaryItem icon={<HandCoins className="h-4 w-4" />} label="المقاولون" value={contractorsCount} href="/contractors" />
              <SummaryItem icon={<ReceiptText className="h-4 w-4" />} label="المصروفات" value={expenses.length} href="/expenses" />
              <SummaryItem icon={<FileCheck2 className="h-4 w-4" />} label="الشيكات" value={checks.length} href="/checks" />
            </div>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-500">مصروفات المشاريع</span>
                <span className="text-sm font-extrabold text-slate-900">{formatAmount(projectExpenses)} ج.م</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">آخر المشاريع</h2>
              <p className="mt-1 text-xs text-slate-400">المشاريع التي تم تحديثها مؤخرًا.</p>
            </div>
            <Link href="/projects" className="text-xs font-bold text-blue-600 hover:text-blue-700">كل المشاريع</Link>
          </div>
          {latestProjects.length === 0 ? (
            <EmptyState text="لا توجد مشاريع مسجلة حتى الآن." icon={<FolderKanban className="h-5 w-5" />} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {latestProjects.map((project) => (
                <Link key={project.id} href="/projects" className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                  <p className="truncate text-sm font-extrabold text-slate-800">{project.name}</p>
                  <p className="mt-2 text-[10px] font-semibold text-slate-400">آخر تحديث {formatDate(project.updatedAt.slice(0, 10))}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction href="/custodies/central/new" icon={<WalletCards className="h-5 w-5" />} label="حركة عهدة" />
          <QuickAction href="/expenses" icon={<ReceiptText className="h-5 w-5" />} label="مصروف جديد" />
          <QuickAction href="/settlements" icon={<FileCheck2 className="h-5 w-5" />} label="مستخلص جديد" />
          <QuickAction href="/checks" icon={<CalendarDays className="h-5 w-5" />} label="تسجيل شيك" />
        </section>
      </div>
    </AppShell>
  );
}

function DashboardCard({
  icon,
  iconClass,
  label,
  value,
  suffix,
  href,
  action,
  negative = false,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: number;
  suffix?: string;
  href: string;
  action: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
        <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">حالي</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold tracking-tight ${negative ? "text-red-600" : "text-slate-900"}`}>
        {formatAmount(value)}
        {suffix && <span className="mr-2 text-xs font-medium text-slate-400">{suffix}</span>}
      </p>
      <Link href={href} className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
        <span>{action}</span>
        <ArrowLeft className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function InfoStat({
  icon,
  title,
  value,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  tone: "emerald" | "red" | "blue" | "orange";
}) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses}`}>{icon}</div>
        <span className="text-[10px] font-bold text-slate-400">حالي</span>
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{formatAmount(value)} <span className="text-[10px] font-medium text-slate-400">ج.م</span></p>
    </div>
  );
}

function MiniMetric({
  title,
  value,
  tone = "slate",
}: {
  title: string;
  value: number;
  tone?: "slate" | "emerald" | "amber";
}) {
  const valueClass = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-[11px] font-bold text-slate-400">{title}</p>
      <p className={`mt-2 text-lg font-extrabold ${valueClass}`}>{formatAmount(value)} <span className="text-[9px] font-medium text-slate-400">ج.م</span></p>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-slate-200 hover:bg-white">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] font-bold text-slate-500">{icon}{label}</span>
        <span className="text-base font-extrabold text-slate-900">{value}</span>
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link href={href} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {icon}
      {label}
    </Link>
  );
}

function EmptyState({
  text,
  icon,
}: {
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex min-h-32 items-center justify-center px-5 py-8">
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">{icon}</div>
        <p className="mt-3 text-xs font-bold text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function BriefcaseBusinessIcon() {
  return <BriefcaseBusiness className="h-5 w-5" />;
}
