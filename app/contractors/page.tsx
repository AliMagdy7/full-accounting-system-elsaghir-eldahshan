"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  HardHat,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  ArrowLeft,
} from "lucide-react";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canCurrentUser } from "@/lib/permission-check";
import {
  addContractor,
  deleteContractor,
  getContractors,
  getContractorFinancialSummary,
  updateContractor,
} from "@/lib/data/contractors";
import type { Contractor } from "@/types/contractor";
import { getActiveContractorSiteAssignments } from "@/lib/data/contractor-site-assignments";
import { getProjectSites } from "@/lib/data/project-sites";

const money = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export default function ContractorsPage() {
  const [items, setItems] = useState<Contractor[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [notes, setNotes] = useState("");
  const [totalWork, setTotalWork] = useState("0");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const load = () => setItems(getContractors());

  useEffect(() => {
    load();
  }, []);

  const siteNames = useMemo(
    () => new Map(getProjectSites().map((site) => [site.id, site.name])),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) =>
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.phone?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, item) => {
          const summary = getContractorFinancialSummary(item.id);
          acc.paid += summary.totalPaid;
          acc.remaining += summary.remaining;
          return acc;
        },
        { paid: 0, remaining: 0 },
      ),
    [filtered],
  );

  const resetForm = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setNationalId("");
    setNotes("");
    setTotalWork("0");
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (item: Contractor) => {
    setEditing(item);
    setName(item.name);
    setPhone(item.phone ?? "");
    setNationalId(item.nationalId ?? "");
    setNotes(item.notes ?? "");
    setTotalWork(String(item.totalWork ?? 0));
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    resetForm();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const normalizedTotalWork = Number(totalWork.replace(/,/g, ""));
    if (!trimmedName) {
      setError("من فضلك أدخل اسم المقاول.");
      return;
    }
    if (!Number.isFinite(normalizedTotalWork) || normalizedTotalWork < 0) {
      setError("إجمالي الأعمال يجب أن يكون رقمًا صحيحًا يساوي صفرًا أو أكثر.");
      return;
    }

    setIsSaving(true);

    try {
      if (editing) {
        updateContractor(editing.id, {
          name: trimmedName,
          phone: phone.trim(),
          nationalId: nationalId.trim(),
          notes: notes.trim(),
          totalWork: normalizedTotalWork,
        });
      } else {
        addContractor({
          name: trimmedName,
          phone: phone.trim(),
          nationalId: nationalId.trim(),
          notes: notes.trim(),
          totalWork: normalizedTotalWork,
        });
      }

      setIsModalOpen(false);
      resetForm();
      load();
    } catch (errorValue) {
      setError(
        errorValue instanceof Error
          ? errorValue.message
          : "حدث خطأ أثناء حفظ بيانات المقاول.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = (id: string) => {
    const contractor = items.find((item) => item.id === id);

    confirm(
      {
        title: "تأكيد حذف المقاول",
        description: `هل أنت متأكد من حذف ${contractor?.name ? `المقاول «${contractor.name}»` : "هذا المقاول"}؟ لا يمكن التراجع عن هذا الإجراء.`,
        confirmText: "حذف المقاول",
        cancelText: "إلغاء",
        variant: "danger",
      },
      () => {
        try {
          deleteContractor(id);
          load();
        } catch (errorValue) {
          setError(
            errorValue instanceof Error
              ? errorValue.message
              : "تعذر حذف المقاول.",
          );
        }
      },
    );
  };

  return (
    <AppShell>
      <div dir="rtl" className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ui-fade-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <HardHat className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-blue-600">
                  إدارة المقاولين
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                المقاولون
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                إدارة بيانات المقاولين ومتابعة السلف والمدفوعات المرتبطة بهم.
              </p>
            </div>

            {canCurrentUser("create") && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                إضافة مقاول
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="accounting-card ui-fade-up p-5">
            <p className="text-sm text-slate-500">إجمالي المقاولين</p>
            <p className="accounting-number mt-2 text-2xl font-extrabold text-slate-900">
              {filtered.length}
            </p>
          </div>

          <div className="accounting-card ui-fade-up p-5">
            <p className="text-sm text-slate-500">إجمالي الأعمال</p>
            <p className="accounting-number mt-2 text-2xl font-extrabold text-slate-900">
              {money(filtered.reduce((sum, item) => sum + Number(item.totalWork || 0), 0))} <span className="text-sm font-bold">جنيه</span>
            </p>
          </div>

          <div className="accounting-card ui-fade-up p-5">
            <p className="text-sm text-slate-500">إجمالي السلف</p>
            <p className="accounting-number mt-2 text-2xl font-extrabold text-slate-900">
              {money(totals.paid)} <span className="text-sm font-bold">جنيه</span>
            </p>
          </div>

          <div className="accounting-card ui-fade-up p-5">
            <p className="text-sm text-slate-500">إجمالي المتبقي</p>
            <p className="accounting-number mt-2 text-2xl font-extrabold text-slate-900">
              {money(totals.remaining)} <span className="text-sm font-bold">جنيه</span>
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ui-fade-up">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث عن المقاول..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm transition-all focus:bg-white"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <HardHat className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-extrabold text-slate-700">
                لا يوجد مقاولون مسجلون
              </p>
              <p className="mt-1 text-xs text-slate-400">
                أضف أول مقاول لبدء متابعة الحسابات والمدفوعات.
              </p>
              {canCurrentUser("create") && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  إضافة أول مقاول
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const summary = getContractorFinancialSummary(item.id);

                return (
                  <div
                    key={item.id}
                    className="group flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-slate-900">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.phone || "بدون هاتف"}
                        {item.nationalId ? ` • ${item.nationalId}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-400">المواقع الحالية:</span>
                        {getActiveContractorSiteAssignments(item.id).length === 0 ? (
                          <span className="text-[11px] font-semibold text-slate-400">لا يوجد</span>
                        ) : (
                          getActiveContractorSiteAssignments(item.id).map((assignment) => (
                            <span key={assignment.id} className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                              {siteNames.get(assignment.siteId) ?? "موقع غير معروف"}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-5 text-right">
                      <div>
                        <p className="text-[11px] text-slate-400">الأعمال</p>
                        <p className="accounting-number mt-1 font-extrabold text-slate-900">
                          {money(summary.totalWork)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">السلف</p>
                        <p className="accounting-number mt-1 font-extrabold text-slate-900">
                          {money(summary.totalAdvances)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">المتبقي</p>
                        <p
                          className={`accounting-number mt-1 font-extrabold ${
                            summary.remaining < 0 ? "text-red-600" : "text-slate-900"
                          }`}
                        >
                          {money(summary.remaining)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/contractors/${item.id}`}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-sm"
                      >
                        فتح الحساب
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      {canCurrentUser("update") && (
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                        >
                          <Pencil className="h-4 w-4" />
                          تعديل
                        </button>
                      )}

                      {canCurrentUser("delete") && (
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm ui-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contractor-dialog-title"
            className="ui-modal w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="contractor-dialog-title"
                  className="text-lg font-black text-slate-900"
                >
                  {editing ? "تعديل مقاول" : "إضافة مقاول جديد"}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  أدخل بيانات المقاول الأساسية.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ui-shake"
                >
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    اسم المقاول
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="مثال: محمد حسن"
                    className="h-11 w-full px-3 text-sm font-semibold"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="h-11 w-full px-3 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    الرقم القومي
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(event) => setNationalId(event.target.value)}
                    placeholder="الرقم القومي"
                    className="h-11 w-full px-3 text-sm font-semibold"
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    إجمالي قيمة الأعمال
                  </label>
                  <input
                    type="text"
                    value={totalWork}
                    onChange={(event) => setTotalWork(event.target.value)}
                    placeholder="0"
                    className="h-11 w-full px-3 text-sm font-semibold"
                    inputMode="decimal"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    ملاحظات
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="ملاحظات اختيارية"
                    className="h-11 w-full px-3 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {dialog}
    </AppShell>
  );
}
