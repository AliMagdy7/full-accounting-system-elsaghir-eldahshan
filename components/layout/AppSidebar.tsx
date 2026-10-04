"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { getCurrentSession } from "@/lib/data/users";
import { hasPermission } from "@/lib/auth-permissions";
import type { UserSession } from "@/types/user";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  FileCheck2,
  FileText,
  HardHat,
  History,
  LayoutDashboard,
  PackageOpen,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
  Building2,
  BadgeDollarSign,
} from "lucide-react";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type SidebarLink = {
  title: string;
  icon: LucideIcon;
  href: string;
  permission?: "audit" | "manage_users";
};

type SidebarGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: SidebarLink[];
  permission?: "audit" | "manage_users";
};

const mainItems: SidebarLink[] = [
  { title: "الرئيسية", icon: LayoutDashboard, href: "/" },
];

const sidebarGroups: SidebarGroup[] = [
  {
    id: "operations",
    title: "التشغيل والحركة",
    icon: BriefcaseBusiness,
    items: [
      { title: "العهد", icon: Wallet, href: "/custodies" },
      { title: "المشاريع والمواقع", icon: BriefcaseBusiness, href: "/projects" },
      { title: "العمال", icon: Users, href: "/workers" },
      { title: "المقاولون", icon: HardHat, href: "/contractors" },
      { title: "المصروفات", icon: Receipt, href: "/expenses" },
      { title: "التحويلات", icon: FileText, href: "/transfers" },
    ],
  },
  {
    id: "companies",
    title: "الشركات والمستخلصات",
    icon: Building2,
    items: [
      { title: "الشركات", icon: Building2, href: "/companies" },
      { title: "المستخلصات", icon: FileCheck2, href: "/settlements" },
      { title: "الشيكات", icon: BadgeDollarSign, href: "/checks" },
    ],
  },
  {
    id: "finance",
    title: "الإدارة المالية",
    icon: Wallet,
    items: [
      { title: "حسابات الحجاج", icon: Wallet, href: "/partner-accounts" },
      { title: "التقارير المالية", icon: BarChart3, href: "/financial-reports" },
      { title: "أصول الشركة", icon: PackageOpen, href: "/assets" },
      { title: "الخزينة والبنوك", icon: Wallet, href: "/treasury" },
    ],
  },
  {
    id: "procurement",
    title: "الموردون والمشتريات",
    icon: FileText,
    items: [
      { title: "الموردون", icon: Users, href: "/suppliers" },
      { title: "كشف الحساب الموحد", icon: FileText, href: "/account-statement" },
      { title: "المشتريات والفواتير", icon: FileText, href: "/purchases" },
    ],
  },
  {
    id: "documents",
    title: "الدورة المستندية",
    icon: FileCheck2,
    items: [
      { title: "إقفال الفترات", icon: ShieldCheck, href: "/periods" },
      { title: "الموافقات", icon: FileCheck2, href: "/approvals" },
      { title: "مركز المستندات", icon: FileText, href: "/documents" },
    ],
  },
  {
    id: "reports",
    title: "التقارير والمتابعة",
    icon: BarChart3,
    items: [
      { title: "التقارير", icon: BarChart3, href: "/reports" },
      { title: "تقارير الشركات", icon: FileCheck2, href: "/reports/company-settlements" },
      { title: "لوحة الإدارة", icon: LayoutDashboard, href: "/admin-dashboard" },
      { title: "التقارير الإدارية", icon: BarChart3, href: "/admin-reports" },
    ],
  },
  {
    id: "review",
    title: "المراجعة والحماية",
    icon: ShieldCheck,
    permission: "audit",
    items: [
      { title: "سجل التدقيق", icon: History, href: "/audit" },
      { title: "فحص السلامة", icon: ShieldCheck, href: "/integrity" },
    ],
  },
  {
    id: "system",
    title: "إدارة النظام",
    icon: Settings,
    items: [
      { title: "المستخدمون والصلاحيات", icon: Users, href: "/users", permission: "manage_users" },
      { title: "الإعدادات", icon: Settings, href: "/settings" },
    ],
  },
];

const roleLabels: Record<UserSession["role"], string> = {
  admin: "Admin",
  accountant: "Accountant",
  viewer: "Viewer",
};

