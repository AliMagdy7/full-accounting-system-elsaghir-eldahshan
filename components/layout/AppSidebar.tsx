"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getCurrentSession } from "@/lib/data/users";
import { hasPermission } from "@/lib/auth-permissions";
import type { UserSession } from "@/types/user";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  HardHat,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet,
  X,
  ShieldCheck,
  History,
  Building2,
  FileCheck2,
  BadgeDollarSign,
  PackageOpen,
} from "lucide-react";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    title: "الرئيسية",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "العهد",
    icon: Wallet,
    href: "/custodies",
  },
  {
    title: "المشاريع والمواقع",
    icon: BriefcaseBusiness,
    href: "/projects",
  },
  {
    title: "العمال",
    icon: Users,
    href: "/workers",
  },
  {
    title: "المقاولون",
    icon: HardHat,
    href: "/contractors",
  },
  {
    title: "الشركات",
    icon: Building2,
    href: "/companies",
  },
  {
    title: "المستخلصات",
    icon: FileCheck2,
    href: "/settlements",
  },
  {
    title: "الشيكات",
    icon: BadgeDollarSign,
    href: "/checks",
  },
  {
    title: "أصول الشركة",
    icon: PackageOpen,
    href: "/assets",
  },
  {
    title: "حسابات الحجاج",
    icon: Wallet,
    href: "/partner-accounts",
  },
  {
    title: "المصروفات",
    icon: Receipt,
    href: "/expenses",
  },
  {
    title: "التحويلات",
    icon: FileText,
    href: "/transfers",
  },
  {
    title: "التقارير",
    icon: BarChart3,
    href: "/reports",
  },
  {
    title: "تقارير الشركات",
    icon: FileCheck2,
    href: "/reports/company-settlements",
  },
  {
    title: "الإعدادات",
    icon: Settings,
    href: "/settings",
  },
];

export default function AppSidebar({
  isOpen,
  onClose,
}: AppSidebarProps) {
  const [session, setSession] = useState<UserSession | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const load = () => setSession(getCurrentSession());
    load();
    window.addEventListener("elsaghir-auth-updated", load);
    return () => window.removeEventListener("elsaghir-auth-updated", load);
  }, []);

  const role = session?.role ?? "admin";
  const showAdmin = hasPermission(role, "manage_users");
  const roleLabel = role === "admin" ? "Admin" : role === "accountant" ? "Accountant" : "Viewer";

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile Overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 xl:hidden ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar */}
      <aside
        aria-label="القائمة الرئيسية"
        className={`fixed right-0 top-0 z-50 flex h-screen w-[min(18rem,88vw)] flex-col overflow-hidden border-l border-slate-200/80 bg-white shadow-[0_0_40px_rgba(15,23,42,0.10)] transition-transform duration-300 ease-out xl:w-72 xl:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="relative overflow-hidden border-b border-slate-200/80 px-5 py-5">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-blue-50 blur-3xl" />

          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-slate-100 blur-3xl" />

          {/* Mobile Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95 xl:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Logos */}
          <div className="relative flex items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <Image
                src="/images/elsaghir-logo.jpeg"
                alt="شعار الصغير"
                width={64}
                height={64}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <Image
                src="/images/eldahshan-logo.jpeg"
                alt="شعار الدهشان"
                width={64}
                height={64}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </div>

          {/* System Name */}
          <div className="relative mt-4 text-center">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
              النظام المحاسبي
            </h1>

            <p className="mt-1 text-xs font-medium text-slate-500">
              الصغير والدهشان للمقاولات العامة
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-3 px-3">
            <p className="text-[11px] font-bold tracking-wider text-slate-400">
              القائمة الرئيسية
            </p>
          </div>

          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-right text-sm transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-slate-900 font-bold text-white shadow-sm"
                      : "font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {isActive(item.href) && (
                    <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-blue-400" />
                  )}
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-all duration-200 group-hover:scale-105 ${isActive(item.href) ? "text-blue-300" : "text-slate-400 group-hover:text-slate-700"}`}
                    strokeWidth={2}
                  />

                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>

          {showAdmin && (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2 px-3">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-[11px] font-bold tracking-wider text-slate-400">الإدارة</p>
              </div>
              <div className="space-y-1.5">
                <Link
                  href="/users"
                  onClick={onClose}
                  aria-current={pathname === "/users" ? "page" : undefined}
                  className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-right text-sm transition-all duration-200 ${
                    pathname === "/users"
                      ? "bg-slate-900 font-bold text-white shadow-sm"
                      : "font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {pathname === "/users" && (
                    <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-blue-400" />
                  )}
                  <Users
                    className={`h-5 w-5 shrink-0 transition-all duration-200 group-hover:scale-105 ${
                      pathname === "/users"
                        ? "text-blue-300"
                        : "text-slate-400 group-hover:text-slate-700"
                    }`}
                    strokeWidth={2}
                  />
                  <span className="truncate">المستخدمون والصلاحيات</span>
                </Link>

                <Link
                  href="/audit-log"
                  onClick={onClose}
                  aria-current={pathname === "/audit-log" ? "page" : undefined}
                  className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-right text-sm transition-all duration-200 ${
                    pathname === "/audit-log"
                      ? "bg-slate-900 font-bold text-white shadow-sm"
                      : "font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {pathname === "/audit-log" && (
                    <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-blue-400" />
                  )}
                  <History
                    className={`h-5 w-5 shrink-0 transition-all duration-200 group-hover:scale-105 ${
                      pathname === "/audit-log"
                        ? "text-blue-300"
                        : "text-slate-400 group-hover:text-slate-700"
                    }`}
                    strokeWidth={2}
                  />
                  <span className="truncate">سجل العمليات</span>
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Current User */}
        <div className="border-t border-slate-200/80 p-4">
          <Link
            href="/profile"
            onClick={onClose}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-right text-sm transition-all duration-200 ${
              pathname === "/profile"
                ? "bg-slate-900 font-bold text-white shadow-sm"
                : "font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {pathname === "/profile" && (
              <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-blue-400" />
            )}

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-200 group-hover:scale-105 ${
                pathname === "/profile"
                  ? "bg-white text-slate-900"
                  : "bg-slate-900 text-white"
              }`}
            >
              {(session?.userName ?? "المدير").slice(0, 1)}
            </div>

            <div className="min-w-0 flex-1 text-right">
              <p
                className={`truncate text-sm font-bold ${
                  pathname === "/profile" ? "text-white" : "text-slate-900"
                }`}
              >
                {session?.userName ?? "المدير"}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  pathname === "/profile" ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {roleLabel} · الملف الشخصي
              </p>
            </div>

            <div
              className={`h-2 w-2 shrink-0 rounded-full ${
                pathname === "/profile" ? "bg-emerald-300" : "bg-emerald-500"
              }`}
            />
          </Link>
        </div>
      </aside>
    </>
  );
}