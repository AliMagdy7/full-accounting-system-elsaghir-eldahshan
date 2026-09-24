import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Plus,
  Search,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";

const workerStats = [
  {
    title: "إجمالي العمال",
    value: "0",
    description: "جميع العمال المسجلين",
    icon: Users,
  },
  {
    title: "عمال اليومية",
    value: "0",
    description: "بنظام الأجر اليومي",
    icon: Clock3,
  },
  {
    title: "عمال الشهرية",
    value: "0",
    description: "بنظام الأجر الشهري",
    icon: CalendarDays,
  },
  {
    title: "أرصدة العمال",
    value: "0.00",
    description: "إجمالي الحسابات الحالية",
    icon: CircleDollarSign,
  },
];

export default function WorkersPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Users className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  إدارة العمال
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                العمال
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                إدارة بيانات العمال، الحضور، الأجور، السلف، والمدفوعات.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />

              إضافة عامل
            </button>
          </div>
        </section>

        {/* Statistics */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              ملخص العمال
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              نظرة سريعة على العمال والحسابات المرتبطة بهم.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {workerStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
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

        {/* Search & Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="ابحث عن اسم العامل..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                كل العمال
              </button>

              <button
                type="button"
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                عمال اليومية
              </button>

              <button
                type="button"
                className="col-span-2 h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:col-span-1"
              >
                عمال الشهرية
              </button>
            </div>
          </div>
        </section>

        {/* Workers List */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                قائمة العمال
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                العمال المسجلون وحالتهم الحالية.
              </p>
            </div>

            <span className="w-fit rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
              0 عامل
            </span>
          </div>

          {/* Empty State */}
          <div className="flex min-h-72 items-center justify-center px-5 py-10">
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <UserRound className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-base font-extrabold text-slate-800">
                لا يوجد عمال حتى الآن
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                عند إضافة عامل جديد، ستظهر بياناته ونظام أجره وموقعه الحالي
                هنا.
              </p>

              <button
                type="button"
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />

                إضافة أول عامل
              </button>
            </div>
          </div>
        </section>

        {/* Worker System Information */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              نظام حساب العامل
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الحساب المالي والعهدة الخاصة بالعامل يتم التعامل معهما بشكل
              مستقل.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Attendance */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                الحضور
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                تسجيل حضور وغياب العامل يوميًا، مع دعم اليوم الكامل ونصف
                اليوم والإضافي.
              </p>
            </div>

            {/* Wages */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                الأجور
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                دعم الأجر اليومي والأجر الشهري، مع الاحتفاظ بتاريخ تغييرات
                الأجر.
              </p>
            </div>

            {/* Advances */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Wallet className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                السلف والمدفوعات
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                فصل السلف عن الرواتب، مع تسجيل مصدر كل دفعة وتاريخها وموقعها.
              </p>
            </div>

            {/* Site History */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                تنقلات المواقع
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                الاحتفاظ بتاريخ انتقال العامل بين المواقع، مع إمكانية الرجوع
                لموقع سابق.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}