"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Search,
} from "lucide-react";

interface AppHeaderProps {
  onMenuClick: () => void;
}

export default function AppHeader({
  onMenuClick,
}: AppHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 h-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md xl:right-72">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
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
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
            aria-label="بحث"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
            aria-label="الإشعارات"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* User */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-slate-100 sm:gap-3 sm:px-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-sm">
              م
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-900">
                المدير
              </p>

              <p className="text-[11px] text-slate-500">
                Admin
              </p>
            </div>

            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}