export default function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const load = () => setSession(getCurrentSession());
    load();
    window.addEventListener("elsaghir-auth-updated", load);
    return () => window.removeEventListener("elsaghir-auth-updated", load);
  }, []);

  const role = session?.role ?? "admin";
  const visibleGroups = sidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasPermission(role, item.permission)),
    }))
    .filter((group) => {
      if (group.permission && !hasPermission(role, group.permission)) return false;
      return group.items.length > 0;
    });

  const isActive = useCallback((href: string) => {
    if (href === "/") return pathname === "/";
    if (pathname !== "/system") return pathname === href || pathname.startsWith(`${href}/`);

    const section = searchParams.get("section");
    if (!section) return false;

    try {
      const target = new URL(href, window.location.origin);
      const targetSection = target.searchParams.get("section");
      return decodeURIComponent(section) === (targetSection ?? href);
    } catch {
      return section === href;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const activeGroups = Object.fromEntries(
      sidebarGroups
        .filter((group) => !group.permission || hasPermission(role, group.permission))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.permission || hasPermission(role, item.permission)),
        }))
        .filter((group) => group.items.some((item) => isActive(item.href)))
        .map((group) => [group.id, true]),
    );
    setOpenGroups((current) => ({ ...current, ...activeGroups }));
  }, [isActive, role]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  const linkClass = (active: boolean) =>
    `group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-right text-sm transition-all duration-200 ${
      active
        ? "bg-slate-900 font-bold text-white shadow-sm"
        : "font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 xl:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label="القائمة الرئيسية"
        className={`fixed right-0 top-0 z-50 flex h-screen w-[min(18rem,88vw)] flex-col overflow-hidden border-l border-slate-200/80 bg-white shadow-[0_0_40px_rgba(15,23,42,0.10)] transition-transform duration-300 ease-out xl:w-72 xl:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="relative overflow-hidden border-b border-slate-200/80 px-5 py-5">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-blue-50 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-slate-100 blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95 xl:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative flex items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <Image src="/images/elsaghir-logo.jpeg" alt="شعار الصغير" width={64} height={64} className="h-full w-full object-contain" priority />
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <Image src="/images/eldahshan-logo.jpeg" alt="شعار الدهشان" width={64} height={64} className="h-full w-full object-contain" priority />
            </div>
          </div>

          <div className="relative mt-4 text-center">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">النظام المحاسبي</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">الصغير والدهشان للمقاولات العامة</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-3 px-3">
            <p className="text-[11px] font-bold tracking-wider text-slate-400">القائمة الرئيسية</p>
          </div>

          <div className="space-y-1.5">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                  {active && <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-blue-400" />}
                  <Icon className={`h-5 w-5 shrink-0 ${active ? "text-blue-300" : "text-slate-400 group-hover:text-slate-700"}`} strokeWidth={2} />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 space-y-2">
            {visibleGroups.map((group) => {
              const GroupIcon = group.icon;
              const isOpenGroup = Boolean(openGroups[group.id]);
              const hasActiveItem = group.items.some((item) => isActive(item.href));

              return (
                <div key={group.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-1.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors ${hasActiveItem ? "text-slate-900" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}
                    aria-expanded={isOpenGroup}
                  >
                    <GroupIcon className={`h-4 w-4 shrink-0 ${hasActiveItem ? "text-blue-600" : "text-slate-400"}`} strokeWidth={2.1} />
                    <span className="min-w-0 flex-1 truncate text-xs font-extrabold">{group.title}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpenGroup ? "rotate-180" : ""}`} />
                  </button>

                  {isOpenGroup && (
                    <div className="mt-1 space-y-1 border-t border-slate-200/70 px-1 pt-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                            {active && <span className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-l-full bg-blue-400" />}
                            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-blue-300" : "text-slate-400 group-hover:text-slate-700"}`} strokeWidth={2} />
                            <span className="truncate">{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200/80 p-4">
          <Link
            href="/profile"
            onClick={onClose}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={linkClass(pathname === "/profile")}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${pathname === "/profile" ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`}>
              {(session?.userName ?? "المدير").slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className={`truncate text-sm font-bold ${pathname === "/profile" ? "text-white" : "text-slate-900"}`}>{session?.userName ?? "المدير"}</p>
              <p className={`mt-0.5 text-xs ${pathname === "/profile" ? "text-slate-300" : "text-slate-500"}`}>{roleLabels[role]} · الملف الشخصي</p>
            </div>
            <div className={`h-2 w-2 shrink-0 rounded-full ${pathname === "/profile" ? "bg-emerald-300" : "bg-emerald-500"}`} />
          </Link>
        </div>
      </aside>
    </>
  );
}
