import {
  BriefcaseBusiness,
  CircleDollarSign,
  FileText,
  HardHat,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";

const contractorStats = [
  {
    title: "إجمالي المقاولين",
    value: "0",
    description: "جميع المقاولين المسجلين",
    icon: HardHat,
  },
  {
    title: "إجمالي الأعمال",
    value: "0.00",
    description: "قيمة الأعمال المسجلة",
    icon: FileText,
  },
  {
    title: "إجمالي المدفوع",
    value: "0.00",
    description: "إجمالي المبالغ المدفوعة",
    icon: CircleDollarSign,
  },
  {
    title: "إجمالي المتبقي",
    value: "0.00",
    description: "المبالغ المستحقة حاليًا",
    icon: Wallet,
  },
];

export default function ContractorsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <HardHat className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  إدارة المقاولين
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                المقاولون
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                متابعة أعمال المقاولين، المدفوعات، والمبالغ المتبقية لكل
                مقاول.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />

              إضافة مقاول
            </button>
          </div>
        </section>

        {/* Statistics */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              الملخص المالي
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              نظرة سريعة على حسابات المقاولين.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {contractorStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                    {stat.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Search */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="ابحث عن اسم المقاول..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            <button
              type="button"
              className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              كل المقاولين
            </button>
          </div>
        </section>

        {/* Contractors List */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                قائمة المقاولين
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                المقاولون المسجلون وحساباتهم الحالية.
              </p>
            </div>

            <span className="w-fit rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
              0 مقاول
            </span>
          </div>

          {/* Empty State */}
          <div className="flex min-h-72 items-center justify-center px-5 py-10">
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <HardHat className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-base font-extrabold text-slate-800">
                لا يوجد مقاولون حتى الآن
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                عند إضافة مقاول، ستظهر أعماله، مدفوعاته، والمبلغ المتبقي
                في حسابه هنا.
              </p>

              <button
                type="button"
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />

                إضافة أول مقاول
              </button>
            </div>
          </div>
        </section>

        {/* Contractor Accounting Flow */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              طريقة حساب المقاول
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الحساب يعتمد على تفاصيل الأعمال والمدفوعات الفعلية.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Work */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                تفاصيل الأعمال
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                تسجيل وصف العمل، الكمية، الوحدة، سعر الوحدة، والإجمالي
                المحسوب تلقائيًا.
              </p>
            </div>

            {/* Payments */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                المدفوعات
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                كل دفعة ترتبط بالعهدة التي دفعت المبلغ، مع حفظ التاريخ
                والمشروع المرتبط بها.
              </p>
            </div>

            {/* Projects */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                المشاريع
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                تفاصيل أعمال المقاول يمكن ربطها بالمشروع أو الموقع الذي تم
                تنفيذ العمل فيه.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}