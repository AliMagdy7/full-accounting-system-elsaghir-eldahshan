import {
  Building2,
  ChevronLeft,
  Database,
  FileSpreadsheet,
  History,
  LockKeyhole,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";

const settingsSections = [
  {
    title: "بيانات الشركة",
    description: "إدارة اسم الشركة، الشعارات، وبيانات التقارير والطباعة.",
    icon: Building2,
  },
  {
    title: "المستخدمون والصلاحيات",
    description: "إدارة المستخدمين، الأدوار، وصلاحيات الوصول للنظام.",
    icon: Users,
  },
  {
    title: "سجل العمليات",
    description: "مراجعة من قام بالإضافة أو التعديل ومتى تم ذلك.",
    icon: History,
  },
  {
    title: "الأمان",
    description: "إعدادات الحسابات، كلمات المرور، وسياسات الوصول.",
    icon: LockKeyhole,
  },
  {
    title: "النسخ والبيانات",
    description: "إعدادات قاعدة البيانات والنسخ الاحتياطي للنظام.",
    icon: Database,
  },
  {
    title: "التقارير والتصدير",
    description: "إعدادات ملفات Excel وPDF وتنسيق التقارير.",
    icon: FileSpreadsheet,
  },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Settings className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-bold text-blue-600">
                إدارة النظام
              </p>

              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                الإعدادات
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                التحكم في إعدادات النظام، المستخدمين، الصلاحيات، الأمان
                والتقارير.
              </p>
            </div>
          </div>
        </section>

        {/* Security Status */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-emerald-900">
                نظام الصلاحيات وسجل المراجعة
              </h2>

              <p className="mt-1 max-w-3xl text-xs leading-6 text-emerald-700">
                سيتم الاحتفاظ بسجل كامل للعمليات والتعديلات، مع معرفة
                المستخدم الذي قام بكل عملية وتاريخ تنفيذها.
              </p>
            </div>
          </div>
        </section>

        {/* Settings Sections */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              إعدادات النظام
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              اختر القسم الذي تريد إدارته.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {settingsSections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.title}
                  type="button"
                  className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <ChevronLeft className="h-5 w-5 text-slate-300 transition-all duration-200 group-hover:-translate-x-1 group-hover:text-slate-600" />
                  </div>

                  <h3 className="mt-5 text-base font-extrabold text-slate-900">
                    {section.title}
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-400">
                    {section.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Current Roles */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-extrabold text-slate-900">
              أدوار النظام
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              الصلاحيات الأساسية التي سيتم تطبيقها عند تفعيل تسجيل الدخول.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 md:grid-cols-2">
            {/* Admin */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  A
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Admin
                  </h3>

                  <p className="text-xs text-slate-400">
                    صلاحيات كاملة
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  إضافة
                </span>

                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  تعديل
                </span>

                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  حذف
                </span>

                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  تقارير
                </span>
              </div>
            </div>

            {/* Accountant */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  A
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Accountant
                  </h3>

                  <p className="text-xs text-slate-400">
                    صلاحيات تشغيل كاملة
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  إضافة
                </span>

                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  تعديل
                </span>

                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  حذف
                </span>

                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  تقارير
                </span>
              </div>
            </div>

            {/* Viewers */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                  V
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Viewer
                  </h3>

                  <p className="text-xs text-slate-400">
                    مشاهدة فقط
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  عرض البيانات
                </span>

                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  عرض التقارير
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}