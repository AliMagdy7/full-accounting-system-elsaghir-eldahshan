"use client";

import { formatDisplayDateTime } from "@/lib/formatters";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  X,
  FolderKanban,
  HardHat,
  Wallet,
  Receipt,
  ArrowLeft,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getProjects } from "@/lib/data/projects";
import { getWorkers } from "@/lib/data/workers";
import { getCustodies } from "@/lib/data/custodies";
import { getExpenses } from "@/lib/data/expenses";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/data/notifications";
import type { Notification } from "@/types/notification";
import { clearCurrentSession, getCurrentSession } from "@/lib/data/users";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

interface AppHeaderProps {
  onMenuClick: () => void;
}

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "project" | "worker" | "custody" | "expense";
  icon: typeof FolderKanban;
};

export default function AppHeader({
  onMenuClick,
}: AppHeaderProps) {
  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchValue, setSearchValue] =
    useState("");

  const [results, setResults] =
    useState<SearchResult[]>([]);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [userMenuOpen, setUserMenuOpen] =
    useState(false);

  const [currentSession, setCurrentSession] = useState(() => getCurrentSession());
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const searchContainerRef =
    useRef<HTMLDivElement>(null);

  const notificationsRef =
    useRef<HTMLDivElement>(null);

  const userMenuRef =
    useRef<HTMLDivElement>(null);

  const [dataVersion, setDataVersion] =
    useState(0);

  const loadNotifications = () => {
    setNotifications(getNotifications().slice(0, 12));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setDataVersion((current) => current + 1);
      setCurrentSession(getCurrentSession());
      loadNotifications();
    };

    loadNotifications();

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    window.addEventListener(
      "elsaghir-data-updated",
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );

      window.removeEventListener(
        "elsaghir-data-updated",
        handleStorageChange,
      );
    };
  }, []);

  const searchData = useMemo<SearchResult[]>(() => {
    void dataVersion;

    const projectResults: SearchResult[] =
      getProjects().map((project) => ({
        id: `project-${project.id}`,
        title: project.name,
        subtitle: "مشروع / موقع",
        href: `/projects/${project.id}`,
        type: "project",
        icon: FolderKanban,
      }));

    const workerResults: SearchResult[] =
      getWorkers().map((worker) => ({
        id: `worker-${worker.id}`,
        title: worker.name,
        subtitle: "عامل",
        href: `/workers/${worker.id}`,
        type: "worker",
        icon: HardHat,
      }));

    const custodyResults: SearchResult[] =
      getCustodies().map((custody) => ({
        id: `custody-${custody.id}`,
        title: custody.name,
        subtitle:
          custody.type === "central"
            ? "العهدة المركزية"
            : custody.type === "project"
              ? "عهدة مشروع"
              : custody.type === "worker"
                ? "عهدة عامل"
                : "عهدة شخص",
        href:
          custody.type === "central"
            ? "/custodies/central"
            : custody.type === "person"
              ? `/custodies/person/${custody.id}`
              : `/custodies`,
        type: "custody",
        icon: Wallet,
      }));

    const expenseResults: SearchResult[] =
      getExpenses().map((expense) => ({
        id: `expense-${expense.id}`,
        title: expense.description,
        subtitle: `مصروف — ${expense.amount.toLocaleString(
          "en-US",
        )} ج.م`,
        href: "/expenses",
        type: "expense",
        icon: Receipt,
      }));

    return [
      ...projectResults,
      ...workerResults,
      ...custodyResults,
      ...expenseResults,
    ];
  }, [dataVersion]);

  useEffect(() => {
    const query =
      searchValue.trim().toLowerCase();

    if (!query) {
      setResults([]);
      return;
    }

    const filtered =
      searchData
        .filter((item) => {
          const title =
            item.title.toLowerCase();

          const subtitle =
            item.subtitle.toLowerCase();

          return (
            title.includes(query) ||
            subtitle.includes(query)
          );
        })
        .slice(0, 12);

    setResults(filtered);
  }, [searchValue, searchData]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as Node;

      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(
          target,
        )
      ) {
        setSearchOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(
          target,
        )
      ) {
        setNotificationsOpen(false);
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }

      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const target =
          event.target as HTMLElement | null;

        const tagName =
          target?.tagName?.toLowerCase();

        if (
          tagName === "input" ||
          tagName === "textarea" ||
          target?.isContentEditable
        ) {
          return;
        }

        event.preventDefault();
        setSearchOpen(true);
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
  }, []);

  const openSearch = () => {
    setSearchOpen(true);
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchValue("");
    setResults([]);
  };

  const toggleNotifications = () => {
    loadNotifications();
    setNotificationsOpen(
      (current) => !current,
    );

    setSearchOpen(false);
    setUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(
      (current) => !current,
    );

    setSearchOpen(false);
    setNotificationsOpen(false);
  };

  const getRoleLabel = (role?: string) => {
    if (role === "admin") return "مدير النظام";
    if (role === "accountant") return "محاسب";
    return "مشاهد";
  };

  const getUserInitial = (name?: string) => name?.trim().slice(0, 1) || "م";

  const getResultIconClass = (
    type: SearchResult["type"],
  ) => {
    if (type === "project") {
      return "bg-blue-50 text-blue-600";
    }

    if (type === "worker") {
      return "bg-amber-50 text-amber-600";
    }

    if (type === "custody") {
      return "bg-emerald-50 text-emerald-600";
    }

    return "bg-slate-100 text-slate-600";
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md xl:right-72">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Right Side */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile Menu */}
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 xl:hidden"
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
              لوحة التحكم
            </h2>

            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
              نظام المحاسبة والإدارة
            </p>
          </div>
        </div>

        {/* Left Side */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Search */}
          <div
            ref={searchContainerRef}
            className="relative"
          >
            <button
              type="button"
              onClick={searchOpen ? closeSearch : openSearch}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                searchOpen
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
              aria-label="بحث"
            >
              {searchOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>

            {searchOpen && (
              <div className="absolute left-0 top-12 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="border-b border-slate-100 p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-colors focus-within:border-slate-400 focus-within:bg-white">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />

                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchValue}
                      onChange={(event) =>
                        setSearchValue(
                          event.target.value,
                        )
                      }
                      placeholder="ابحث عن مشروع، عامل، عهدة، مصروف..."
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />

                    {searchValue && (
                      <button
                        type="button"
                        onClick={() =>
                          setSearchValue("")
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        aria-label="مسح البحث"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
                    <span>
                      ابحث داخل بيانات النظام
                    </span>

                    <span className="hidden sm:inline">
                      اضغط / للبحث
                    </span>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto p-2">
                  {!searchValue.trim() ? (
                    <div className="px-4 py-8 text-center">
                      <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />

                      <p className="text-sm font-semibold text-slate-700">
                        ابدأ البحث
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        ابحث عن مشروع أو عامل أو
                        عهدة أو مصروف
                      </p>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />

                      <p className="text-sm font-semibold text-slate-700">
                        لا توجد نتائج
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        جرّب كتابة كلمة مختلفة
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {results.map((result) => {
                        const Icon =
                          result.icon;

                        return (
                          <Link
                            key={result.id}
                            href={result.href}
                            onClick={closeSearch}
                            className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50"
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getResultIconClass(
                                result.type,
                              )}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {result.title}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {result.subtitle}
                              </p>
                            </div>

                            <ArrowLeft className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-slate-600" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div
            ref={notificationsRef}
            className="relative"
          >
            <button
              type="button"
              onClick={toggleNotifications}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                notificationsOpen
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
              aria-label="الإشعارات"
              aria-expanded={
                notificationsOpen
              }
            >
              <Bell className="h-5 w-5" />

              {getUnreadNotificationCount() > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
                  {getUnreadNotificationCount() > 99
                    ? "99+"
                    : getUnreadNotificationCount()}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute left-0 top-12 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      الإشعارات
                    </h3>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      آخر التنبيهات في النظام
                    </p>
                  </div>

                  {getUnreadNotificationCount() > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        markAllNotificationsAsRead();
                        loadNotifications();
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                    >
                      تعليم الكل كمقروء
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <Bell className="h-5 w-5 text-slate-400" />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      لا توجد إشعارات
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      ستظهر هنا التنبيهات المهمة عند وجودها
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto p-2">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          markNotificationAsRead(notification.id);
                          loadNotifications();
                          if (notification.href) {
                            window.location.href = notification.href;
                          }
                        }}
                        className={`w-full rounded-xl p-3 text-right transition-colors hover:bg-slate-50 ${
                          notification.read ? "bg-white" : "bg-blue-50/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-extrabold text-slate-800">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                              )}
                            </div>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              {formatDisplayDateTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-100 p-2">
                  <Link
                    href="/audit-log"
                    onClick={() => setNotificationsOpen(false)}
                    className="flex items-center justify-center rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    فتح سجل العمليات الكامل
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User */}
          <div
            ref={userMenuRef}
            className="relative"
          >
            <button
              type="button"
              onClick={toggleUserMenu}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-200 sm:gap-3 sm:px-3 ${
                userMenuOpen
                  ? "bg-slate-100"
                  : "hover:bg-slate-100"
              }`}
              aria-label="قائمة المستخدم"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-sm">
                {getUserInitial(currentSession?.userName)}
              </div>

              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-slate-900">
                  {currentSession?.userName ?? "المدير"}
                </p>

                <p className="text-[11px] text-slate-500">
                  {getRoleLabel(currentSession?.role)}
                </p>
              </div>

              <ChevronDown
                className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                  userMenuOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute left-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-base font-bold text-white">
                      {getUserInitial(currentSession?.userName)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {currentSession?.userName ?? "المدير"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {getRoleLabel(currentSession?.role)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <UserRound className="h-4 w-4 text-slate-500" />
                    </div>
                    <span>الملف الشخصي</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() =>
                      setUserMenuOpen(false)
                    }
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <ChevronDown className="h-4 w-4 rotate-[-90deg] text-slate-500" />
                    </div>

                    <span>
                      الإعدادات
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      confirm(
                        {
                          title: "تسجيل الخروج",
                          description: "هل أنت متأكد أنك تريد تسجيل الخروج من الحساب الحالي؟",
                          confirmText: "تسجيل الخروج",
                          cancelText: "البقاء في النظام",
                          variant: "danger",
                        },
                        () => {
                          clearCurrentSession();
                          setCurrentSession(null);
                          setUserMenuOpen(false);
                          window.location.href = "/login";
                        },
                      );
                    }}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                      <X className="h-4 w-4" />
                    </div>
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
      {confirmDialog}
    </>
  );
}