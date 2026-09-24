"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  Plus,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import { getProjects } from "@/lib/data/projects";
import { getProjectCustody } from "@/lib/data/custodies";

import type { Project } from "@/types/project";

type ProjectFilter = "all" | "active";

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date?: string): string {
  if (!date) {
    return "غير محدد";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

function getStatusLabel(
  status: Project["status"],
): string {
  switch (status) {
    case "active":
      return "نشط";

    case "stopped":
      return "متوقف مؤقتًا";

    case "closed":
      return "مغلق";

    default:
      return "غير محدد";
  }
}

function getStatusClasses(
  status: Project["status"],
): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-600";

    case "stopped":
      return "bg-amber-50 text-amber-600";

    case "closed":
      return "bg-slate-100 text-slate-500";

    default:
      return "bg-slate-100 text-slate-500";
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<ProjectFilter>("all");

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const statistics = useMemo(() => {
    const total = projects.length;

    const active = projects.filter(
      (project) => project.status === "active",
    ).length;

    const stopped = projects.filter(
      (project) => project.status === "stopped",
    ).length;

    const closed = projects.filter(
      (project) => project.status === "closed",
    ).length;

    return {
      total,
      active,
      stopped,
      closed,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !normalizedSearch ||
        project.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        project.currentResponsible
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesFilter =
        filter === "all" ||
        project.status === "active";

      return matchesSearch && matchesFilter;
    });
  }, [projects, search, filter]);

  const projectStatuses = [
    {
      title: "إجمالي المشاريع",
      value: statistics.total,
      description: "جميع المشاريع والمواقع",
    },
    {
      title: "مشاريع نشطة",
      value: statistics.active,
      description: "المشاريع التي تعمل حاليًا",
    },
    {
      title: "موقوفة مؤقتًا",
      value: statistics.stopped,
      description: "مشاريع متوقفة مؤقتًا",
    },
    {
      title: "مغلقة",
      value: statistics.closed,
      description: "المشاريع المنتهية",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  إدارة المشاريع
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                المشاريع والمواقع
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                إدارة المشاريع، المواقع، العهد المرتبطة بها، والمسؤولين عنها.
              </p>
            </div>

            <Link
              href="/projects/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />

              إضافة مشروع
            </Link>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {projectStatuses.map((status) => (
            <div
              key={status.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-500">
                {status.title}
              </p>

              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                {status.value}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {status.description}
              </p>
            </div>
          ))}
        </section>

        {/* Search & Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="ابحث عن مشروع أو موقع أو مسؤول..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`h-11 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                  filter === "all"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                كل المشاريع
              </button>

              <button
                type="button"
                onClick={() => setFilter("active")}
                className={`h-11 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                  filter === "active"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                النشطة فقط
              </button>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                قائمة المشاريع
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                جميع المشاريع والمواقع المسجلة بالنظام.
              </p>
            </div>

            <span className="w-fit rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
              {filteredProjects.length}{" "}
              {filteredProjects.length === 1
                ? "مشروع"
                : "مشاريع"}
            </span>
          </div>

          {filteredProjects.length === 0 ? (
            /* Empty State */
            <div className="flex min-h-72 items-center justify-center px-5 py-10">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <BriefcaseBusiness className="h-7 w-7" />
                </div>

                <h3 className="mt-5 text-base font-extrabold text-slate-800">
                  {projects.length === 0
                    ? "لا توجد مشاريع حتى الآن"
                    : "لا توجد نتائج مطابقة"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {projects.length === 0
                    ? "عند إضافة مشروع جديد، ستظهر بياناته هنا مع المسؤول، رصيد العهدة، وحالة المشروع."
                    : "جرّب تغيير كلمة البحث أو الفلتر لعرض المشاريع الموجودة."}
                </p>

                {projects.length === 0 && (
                  <Link
                    href="/projects/new"
                    className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />

                    إضافة أول مشروع
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* Projects List */
            <div className="divide-y divide-slate-100">
              {filteredProjects.map((project) => {
                const projectCustody =
                  getProjectCustody(project.id);

                const balance =
                  projectCustody?.balance ?? 0;

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block px-5 py-5 transition-colors hover:bg-slate-50 sm:px-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      {/* Project Identity */}
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <BriefcaseBusiness className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-extrabold text-slate-900">
                              {project.name}
                            </h3>

                            <span
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                                project.status,
                              )}`}
                            >
                              {getStatusLabel(
                                project.status,
                              )}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="h-3.5 w-3.5" />

                              {project.currentResponsible ||
                                "لا يوجد مسؤول محدد"}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />

                              بداية المسؤولية:{" "}
                              {formatDate(
                                project.assignmentStartDate,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:min-w-[430px]">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Wallet className="h-3.5 w-3.5" />

                            <span>رصيد العهدة</span>
                          </div>

                          <p
                            className={`mt-1 text-sm font-extrabold ${
                              balance < 0
                                ? "text-red-600"
                                : "text-slate-900"
                            }`}
                          >
                            {formatAmount(balance)}{" "}
                            <span className="text-[10px] font-medium text-slate-400">
                              جنيه
                            </span>
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <MapPin className="h-3.5 w-3.5" />

                            <span>نوع الحساب</span>
                          </div>

                          <p className="mt-1 text-sm font-extrabold text-slate-900">
                            مشروع / موقع
                          </p>
                        </div>

                        <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:col-span-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <BriefcaseBusiness className="h-3.5 w-3.5" />

                            <span>تاريخ الإنشاء</span>
                          </div>

                          <p className="mt-1 text-sm font-extrabold text-slate-900">
                            {formatDate(
                              project.createdAt,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Information Cards */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MapPin className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-sm font-extrabold text-slate-900">
              بيانات الموقع
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              كل مشروع يحتفظ ببياناته وحركته المالية بشكل مستقل مع استمرار
              الحساب عبر الفترات.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserRound className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-sm font-extrabold text-slate-900">
              مسؤول الموقع
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              يمكن تغيير مسؤول الموقع مع الاحتفاظ بتاريخ المسؤولين والحركات
              القديمة كما هي.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Wallet className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-sm font-extrabold text-slate-900">
              عهدة الموقع
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              رصيد عهدة الموقع مستقل عن إجمالي مصروفاته، ويمكن أن يستمر
              حتى بعد تغيير المسؤول.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}