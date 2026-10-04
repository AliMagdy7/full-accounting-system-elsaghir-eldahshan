"use client";

import {
  Building2,
  ChevronLeft,
  Database,
  FileDown,
  FileSpreadsheet,
  History,
  LockKeyhole,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  UserRound,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { useState } from "react";
import { createSystemBackup, restoreSystemBackup } from "@/lib/data/system-backup";
import { getSystemIntegrityReport, type SystemIntegrityReport } from "@/lib/data/system-integrity";
import { getCurrentSession } from "@/lib/data/users";

const COMPANY_STORAGE_KEY = "elsaghir-eldahshan-company-settings";

interface CompanySettings {
  name: string;
  subtitle: string;
  phone: string;
  address: string;
}

const defaultCompany: CompanySettings = {
  name: "الصغير والدهشان",
  subtitle: "نظام المحاسبة والإدارة",
  phone: "",
  address: "",
};

const settingsSections = [
  { title: "الملف الشخصي", description: "تعديل الاسم وبيانات الحساب وكلمة المرور الحالية.", icon: UserRound, href: "/profile" },
  { title: "بيانات الشركة", description: "بيانات الشركة التي تظهر في التقارير والطباعة.", icon: Building2 },
  { title: "المستخدمون والصلاحيات", description: "إدارة المستخدمين والأدوار ومصفوفة الصلاحيات المرتبطة بهم.", icon: Users, href: "/users" },
  { title: "سجل العمليات", description: "مراجعة من قام بالإضافة أو التعديل ومتى تم ذلك.", icon: History, href: "/audit" },
  { title: "الأمان", description: "حالة الحساب والصلاحيات المحلية في نسخة الواجهة الحالية.", icon: LockKeyhole },
  { title: "النسخ الاحتياطي التلقائي", description: "إدارة تشغيل النسخ التلقائي وتكراره ومراجعة آخر نسخة.", icon: Database, href: "/backup" },
  { title: "التصدير والاستيراد", description: "تصدير بيانات النظام واستعادة نسخة كاملة بعد التحقق.", icon: FileSpreadsheet, href: "/import-export" },
  { title: "التسلسل الزمني", description: "مراجعة خط زمني لتغييرات وعمليات أي كيان داخل النظام.", icon: History, href: "/timeline" },
];

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanySettings>(() => {
    if (typeof window === "undefined") return defaultCompany;
    try {
      const raw = window.localStorage.getItem(COMPANY_STORAGE_KEY);
      return raw ? { ...defaultCompany, ...JSON.parse(raw) } : defaultCompany;
    } catch {
      return defaultCompany;
    }
  });
  const [backupMessage, setBackupMessage] = useState("");
  const [error, setError] = useState("");
  const [integrityReport, setIntegrityReport] = useState<SystemIntegrityReport | null>(null);
  const session = getCurrentSession();
  const isAdmin = session?.role === "admin";


  const saveCompany = () => {
    if (!company.name.trim()) {
      setError("اسم الشركة مطلوب.");
      return;
    }
    window.localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify({ ...company, name: company.name.trim() }));
    window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
    setError("");
    setBackupMessage("تم حفظ بيانات الشركة.");
  };

  const downloadBackup = () => {
    try {
      const backup = createSystemBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `elsaghir-eldahshan-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setError("");
      setBackupMessage("تم إنشاء النسخة الاحتياطية بنجاح.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "تعذر إنشاء النسخة الاحتياطية.");
    }
  };

  const runIntegrityCheck = () => {
    try {
      const report = getSystemIntegrityReport();
      setIntegrityReport(report);
      setError("");
      setBackupMessage(
        report.ok
          ? "فحص سلامة البيانات اكتمل بدون أخطاء."
          : `تم العثور على ${report.errorCount.toLocaleString("en-US")} أخطاء تحتاج مراجعة.`,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "تعذر تنفيذ فحص سلامة البيانات.");
    }
  };

  const restoreBackup = async (file: File) => {
    try {
      const raw = await file.text();
      const count = restoreSystemBackup(JSON.parse(raw));
      setError("");
      setBackupMessage(`تمت استعادة ${count.toLocaleString("en-US")} من بيانات النظام. أعد تحميل الصفحة لتحديث كل الشاشات.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "تعذر استعادة النسخة الاحتياطية.");
    }
  };

  return (
    <AppShell>
      <div className="app-page space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Settings className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-bold text-blue-600">إدارة النظام</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">الإعدادات</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">إعدادات تشغيلية حقيقية للنسخة المحلية الحالية. </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h2 className="text-sm font-extrabold text-emerald-900">الصلاحيات وسجل المراجعة</h2>
              <p className="mt-1 max-w-3xl text-xs leading-6 text-emerald-700">كل العمليات الحساسة تمر عبر صلاحيات المستخدم الحالية وتُسجل في Audit Log.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4"><h2 className="text-lg font-extrabold text-slate-900">إعدادات النظام</h2><p className="mt-1 text-sm text-slate-500">اختر القسم الذي تريد إدارته.</p></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const content = <>
              <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
              <Icon className="h-5 w-5" />
              </div>
              <ChevronLeft className="h-5 w-5 text-slate-300 transition-all group-hover:-translate-x-1 group-hover:text-slate-600" />
              </div>
              <h3 className="mt-5 text-base font-extrabold text-slate-900">{section.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-400">{section.description}</p>
              </>;
              if (section.href) return <Link key={section.title} href={section.href} className="group block rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">{content}</Link>;
              return <div key={section.title} className="group rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm">{content}</div>;
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
            <h2 className="text-base font-extrabold text-slate-900">بيانات الشركة</h2>
            <p className="text-xs text-slate-400">تُحفظ محليًا وتستخدم كأساس للتقارير القادمة.</p>
            </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[['name','اسم الشركة'],['subtitle','وصف مختصر'],['phone','رقم الهاتف'],['address','العنوان']].map(([key,label]) => <label key={key} className="block text-right"><span className="mb-2 block text-xs font-bold text-slate-600">{label}</span><input value={company[key as keyof CompanySettings]} onChange={(e)=>setCompany((current)=>({...current,[key]:e.target.value}))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>)}
            </div>
            <button type="button" onClick={saveCompany} className="mt-5 h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800">حفظ بيانات الشركة</button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
            <h2 className="text-base font-extrabold text-slate-900">النسخ والبيانات</h2>
            <p className="text-xs text-slate-400">نسخة JSON تشمل بيانات النظام المحلية دون جلسة تسجيل الدخول.</p>
            </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={downloadBackup} disabled={!isAdmin} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              <FileDown className="h-4 w-4" />تصدير نسخة احتياطية</button>
              <label className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 ${!isAdmin ? "pointer-events-none opacity-50" : ""}`}>
              <Upload className="h-4 w-4" />استعادة نسخة<input type="file" accept="application/json,.json" className="hidden" disabled={!isAdmin} onChange={(e)=>{
              const file=e.target.files?.[0];
              if(file) void restoreBackup(file);
              e.currentTarget.value="";
              }} />
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">النسخ والاستعادة متاحة للـ Admin فقط في النسخة الحالية لتقليل خطر استبدال بيانات النظام بالخطأ.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <div>
              <h2 className="text-base font-extrabold text-slate-900">فحص سلامة وترابط البيانات</h2>
              <p className="text-xs leading-5 text-slate-400">يفحص العلاقات بين المشاريع والمواقع والعمال والمقاولين والعهد والحركات والمصروفات ووسائل الدفع.</p>
              </div>
              </div>
            </div>
            <button type="button" onClick={runIntegrityCheck} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800">فحص النظام الآن</button>
          </div>
          {integrityReport && (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={`rounded-xl p-4 ${integrityReport.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                <p className="text-xs font-bold">الحالة</p>
                <p className="mt-1 text-lg font-black">{integrityReport.ok ? "سليم" : "يحتاج مراجعة"}</p>
                </div>
                <div className="rounded-xl bg-red-50 p-4 text-red-800"><p className="text-xs font-bold">أخطاء</p><p className="mt-1 text-lg font-black">{integrityReport.errorCount.toLocaleString("en-US")}</p></div>
                <div className="rounded-xl bg-amber-50 p-4 text-amber-800">
                <p className="text-xs font-bold">تحذيرات</p>
                <p className="mt-1 text-lg font-black">{integrityReport.warningCount.toLocaleString("en-US")}</p>
                </div>
              </div>
              {integrityReport.issues.length > 0 && (
                <div className="max-h-80 space-y-2 overflow-auto rounded-xl border border-slate-100 p-3">
                  {integrityReport.issues.map((item, index) => (
                    <div key={`${item.code}-${item.entityId ?? index}`} className={`rounded-lg border px-3 py-2 text-xs font-bold ${item.severity === "error" ? "border-red-100 bg-red-50 text-red-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                      <span>{item.severity === "error" ? "خطأ" : "تحذير"} — {item.code}</span>
                      <p className="mt-1 font-semibold">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {(backupMessage || error) && <section className={`rounded-2xl border p-4 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || backupMessage}</section>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900">الأدوار الحالية</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
        <b>Admin</b>
        <p className="mt-1 text-xs text-slate-500">صلاحيات كاملة وإدارة المستخدمين.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
        <b>Accountant</b>
        <p className="mt-1 text-xs text-slate-500">تشغيل وتعديل الحركات والتقارير.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
        <b>Viewer</b>
        <p className="mt-1 text-xs text-slate-500">مشاهدة البيانات والتقارير فقط.</p>
        </div>
        </div>
        </section>
      </div>
    </AppShell>
  );
}
