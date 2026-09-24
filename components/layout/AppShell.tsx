"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  FileText,
  Menu,
} from "lucide-react";
import { usePathname } from "next/navigation";

import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const pathname =
    usePathname();

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow =
        "";
      return;
    }

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [sidebarOpen]);

  /*
   * ============================================================
   * تحديد صفحات تفاصيل العهد
   * ============================================================
   *
   * العهدة المركزية:
   * /custodies/central
   *
   * العهدة الشخصية:
   * /custodies/person/:id
   *
   * لا نعتبر صفحات:
   * /new
   * /edit
   * صفحات تفاصيل.
   */

  const isCentralCustodyPage =
    pathname ===
    "/custodies/central";

  const personCustodyMatch =
    pathname.match(
      /^\/custodies\/person\/([^/]+)$/,
    );

  const personCustodyId =
    personCustodyMatch?.[1] ?? "";

  const isPersonCustodyPage =
    Boolean(personCustodyId);

  /*
   * ============================================================
   * رابط التقرير الكامل
   * ============================================================
   */

  const custodyReportHref =
    isCentralCustodyPage
      ? "/reports?custody=central"
      : isPersonCustodyPage
        ? `/reports?custody=${encodeURIComponent(
            personCustodyId,
          )}`
        : "";

  const showCustodyReportButton =
    Boolean(custodyReportHref);

  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900"
    >
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <AppHeader
        onMenuClick={openSidebar}
      />

      <div className="min-h-screen xl:mr-72">
        <main className="px-4 pb-5 pt-25 sm:px-6 sm:pb-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {showCustodyReportButton && (
              <div className="mb-5 flex justify-start">
                <Link
                  href={
                    custodyReportHref
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  <FileText className="h-4 w-4" />

                  التقرير الكامل
                </Link>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}