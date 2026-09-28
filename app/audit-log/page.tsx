"use client";

import { formatDisplayDateTime } from "@/lib/formatters";
import { History, RefreshCw, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getAuditLogs } from "@/lib/data/audit-logs";
import type { AuditLog } from "@/types/audit-log";

const actionLabels: Record<AuditLog["action"], string> = {
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  transfer: "تحويل",
  reverse: "عكس حركة",
  system: "نظام",
  user: "مستخدم",
};

const entityLabels: Record<AuditLog["entity"], string> = {
  expense: "مصروف",
  project: "مشروع",
  worker: "عامل",
  worker_financial_movement: "حركة مالية لعامل",
  custody: "عهدة",
  custody_transaction: "حركة عهدة",
  custody_financial_account: "حساب مالي",
  expense_category: "تصنيف مصروف",
  transfer: "تحويل",
  system: "النظام",
  user: "مستخدم",
  contractor: "مقاول",
  project_site: "موقع مشروع",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const loadLogs = () => setLogs(getAuditLogs());

  useEffect(() => {
    loadLogs();

    const handleUpdate = () => loadLogs();
    window.addEventListener("elsaghir-audit-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("elsaghir-audit-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <History className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-600">المراقبة والمراجعة</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  سجل العمليات
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  سجل مركزي يوضح العمليات والتعديلات التي تمت على بيانات النظام ومن قام بها ووقتها.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadLogs}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="تحديث السجل"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {logs.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <History className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-700">لا توجد عمليات مسجلة حتى الآن</p>
              <p className="mt-1 text-xs text-slate-400">ستظهر هنا عمليات الإضافة والتعديل والحذف والتحويلات.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <article key={log.id} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          {actionLabels[log.action]}
                        </span>
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                          {entityLabels[log.entity]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{log.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span>بواسطة: {log.actor.userName}</span>
                        <span>{formatDisplayDateTime(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
