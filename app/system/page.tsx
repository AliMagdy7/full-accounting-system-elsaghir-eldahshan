"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import AppShell from "@/components/layout/AppShell";

const sectionTitles: Record<string, string> = {
  "/": "الرئيسية",
  "/custodies": "العهد",
  "/projects": "المشاريع والمواقع",
  "/workers": "العمال",
  "/contractors": "المقاولون",
  "/expenses": "المصروفات",
  "/transfers": "التحويلات",
  "/companies": "الشركات",
  "/settlements": "المستخلصات",
  "/checks": "الشيكات",
  "/partner-accounts": "حسابات الحجاج",
  "/financial-reports": "التقارير المالية",
  "/assets": "أصول الشركة",
  "/treasury": "الخزينة والبنوك",
  "/suppliers": "الموردون",
  "/account-statement": "كشف الحساب الموحد",
  "/purchases": "المشتريات والفواتير",
  "/periods": "إقفال الفترات",
  "/approvals": "الموافقات",
  "/documents": "مركز المستندات",
  "/reports": "التقارير",
  "/reports/company-settlements": "تقارير الشركات",
  "/admin-dashboard": "لوحة الإدارة",
  "/admin-reports": "التقارير الإدارية",
  "/audit": "سجل التدقيق",
  "/integrity": "فحص السلامة",
  "/users": "المستخدمون والصلاحيات",
  "/settings": "الإعدادات",
  "/search": "البحث الشامل",
  "/notifications": "الإشعارات",
  "/profile": "الملف الشخصي",
  "/backup": "النسخ الاحتياطي",
  "/import-export": "التصدير والاستيراد",
  "/timeline": "التسلسل الزمني",
  "/permissions": "الصلاحيات",
  "/audit-log": "سجل التدقيق",
};

function getSectionPath(section: string | null): string {
  if (!section) return "/";

  try {
    return decodeURIComponent(section).split("#")[0].split("?")[0] || "/";
  } catch {
    return section.split("#")[0].split("?")[0] || "/";
  }
}

function getEmbeddedUrl(section: string): string {
  if (!section || section === "/") return "/?embedded=1";

  try {
    const decoded = decodeURIComponent(section);
    const separator = decoded.includes("?") ? "&" : "?";
    return `${decoded}${separator}embedded=1`;
  } catch {
    const separator = section.includes("?") ? "&" : "?";
    return `${section}${separator}embedded=1`;
  }
}

function SystemWorkspacePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawSection = searchParams.get("section") ?? "/";
  const sectionPath = getSectionPath(rawSection);
  const title = sectionTitles[sectionPath] ?? "النظام";

  const [loadedSections, setLoadedSections] = useState<string[]>([sectionPath]);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const activeSectionRef = useRef(sectionPath);

  const sections = useMemo(
    () => Array.from(new Set(loadedSections)),
    [loadedSections],
  );

  useEffect(() => {
    activeSectionRef.current = sectionPath;

    setLoadedSections((current) =>
      current.includes(sectionPath) ? current : [...current, sectionPath],
    );
  }, [sectionPath]);

  const navigateToSection = useCallback(
    (path: string) => {
      const normalized = path || "/";
      const nextSection = encodeURIComponent(normalized);
      const currentSection = searchParams.get("section") ?? "/";

      if (currentSection === normalized) return;

      router.push(`/system?section=${nextSection}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    const handleWorkspaceNavigation = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== "elsaghir-workspace-navigation") return;
      if (typeof event.data.path !== "string") return;

      navigateToSection(event.data.path);
    };

    window.addEventListener("message", handleWorkspaceNavigation);
    return () => window.removeEventListener("message", handleWorkspaceNavigation);
  }, [navigateToSection]);

  useEffect(() => {
    const frame = iframeRefs.current[sectionPath];
    if (!frame) return;

    const publishNavigation = () => {
      if (!frame.contentWindow) return;

      try {
        const current = new URL(frame.contentWindow.location.href);

        if (current.pathname === "/system" || current.pathname === "/login") return;

        current.searchParams.delete("embedded");

        window.postMessage(
          {
            type: "elsaghir-workspace-navigation",
            path: `${current.pathname}${current.search}${current.hash}`,
          },
          window.location.origin,
        );
      } catch {
        // The iframe may not be ready yet. The load handler will retry.
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/system")) return;

      try {
        const url = new URL(href, window.location.origin);
        const nextSection = url.searchParams.get("section");
        if (!nextSection) return;

        event.preventDefault();
        navigateToSection(decodeURIComponent(nextSection));
      } catch {
        // Let the browser handle malformed links normally.
      }
    };

    const handleLoad = () => {
      frame.contentDocument?.addEventListener("click", handleClick, true);
      publishNavigation();
    };

    frame.addEventListener("load", handleLoad);

    if (frame.contentDocument?.readyState === "complete") {
      frame.contentDocument.addEventListener("click", handleClick, true);
    }

    return () => {
      frame.removeEventListener("load", handleLoad);
      frame.contentDocument?.removeEventListener("click", handleClick, true);
    };
  }, [sectionPath, sections]);

  useEffect(() => {
    const handlePopState = () => {
      const frame = iframeRefs.current[activeSectionRef.current];
      if (!frame?.contentWindow) return;

      try {
        const current = new URL(frame.contentWindow.location.href);
        current.searchParams.delete("embedded");
        navigateToSection(
          `${current.pathname}${current.search}${current.hash}`,
        );
      } catch {
        // Ignore history synchronization failures.
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigateToSection]);

  return (
    <AppShell>
      <div dir="rtl" className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-[11px] font-black tracking-wide text-blue-600">
              مساحة النظام
            </p>
            <h1 className="mt-1 text-lg font-black text-slate-900">
              {title}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => navigateToSection("/")}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
          >
            العودة للرئيسية
          </button>
        </div>

        <div className="relative min-h-[680px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {sections.map((section) => {
            const isActive = section === sectionPath;
            const src = getEmbeddedUrl(section);

            return (
              <iframe
                key={section}
                ref={(element) => {
                  iframeRefs.current[section] = element;
                }}
                src={src}
                title={sectionTitles[section] ?? "النظام"}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                className={`block h-[calc(100vh-205px)] min-h-[680px] w-full border-0 bg-slate-50 transition-opacity duration-150 ${
                  isActive
                    ? "relative opacity-100"
                    : "pointer-events-none absolute inset-0 opacity-0"
                }`}
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

export default function SystemWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              جاري تحميل مساحة النظام...
            </p>
          </div>
        </div>
      }
    >
      <SystemWorkspacePageContent />
    </Suspense>
  );
}
