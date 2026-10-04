"use client";

import DateInput from "@/lib/date-input";

import { formatDisplayDate } from "@/lib/formatters";
import {
  SubmitEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Plus,
  Search,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { canCurrentUser } from "@/lib/permission-check";

import {
  addWorker,
  getWorkerByName,
  getWorkers,
} from "@/lib/data/workers";

import { getProjects } from "@/lib/data/projects";
import { getProjectSites } from "@/lib/data/project-sites";
import type { ProjectSite } from "@/types/project-site";

import type {
  Worker,
  WorkerMonthlyDivision,
  WorkerPayType,
} from "@/types/worker";

import type { Project } from "@/types/project";

type WorkerFilter =
  | "all"
  | "daily"
  | "monthly";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date?: string) {
  return formatDisplayDate(date);
}

export default function WorkersPage() {
  const [workers, setWorkers] =
    useState<Worker[]>([]);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [sites, setSites] =
    useState<ProjectSite[]>([]);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<WorkerFilter>("all");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [name, setName] = useState("");
  const [siteId, setSiteId] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [payType, setPayType] =
    useState<WorkerPayType>("daily");

  const [dailyRate, setDailyRate] =
    useState("");

  const [monthlySalary, setMonthlySalary] =
    useState("");

  const [monthlyDivision, setMonthlyDivision] =
    useState<WorkerMonthlyDivision>(30);

  const [carriedSalary, setCarriedSalary] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const loadData = () => {
    setWorkers(getWorkers());
    setProjects(getProjects());
    setSites(getProjectSites());
  };

  useEffect(() => {
    loadData();

    setStartDate(
      new Date()
        .toISOString()
        .split("T")[0],
    );
  }, []);

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const sitesById = useMemo(
    () => new Map(sites.map((site) => [site.id, site])),
    [sites],
  );

  const filteredWorkers = useMemo(() => {
    const normalizedSearch =
      search.trim().toLocaleLowerCase();

    return workers.filter((worker) => {
      const matchesSearch =
        !normalizedSearch ||
        worker.name
          .toLocaleLowerCase()
          .includes(normalizedSearch) ||
        worker.id
          .toLocaleLowerCase()
          .includes(normalizedSearch);

      const matchesFilter =
        filter === "all" ||
        worker.payType === filter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [workers, search, filter]);

  const statistics = useMemo(() => {

    let daily = 0;
    let monthly = 0;
    let balances = 0;

    for (const worker of workers) {
      balances += worker.carriedSalary;

      if (worker.payType === "daily") {
        daily++;
      } else if(worker.payType === "monthly"){
        monthly++;
      }
    }
    return {
      total: workers.length,
      daily: daily,
      monthly: monthly,
      balances: balances,
    };
  }, [workers]);

  const resetForm = () => {
    setName("");
    setSiteId("");
    setStartDate(
      new Date()
        .toISOString()
        .split("T")[0],
    );
    setPayType("daily");
    setDailyRate("");
    setMonthlySalary("");
    setMonthlyDivision(30);
    setCarriedSalary("");
    setError("");
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;

    setIsModalOpen(false);
    setError("");
  };

  const handleSubmit = (
    event: SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setError(
        "من فضلك أدخل اسم العامل.",
      );
      return;
    }

    /*
     * منع تكرار اسم العامل.
     *
     * المقارنة تتم داخل data helper
     * بعد تنظيف الاسم وتوحيد حالة الحروف.
     */
    const existingWorker =
      getWorkerByName(trimmedName);

    if (existingWorker) {
      setError(
        `العامل "${existingWorker.name}" موجود بالفعل في النظام.`,
      );
      return;
    }

    if (!siteId) {
      setError("من فضلك اختر الموقع الحالي للعامل.");
      return;
    }

    const selectedSite = sites.find((site) => site.id === siteId);
    if (!selectedSite) {
      setError("الموقع المحدد غير موجود.");
      return;
    }

    const selectedProjectId = selectedSite.projectId;

    if (!startDate) {
      setError(
        "من فضلك اختر تاريخ بداية العمل.",
      );
      return;
    }

    if (payType === "daily") {
      const numericDailyRate =
        Number(dailyRate);

      if (
        !dailyRate ||
        !Number.isFinite(
          numericDailyRate,
        ) ||
        numericDailyRate <= 0
      ) {
        setError(
          "من فضلك أدخل أجر يومي صحيح أكبر من صفر.",
        );
        return;
      }
    }

    if (payType === "monthly") {
      const numericMonthlySalary =
        Number(monthlySalary);

      if (
        !monthlySalary ||
        !Number.isFinite(
          numericMonthlySalary,
        ) ||
        numericMonthlySalary <= 0
      ) {
        setError(
          "من فضلك أدخل راتب شهري صحيح أكبر من صفر.",
        );
        return;
      }
    }

    const numericCarriedSalary =
      carriedSalary
        ? Number(carriedSalary)
        : 0;

    if (
      !Number.isFinite(
        numericCarriedSalary,
      )
    ) {
      setError(
        "الرصيد المرحل غير صحيح.",
      );
      return;
    }

    setIsSaving(true);

    try {
      addWorker({
        name: trimmedName,
        currentProjectId: selectedProjectId,
        currentSiteId: siteId,
        startDate,
        payType,

        ...(payType === "daily"
          ? {
              dailyRate:
                Number(dailyRate),
            }
          : {
              monthlySalary:
                Number(
                  monthlySalary,
                ),
              monthlyDivision,
            }),

        carriedSalary:
          numericCarriedSalary,
      });

      loadData();

      setIsModalOpen(false);

      resetForm();

      setSuccess(
        "تمت إضافة العامل بنجاح.",
      );

      window.setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ أثناء إضافة العامل.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div
        dir="rtl"
        className="app-page space-y-6"
      >
        {/* Header */}
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
                إدارة بيانات العمال، الأجور،
                السلف، المدفوعات، والمواقع الحالية.
              </p>
            </div>

            {canCurrentUser("create") && (
              <button
                type="button"
                onClick={openModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
                إضافة عامل
              </button>
            )}
          </div>
        </section>

        {/* Success */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
          >
            {success}
          </div>
        )}

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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-5 w-5" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                إجمالي العمال
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {statistics.total}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                جميع العمال المسجلين
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                عمال اليومية
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {statistics.daily}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                بنظام الأجر اليومي
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CalendarDays className="h-5 w-5" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                عمال الشهرية
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {statistics.monthly}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                بنظام الأجر الشهري
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-500">
                أرصدة العمال المرحلة
              </p>

              <p
                className={`mt-2 text-2xl font-extrabold ${
                  statistics.balances >= 0
                    ? "text-slate-900"
                    : "text-red-600"
                }`}
              >
                {formatAmount(
                  statistics.balances,
                )}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                إجمالي الأرصدة المرحلة
              </p>
            </div>
          </div>
        </section>

        {/* Search & filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="ابحث عن اسم العامل أو الكود..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilter("all")
                }
                className={`h-11 rounded-xl border px-4 text-xs font-bold transition-colors ${
                  filter === "all"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                الكل
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter("daily")
                }
                className={`h-11 rounded-xl border px-4 text-xs font-bold transition-colors ${
                  filter === "daily"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                اليومية
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter("monthly")
                }
                className={`h-11 rounded-xl border px-4 text-xs font-bold transition-colors ${
                  filter === "monthly"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                الشهرية
              </button>
            </div>
          </div>
        </section>

        {/* Workers list */}
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
              {filteredWorkers.length} عامل
            </span>
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center px-5 py-10">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <UserRound className="h-7 w-7" />
                </div>

                <h3 className="mt-5 text-base font-extrabold text-slate-800">
                  {workers.length === 0
                    ? "لا يوجد عمال حتى الآن"
                    : "لا توجد نتائج"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {workers.length === 0
                    ? "عند إضافة عامل جديد، ستظهر بياناته ونظام أجره وموقعه الحالي هنا."
                    : "جرّب تغيير البحث أو الفلتر للوصول إلى العامل المطلوب."}
                </p>

                {workers.length ===
                  0 && (
                  <button
                    type="button"
                    onClick={openModal}
                    className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة أول عامل
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-212.5 text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        العامل
                      </th>

                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        الموقع
                      </th>

                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        نظام الأجر
                      </th>

                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        بداية العمل
                      </th>

                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        المرحل
                      </th>

                      <th className="px-5 py-3 text-xs font-black text-slate-500">
                        التفاصيل
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredWorkers.map(
                      (worker) => {
                        const project =
                        projectsById.get(worker.currentProjectId);
                        const site = worker.currentSiteId
                        ?
                        sitesById.get(worker.currentSiteId)
                        : undefined;

                        return (
                          <tr
                            key={worker.id}
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                  <UserRound className="h-5 w-5" />
                                </div>

                                <div>
                                  <p className="font-black text-slate-800">
                                    {worker.name}
                                  </p>

                                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                                    {worker.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm font-bold text-slate-600">
                              {site?.name ?? project?.name ?? "غير محدد"}
                            </td>

                            <td className="px-5 py-4">
                              {worker.payType ===
                              "daily" ? (
                                <div>
                                  <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-700">
                                    يومي
                                  </span>

                                  <p className="mt-1 text-xs font-bold text-slate-500">
                                    {formatAmount(
                                      worker.dailyRate ??
                                        0,
                                    )}{" "}
                                    جنيه / يوم
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-black text-emerald-700">
                                    شهري
                                  </span>

                                  <p className="mt-1 text-xs font-bold text-slate-500">
                                    {formatAmount(
                                      worker.monthlySalary ??
                                        0,
                                    )}{" "}
                                    جنيه /{" "}
                                    {
                                      worker.monthlyDivision
                                    }
                                  </p>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs font-bold text-slate-500">
                              {formatDate(
                                worker.startDate,
                              )}
                            </td>

                            <td
                              className={`px-5 py-4 text-sm font-black ${
                                worker.carriedSalary <
                                0
                                  ? "text-red-600"
                                  : worker.carriedSalary >
                                      0
                                    ? "text-emerald-600"
                                    : "text-slate-600"
                              }`}
                            >
                              {formatAmount(
                                worker.carriedSalary,
                              )}{" "}
                              جنيه
                            </td>

                            <td className="px-5 py-4">
                              <Link
                                href={`/workers/${worker.id}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800"
                              >
                                فتح الحساب
                              </Link>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredWorkers.map(
                  (worker) => {
                    const project =
                    projectsById.get(worker.currentProjectId);
                   const site = worker.currentSiteId
                   ?
                   sitesById.get(worker.currentSiteId)
                   : undefined;

                    return (
                      <Link
                        key={worker.id}
                        href={`/workers/${worker.id}`}
                        className="block p-4 transition hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <UserRound className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black text-slate-800">
                                {worker.name}
                              </h3>

                              <p className="mt-1 text-[11px] font-bold text-slate-400">
                                {worker.id}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                            {worker.payType ===
                            "daily"
                              ? "يومي"
                              : "شهري"}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold text-slate-400">
                              الموقع
                            </p>

                            <p className="mt-1 truncate text-xs font-black text-slate-700">
                              {site?.name ?? project?.name ?? "غير محدد"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold text-slate-400">
                              الأجر
                            </p>

                            <p className="mt-1 text-xs font-black text-slate-700">
                              {worker.payType ===
                              "daily"
                                ? `${formatAmount(
                                    worker.dailyRate ??
                                      0,
                                  )} جنيه/يوم`
                                : `${formatAmount(
                                    worker.monthlySalary ??
                                      0,
                                  )} جنيه/شهر`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400">
                            بداية العمل:{" "}
                            {formatDate(
                              worker.startDate,
                            )}
                          </span>

                          <span
                            className={`text-xs font-black ${
                              worker.carriedSalary <
                              0
                                ? "text-red-600"
                                : worker.carriedSalary >
                                    0
                                  ? "text-emerald-600"
                                  : "text-slate-500"
                            }`}
                          >
                            مرحل:{" "}
                            {formatAmount(
                              worker.carriedSalary,
                            )}{" "}
                            جنيه
                          </span>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            </>
          )}
        </section>

        {/* Worker System Information */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              نظام حساب العامل
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الحساب المالي والعهدة الخاصة بالعامل يتم التعامل معهما بشكل مستقل.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                الحضور
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                تسجيل حضور وغياب العامل يوميًا، مع دعم اليوم الكامل ونصف اليوم والإضافي.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                الأجور
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                دعم الأجر اليومي والأجر الشهري، مع الاحتفاظ بتاريخ تغييرات الأجر.
              </p>
            </div>

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

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                تنقلات المواقع
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                الاحتفاظ بتاريخ انتقال العامل بين المواقع، مع إمكانية الرجوع لموقع سابق.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Add Worker Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            dir="rtl"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  إضافة عامل جديد
                </h2>

                <p className="mt-1 text-xs font-semibold text-slate-400">
                  أدخل بيانات العامل ونظام أجره.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5 sm:p-6"
            >
              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                >
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">
                  اسم العامل
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(
                      event.target.value,
                    );
                    setError("");
                  }}
                  placeholder="مثال: محمد يرغوت"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    الموقع الحالي
                  </label>

                  <select
                    value={siteId}
                    onChange={(event) => {
                      setSiteId(event.target.value);
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="">اختر الموقع</option>
                    {sites.filter((site) => site.active).map((site) => {
                      const project = projectsById.get(site.projectId);
                      return (
                        <option key={site.id} value={site.id}>
                          {project?.name ? `${project.name} — ${site.name}` : site.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    تاريخ بداية العمل
                  </label>

                  <DateInput
                    value={startDate}
                    onChange={(value) =>
                      setStartDate(
                        value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">
                  نوع الأجر
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPayType("daily")
                    }
                    className={`rounded-xl border p-4 text-right transition ${
                      payType === "daily"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-black">
                      أجر يومي
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        payType === "daily"
                          ? "text-slate-300"
                          : "text-slate-400"
                      }`}
                    >
                      حساب العامل باليوم
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPayType("monthly")
                    }
                    className={`rounded-xl border p-4 text-right transition ${
                      payType === "monthly"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-black">
                      راتب شهري
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        payType === "monthly"
                          ? "text-slate-300"
                          : "text-slate-400"
                      }`}
                    >
                      حساب العامل بالشهر
                    </p>
                  </button>
                </div>
              </div>

              {payType === "daily" ? (
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    الأجر اليومي
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dailyRate}
                    onChange={(event) =>
                      setDailyRate(
                        event.target.value,
                      )
                    }
                    placeholder="400"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-600">
                      الراتب الشهري
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={monthlySalary}
                      onChange={(event) =>
                        setMonthlySalary(
                          event.target.value,
                        )
                      }
                      placeholder="12000"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-600">
                      القسمة الشهرية
                    </label>

                    <select
                      value={
                        monthlyDivision
                      }
                      onChange={(event) =>
                        setMonthlyDivision(
                          Number(
                            event.target
                              .value,
                          ) as WorkerMonthlyDivision,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                    >
                      <option value={30}>
                        30 يوم
                      </option>

                      <option value={26}>
                        26 يوم
                      </option>

                      <option value={24}>
                        24 يوم
                      </option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">
                  الرصيد المرحل
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={carriedSalary}
                  onChange={(event) =>
                    setCarriedSalary(
                      event.target.value,
                    )
                  }
                  placeholder="0"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                />

                <p className="mt-2 text-[11px] font-semibold text-slate-400">
                  يمكن إدخال قيمة سالبة إذا كان على العامل رصيد مرحل.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />

                  {isSaving
                    ? "جارٍ الحفظ..."
                    : "حفظ العامل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
