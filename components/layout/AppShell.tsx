"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  FileText,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import { getCurrentSession } from "@/lib/data/users";
import { hasPermission } from "@/lib/auth-permissions";
import { maybeAutomaticBackup } from "@/lib/data/system-controls";
import { useWorkspaceEmbedded } from "./WorkspaceContext";

interface AppShellProps {
  children: React.ReactNode;
}

const AppShellContext = createContext(false);

export function useAppShell(): boolean {
  return useContext(AppShellContext);
}

export default function AppShell({
  children,
}: AppShellProps) {
  const shellAlreadyMounted = useAppShell();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const workspaceEmbedded = useWorkspaceEmbedded();
  const searchParams = useSearchParams();
  const standaloneEmbedded = searchParams.get("embedded") === "1";
  const pathname = usePathname();
  const router = useRouter();

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (shellAlreadyMounted || pathname === "/login") {
      return;
    }

    const session = getCurrentSession();

    if (!session) {
      router.replace("/login");
      setAuthReady(false);
      return;
    }

    setAuthReady(true);
    maybeAutomaticBackup();

    const role = session?.role ?? "admin";
    const needsCreate =
      /\/(expenses|projects|transfers)\/new$/.test(pathname) ||
      /\/custodies\/(central|person)\/new$/.test(pathname);
    const needsUpdate = /^\/projects\/[^/]+\/edit$/.test(pathname);
    const needsAdmin = pathname === "/users";
    const needsAudit = pathname === "/audit-log";

    if (
      (needsCreate && !hasPermission(role, "create")) ||
      (needsUpdate && !hasPermission(role, "update")) ||
      (needsAdmin && !hasPermission(role, "manage_users")) ||
      (needsAudit && !hasPermission(role, "audit"))
    ) {
      router.replace("/");
    }

    const handleAuthUpdate = () => {
      if (!getCurrentSession()) {
        setAuthReady(false);
        router.replace("/login");
      } else {
        setAuthReady(true);
      }
    };

    window.addEventListener("elsaghir-auth-updated", handleAuthUpdate);

    return () =>
      window.removeEventListener("elsaghir-auth-updated", handleAuthUpdate);
  }, [pathname, router, shellAlreadyMounted]);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const isCentralCustodyPage = pathname === "/custodies/central";

  const personCustodyMatch = pathname.match(
    /^\/custodies\/person\/([^/]+)$/,
  );

  const personCustodyId = personCustodyMatch?.[1] ?? "";

  const isPersonCustodyPage = Boolean(personCustodyId);

  const custodyReportHref = isCentralCustodyPage
    ? "/reports?custody=central"
    : isPersonCustodyPage
      ? `/reports?custody=${encodeURIComponent(personCustodyId)}`
      : "";

  const showCustodyReportButton = Boolean(custodyReportHref);

  if (shellAlreadyMounted) {
    return <>{children}</>;
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!authReady) {
    return null;
  }

  if (workspaceEmbedded || standaloneEmbedded) {
    return <>{children}</>;
  }

  return (
    <AppShellContext.Provider value>
      <div
        dir="rtl"
        className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900"
      >
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />

        <AppHeader onMenuClick={openSidebar} />

        <div className="min-h-screen xl:mr-72">
          <main className="px-4 pb-5 pt-25 sm:px-6 sm:pb-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px]">
              {showCustodyReportButton && (
                <div className="mb-5 flex justify-start">
                  <Link
                    href={custodyReportHref}
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
    </AppShellContext.Provider>
  );
}
