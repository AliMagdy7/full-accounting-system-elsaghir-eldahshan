"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CircleDollarSign,
  FileText,
  HardHat,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  X,
  RefreshCw,
  RotateCcw,
  Filter,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import DateInput from "@/lib/date-input";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canCurrentUser } from "@/lib/permission-check";
import {
  getContractorById,
  getContractorFinancialSummary,
  updateContractor,
} from "@/lib/data/contractors";
import {
  addContractorNote,
  deleteContractorNote,
  getContractorNotes,
  updateContractorNote,
} from "@/lib/data/contractor-notes";
import { getExpenses } from "@/lib/data/expenses";
import { getProjects } from "@/lib/data/projects";
import { getCustodies } from "@/lib/data/custodies";
import { getProjectSites, subscribeToProjectSites } from "@/lib/data/project-sites";
import {
  addContractorSiteAssignment,
  deleteContractorSiteAssignment,
  getContractorSiteAssignments,
  updateContractorSiteAssignment,
} from "@/lib/data/contractor-site-assignments";
import { formatDisplayDate } from "@/lib/formatters";
import type { Contractor } from "@/types/contractor";
import type { ContractorNote, ContractorNoteImage } from "@/types/contractor-note";
import type { ContractorSiteAssignment } from "@/types/contractor-site-assignment";
import type { ProjectSite } from "@/types/project-site";
import type { Expense } from "@/types/expense";

const money = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.78;

async function compressImage(file: File): Promise<ContractorNoteImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("يمكن إرفاق الصور فقط.");
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("تعذر قراءة الصورة."));
      element.src = sourceUrl;
    });

    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذر تجهيز الصورة.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    return {
      id: crypto.randomUUID(),
      name: file.name,
      dataUrl,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export default function ContractorDetailsPage() {
  const params = useParams<{ id: string }>();
  const contractorId = params.id;
  const { confirm, dialog } = useConfirmDialog();

  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [notes, setNotes] = useState<ContractorNote[]>([]);
  const [advances, setAdvances] = useState<Expense[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ContractorNote | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteImages, setNoteImages] = useState<ContractorNoteImage[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [viewerImage, setViewerImage] = useState<ContractorNoteImage | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [workValue, setWorkValue] = useState("0");
  const [workError, setWorkError] = useState("");
  const [savingWork, setSavingWork] = useState(false);
  const [siteAssignments, setSiteAssignments] = useState<ContractorSiteAssignment[]>([]);
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSiteAssignment, setEditingSiteAssignment] = useState<ContractorSiteAssignment | null>(null);
  const [siteId, setSiteId] = useState("");
  const [siteStartDate, setSiteStartDate] = useState("");
  const [siteEndDate, setSiteEndDate] = useState("");
  const [siteNotes, setSiteNotes] = useState("");
  const [siteError, setSiteError] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [advanceFromDate, setAdvanceFromDate] = useState("");
  const [advanceToDate, setAdvanceToDate] = useState("");
  const [advanceCustodyFilter, setAdvanceCustodyFilter] = useState("");
  const [advanceProjectFilter, setAdvanceProjectFilter] = useState("");
  const [advanceSiteFilter, setAdvanceSiteFilter] = useState("");

  const load = () => {
    const current = getContractorById(contractorId);
    setContractor(current ?? null);
    setNotes(getContractorNotes(contractorId));
    setSiteAssignments(getContractorSiteAssignments(contractorId));
    setSites(getProjectSites());
    setAdvances(
      getExpenses()
        .filter(
          (expense) =>
            expense.contractorId === contractorId &&
            expense.movementType === "contractor_advance",
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
  };

  useEffect(() => {
    load();

    const refreshSites = () => {
      setSites(getProjectSites());
    };

    const unsubscribe = subscribeToProjectSites(refreshSites);
    window.addEventListener("pageshow", refreshSites);
    window.addEventListener("focus", refreshSites);

    return () => {
      unsubscribe();
      window.removeEventListener("pageshow", refreshSites);
      window.removeEventListener("focus", refreshSites);
    };
  }, [contractorId]);

  useEffect(() => {
    if (!viewerImage && !isNoteModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewerImage(null);
        if (isNoteModalOpen && !savingNote) closeNoteModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerImage, isNoteModalOpen, savingNote]);

  const summary = useMemo(
    () => (contractor ? getContractorFinancialSummary(contractor.id) : null),
    [contractor, advances],
  );

  const projects = useMemo(() => getProjects(), []);
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const siteNames = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name])),
    [sites],
  );

  const siteProjects = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const advanceSiteNames = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name])),
    [sites],
  );

  const custodies = useMemo(() => getCustodies(), [advances]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((expense) => {
      if (advanceFromDate && expense.date < advanceFromDate) return false;
      if (advanceToDate && expense.date > advanceToDate) return false;
      if (advanceCustodyFilter && expense.custodyId !== advanceCustodyFilter) return false;
      if (advanceProjectFilter && expense.projectId !== advanceProjectFilter) return false;
      if (advanceSiteFilter && expense.siteId !== advanceSiteFilter) return false;
      return true;
    });
  }, [
    advances,
    advanceFromDate,
    advanceToDate,
    advanceCustodyFilter,
    advanceProjectFilter,
    advanceSiteFilter,
  ]);

  const filteredAdvanceTotal = useMemo(
    () => filteredAdvances.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [filteredAdvances],
  );

  const resetAdvanceFilters = () => {
    setAdvanceFromDate("");
    setAdvanceToDate("");
    setAdvanceCustodyFilter("");
    setAdvanceProjectFilter("");
    setAdvanceSiteFilter("");
  };

  const openCreateSiteAssignment = () => {
    setSites(getProjectSites());
    setEditingSiteAssignment(null);
    setSiteId("");
    setSiteStartDate(new Date().toISOString().slice(0, 10));
    setSiteEndDate("");
    setSiteNotes("");
    setSiteError("");
    setIsSiteModalOpen(true);
  };

  const openEditSiteAssignment = (assignment: ContractorSiteAssignment) => {
    setSites(getProjectSites());
    setEditingSiteAssignment(assignment);
    setSiteId(assignment.siteId);
    setSiteStartDate(assignment.startDate);
    setSiteEndDate(assignment.endDate ?? "");
    setSiteNotes(assignment.notes ?? "");
    setSiteError("");
    setIsSiteModalOpen(true);
  };

  const closeSiteModal = () => {
    if (savingSite) return;
    setIsSiteModalOpen(false);
    setEditingSiteAssignment(null);
    setSiteId("");
    setSiteStartDate("");
    setSiteEndDate("");
    setSiteNotes("");
    setSiteError("");
  };

  const saveSiteAssignment = () => {
    setSiteError("");
    if (!siteId) {
      setSiteError("اختر الموقع أولًا.");
      return;
    }
    if (!siteStartDate) {
      setSiteError("تاريخ بداية الفترة مطلوب.");
      return;
    }
    if (siteEndDate && siteEndDate < siteStartDate) {
      setSiteError("تاريخ نهاية الفترة يجب أن يكون بعد تاريخ البداية.");
      return;
    }

    setSavingSite(true);
    try {
      if (editingSiteAssignment) {
        updateContractorSiteAssignment(editingSiteAssignment.id, {
          siteId,
          startDate: siteStartDate,
          endDate: siteEndDate || undefined,
          notes: siteNotes,
        });
      } else {
        addContractorSiteAssignment({
          contractorId,
          siteId,
          startDate: siteStartDate,
          endDate: siteEndDate || undefined,
          notes: siteNotes,
        });
      }
      closeSiteModal();
      load();
    } catch (errorValue) {
      setSiteError(
        errorValue instanceof Error
          ? errorValue.message
          : "تعذر حفظ ارتباط المقاول بالموقع.",
      );
    } finally {
      setSavingSite(false);
    }
  };

  const removeSiteAssignment = (assignment: ContractorSiteAssignment) => {
    const siteName = siteNames.get(assignment.siteId) ?? "هذا الموقع";
    confirm(
      {
        title: "تأكيد حذف فترة الموقع",
        description: `هل أنت متأكد من حذف فترة ارتباط المقاول بالموقع «${siteName}»؟ لا يمكن التراجع عن هذا الإجراء.`,
        confirmText: "حذف الفترة",
        cancelText: "إلغاء",
        variant: "danger",
      },
      () => {
        try {
          deleteContractorSiteAssignment(assignment.id);
          load();
        } catch (errorValue) {
          setSiteError(
            errorValue instanceof Error
              ? errorValue.message
              : "تعذر حذف فترة الموقع.",
          );
        }
      },
    );
  };

  const openWorkModal = () => {
    setWorkValue(String(contractor?.totalWork ?? 0));
    setWorkError("");
    setIsWorkModalOpen(true);
  };

  const closeWorkModal = () => {
    if (savingWork) return;
    setIsWorkModalOpen(false);
    setWorkError("");
  };

  const saveWorkValue = () => {
    if (!contractor) return;
    const normalized = Number(workValue.replace(/,/g, ""));
    if (!Number.isFinite(normalized) || normalized < 0) {
      setWorkError("إجمالي الأعمال يجب أن يكون رقمًا صحيحًا يساوي صفرًا أو أكثر.");
      return;
    }

    setSavingWork(true);
    setWorkError("");

    try {
      const updated = updateContractor(contractor.id, { totalWork: normalized });
      setContractor(updated);
      setIsWorkModalOpen(false);
    } catch (errorValue) {
      setWorkError(
        errorValue instanceof Error
          ? errorValue.message
          : "تعذر تحديث إجمالي الأعمال.",
      );
    } finally {
      setSavingWork(false);
    }
  };

  const openCreateNote = () => {
    setEditingNote(null);
    setNoteText("");
    setNoteImages([]);
    setNoteError("");
    setIsNoteModalOpen(true);
  };

  const openEditNote = (note: ContractorNote) => {
    setEditingNote(note);
    setNoteText(note.text);
    setNoteImages(note.images);
    setNoteError("");
    setIsNoteModalOpen(true);
  };

  function closeNoteModal() {
    if (savingNote) return;
    setIsNoteModalOpen(false);
    setEditingNote(null);
    setNoteText("");
    setNoteImages([]);
    setNoteError("");
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setNoteError("");

    try {
      const converted = await Promise.all(files.map(compressImage));
      setNoteImages((current) => [...current, ...converted]);
    } catch (errorValue) {
      setNoteError(
        errorValue instanceof Error
          ? errorValue.message
          : "تعذر إضافة الصورة.",
      );
    }
  };

  const removePendingImage = (imageId: string) => {
    setNoteImages((current) => current.filter((image) => image.id !== imageId));
  };

  const saveNote = () => {
    setNoteError("");

    if (!noteText.trim() && noteImages.length === 0) {
      setNoteError("اكتب الملاحظة أو أرفق صورة واحدة على الأقل.");
      return;
    }

    setSavingNote(true);

    try {
      if (editingNote) {
        updateContractorNote(editingNote.id, {
          text: noteText,
          images: noteImages,
        });
      } else {
        addContractorNote({
          contractorId,
          text: noteText,
          images: noteImages,
        });
      }

      closeNoteModal();
      load();
    } catch (errorValue) {
      setNoteError(
        errorValue instanceof Error
          ? errorValue.message
          : "حدث خطأ أثناء حفظ الملاحظة.",
      );
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = (note: ContractorNote) => {
    confirm(
      {
        title: "تأكيد حذف الملاحظة",
        description: "هل أنت متأكد من حذف هذه الملاحظة والصور المرفقة بها؟ لا يمكن التراجع عن هذا الإجراء.",
        confirmText: "حذف الملاحظة",
        cancelText: "إلغاء",
        variant: "danger",
      },
      () => {
        try {
          deleteContractorNote(note.id);
          load();
        } catch (errorValue) {
          setNoteError(
            errorValue instanceof Error
              ? errorValue.message
              : "تعذر حذف الملاحظة.",
          );
        }
      },
    );
  };

  if (!contractor) {
    return (
      <AppShell>
        <div dir="rtl" className="space-y-5">
          <Link
            href="/contractors"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للمقاولين
          </Link>
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <HardHat className="mx-auto h-10 w-10 text-slate-300" />
            <h1 className="mt-4 text-xl font-black text-slate-900">المقاول غير موجود</h1>
            <p className="mt-2 text-sm text-slate-500">قد يكون تم حذف المقاول أو أن الرابط غير صحيح.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div dir="rtl" className="app-page space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/contractors"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للمقاولين
          </Link>
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
            <HardHat className="h-4 w-4" />
            حساب المقاول
          </span>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ui-fade-up">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <HardHat className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600">ملف المقاول</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {contractor.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                  <span>{contractor.phone || "بدون هاتف"}</span>
                  {contractor.nationalId && <span>{contractor.nationalId}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canCurrentUser("update") && (
                <button
                  type="button"
                  onClick={openWorkModal}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل إجمالي الأعمال
                </button>
              )}
              {canCurrentUser("create") && (
                <button
                  type="button"
                  onClick={openCreateNote}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  إضافة ملاحظة ومستند
                </button>
              )}
            </div>
          </div>

          {contractor.notes && (
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-1 text-xs font-black text-slate-500">الملاحظة الأساسية</p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{contractor.notes}</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<CircleDollarSign className="h-5 w-5" />}
            label="إجمالي الأعمال"
            value={money(summary?.totalWork ?? 0)}
          />
          <SummaryCard
            icon={<ReceiptText className="h-5 w-5" />}
            label="إجمالي السلف"
            value={money(summary?.totalAdvances ?? 0)}
          />
          <SummaryCard
            icon={<WalletIcon />}
            label="عدد السلف"
            value={String(summary?.advanceCount ?? 0)}
          />
          <SummaryCard
            icon={<CircleDollarSign className="h-5 w-5" />}
            label="المتبقي من الأعمال"
            value={money(summary?.remaining ?? 0)}
            valueClass={summary && summary.remaining < 0 ? "text-red-600" : "text-slate-900"}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm ui-fade-up">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-black text-slate-900">المواقع وفترات العمل</h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                المقاول يمكن أن يكون مرتبطًا بأكثر من موقع في نفس الوقت، ولكل موقع فترة بداية ونهاية مستقلة.
              </p>
            </div>
            {canCurrentUser("create") && (
              <button
                type="button"
                onClick={openCreateSiteAssignment}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                إضافة موقع
              </button>
            )}
          </div>

          {siteError && !isSiteModalOpen && (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ui-shake">
              {siteError}
            </div>
          )}

          {siteAssignments.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-6 w-6" />}
              title="لا توجد مواقع مرتبطة بالمقاول"
              description="أضف الموقع الذي يعمل فيه المقاول وحدد فترة عمله. ويمكنك إضافة أكثر من موقع في نفس الوقت."
              action={canCurrentUser("create") ? openCreateSiteAssignment : undefined}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {siteAssignments.map((assignment) => {
                const site = sites.find((item) => item.id === assignment.siteId);
                const projectName = site ? siteProjects.get(site.projectId) : undefined;
                const isOpen = !assignment.endDate;

                return (
                  <article key={assignment.id} className="p-5 transition-colors hover:bg-slate-50/60">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {isOpen ? "فترة مفتوحة" : "فترة منتهية"}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {projectName ? `المشروع: ${projectName}` : "مشروع غير معروف"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-slate-900">{site?.name ?? "موقع غير موجود"}</h3>
                            {site?.address && <p className="mt-1 text-xs text-slate-400">{site.address}</p>}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[11px] font-bold text-slate-400">بداية الفترة</p>
                            <p className="mt-1 text-sm font-black text-slate-700">{formatDisplayDate(assignment.startDate)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[11px] font-bold text-slate-400">نهاية الفترة</p>
                            <p className="mt-1 text-sm font-black text-slate-700">{assignment.endDate ? formatDisplayDate(assignment.endDate) : "مستمرة حتى الآن"}</p>
                          </div>
                        </div>
                        {assignment.notes && (
                          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
                            <p className="text-[11px] font-black text-slate-400">ملاحظات الفترة</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{assignment.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {canCurrentUser("update") && (
                          <button type="button" onClick={() => openEditSiteAssignment(assignment)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50">
                            <Pencil className="h-3.5 w-3.5" />
                            تعديل
                          </button>
                        )}
                        {canCurrentUser("delete") && (
                          <button type="button" onClick={() => removeSiteAssignment(assignment)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-600 transition-all hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm ui-fade-up">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-black text-slate-900">سلف المقاول</h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                كل السلف المسجلة للمقاول من جميع الجهات والحركات داخل النظام تظهر هنا تلقائيًا.
              </p>
            </div>
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
              {advances.length} حركة
            </span>
          </div>

          <div className="border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-black text-slate-600">فلاتر حساب السلف</p>
              </div>
              <button
                type="button"
                onClick={resetAdvanceFilters}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                مسح الفلاتر
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <DateInput value={advanceFromDate} onChange={setAdvanceFromDate} placeholder="من تاريخ" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold" />
              <DateInput value={advanceToDate} onChange={setAdvanceToDate} placeholder="إلى تاريخ" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold" />
              <select value={advanceCustodyFilter} onChange={(event) => setAdvanceCustodyFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-500">
                <option value="">كل العهد</option>
                {custodies.map((custody) => <option key={custody.id} value={custody.id}>{custody.name}</option>)}
              </select>
              <select value={advanceProjectFilter} onChange={(event) => { setAdvanceProjectFilter(event.target.value); setAdvanceSiteFilter(""); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-500">
                <option value="">كل المشاريع</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <select value={advanceSiteFilter} onChange={(event) => setAdvanceSiteFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-blue-500">
                <option value="">كل المواقع</option>
                {sites.filter((site) => !advanceProjectFilter || site.projectId === advanceProjectFilter).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
              <span>الحركات الظاهرة: <strong className="text-slate-800">{filteredAdvances.length}</strong></span>
              <span>إجمالي السلف بعد الفلترة: <strong className="text-violet-700">{money(filteredAdvanceTotal)} جنيه</strong></span>
            </div>
          </div>

          {filteredAdvances.length === 0 ? (
            <EmptyState
              icon={<ReceiptText className="h-6 w-6" />}
              title={advances.length === 0 ? "لا توجد سلف مسجلة" : "لا توجد سلف مطابقة للفلاتر"}
              description={advances.length === 0 ? "عند تسجيل سلفة مرتبطة بهذا المقاول ستظهر هنا تلقائيًا." : "غيّر الفلاتر أو امسحها لعرض باقي حركات المقاول."}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAdvances.map((expense) => (
                <div key={expense.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700">
                        سلفة مقاول
                      </span>
                      {expense.siteId && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                          <MapPin className="h-3 w-3" />
                          الموقع: {advanceSiteNames.get(expense.siteId) ?? "موقع غير معروف"}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                        العهدة الدافعة: {custodies.find((custody) => custody.id === expense.custodyId)?.name ?? "عهدة غير معروفة"}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {formatDisplayDate(expense.date)}
                      </span>
                    </div>
                    <p className="mt-2 font-extrabold text-slate-900">{expense.description}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {expense.category && <span>التصنيف: {expense.category}</span>}
                      {expense.projectId && (
                        <span>المشروع: {projectNames.get(expense.projectId) ?? "مشروع غير معروف"}</span>
                      )}
                    </div>
                  </div>
                  <p className="accounting-number text-lg font-black text-slate-900">
                    {money(Number(expense.amount || 0))} <span className="text-xs">جنيه</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm ui-fade-up">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-black text-slate-900">ملاحظات ومستخلصات المقاول</h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                سجل كل ملاحظة أو مستخلص في خانة مستقلة، وأرفق بها الصور والمستندات التي تخصها.
              </p>
            </div>
            {canCurrentUser("create") && (
              <button
                type="button"
                onClick={openCreateNote}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
              >
                <Plus className="h-4 w-4" />
                ملاحظة جديدة
              </button>
            )}
          </div>

          {notes.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="لا توجد ملاحظات حتى الآن"
              description="أضف أول ملاحظة وسجل فيها تفاصيل المستخلص أو أي معلومة تخص المقاول."
              action={canCurrentUser("create") ? openCreateNote : undefined}
            />
          ) : (
            <div className="space-y-4 p-4 sm:p-5">
              {notes.map((note, index) => (
                <article
                  key={note.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-800">ملاحظة #{notes.length - index}</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDisplayDate(note.createdAt)}
                          </span>
                        </div>
                        {note.text && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                            {note.text}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {canCurrentUser("update") && (
                        <button
                          type="button"
                          onClick={() => openEditNote(note)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </button>
                      )}
                      {canCurrentUser("delete") && (
                        <button
                          type="button"
                          onClick={() => removeNote(note)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-600 transition-all hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      )}
                    </div>
                  </div>

                  {note.images.length > 0 && (
                    <div className="mt-4 border-t border-slate-200/80 pt-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-black text-slate-500">
                        <ImagePlus className="h-4 w-4" />
                        الصور والمستندات ({note.images.length})
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {note.images.map((image) => (
                          <button
                            key={image.id}
                            type="button"
                            onClick={() => setViewerImage(image)}
                            className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:h-28 sm:w-28"
                            title="فتح الصورة"
                          >
                            <img
                              src={image.dataUrl}
                              alt={image.name}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span className="absolute inset-x-0 bottom-0 bg-slate-950/65 px-1 py-1 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                              فتح الصورة
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isSiteModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ui-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSiteModal();
          }}
        >
          <div dir="rtl" role="dialog" aria-modal="true" className="ui-modal w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-slate-700" />
                  <h2 className="text-lg font-black text-slate-900">{editingSiteAssignment ? "تعديل فترة موقع" : "إضافة موقع للمقاول"}</h2>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-400">يمكن للمقاول أن يعمل في أكثر من موقع، ولكل ارتباط فترة مستقلة.</p>
              </div>
              <button type="button" onClick={closeSiteModal} disabled={savingSite} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-50" aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {siteError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ui-shake">{siteError}</div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-black text-slate-600">الموقع</label>
                    <button
                      type="button"
                      onClick={() => setSites(getProjectSites())}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                      title="تحديث قائمة المواقع"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      تحديث المواقع
                    </button>
                  </div>
                  <select value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100">
                    <option value="">اختر الموقع</option>
                    {sites.map((site) => {
                      const projectName = siteProjects.get(site.projectId);
                      return <option key={site.id} value={site.id}>{projectName ? `${projectName} — ` : ""}{site.name}</option>;
                    })}
                  </select>
                  {sites.length === 0 && <p className="mt-2 text-xs font-semibold text-amber-600">لا توجد مواقع مسجلة حاليًا. أضف الموقع من صفحة المشاريع أولًا.</p>}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black text-slate-600">بداية الفترة</label>
                  <DateInput
                    required
                    value={siteStartDate}
                    onChange={setSiteStartDate}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black text-slate-600">نهاية الفترة <span className="font-semibold text-slate-400">(اختياري)</span></label>
                  <DateInput
                    value={siteEndDate}
                    onChange={setSiteEndDate}
                    min={siteStartDate || undefined}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-black text-slate-600">ملاحظات الفترة <span className="font-semibold text-slate-400">(اختياري)</span></label>
                  <textarea value={siteNotes} onChange={(event) => setSiteNotes(event.target.value)} placeholder="اكتب أي تفاصيل تخص فترة عمل المقاول في الموقع..." className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100" />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeSiteModal} disabled={savingSite} className="h-11 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50">إلغاء</button>
                <button type="button" onClick={saveSiteAssignment} disabled={savingSite || sites.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  {savingSite ? "جارٍ الحفظ..." : "حفظ الفترة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isWorkModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ui-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWorkModal();
          }}
        >
          <div dir="rtl" role="dialog" aria-modal="true" className="ui-modal w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">إجمالي قيمة الأعمال</h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">القيمة التي تستحق للمقاول قبل خصم السلف.</p>
              </div>
              <button type="button" onClick={closeWorkModal} disabled={savingWork} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-50" aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {workError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ui-shake">{workError}</div>}
              <label className="mb-2 block text-xs font-black text-slate-600">إجمالي الأعمال بالجنيه</label>
              <input
                type="text"
                value={workValue}
                onChange={(event) => setWorkValue(event.target.value)}
                inputMode="decimal"
                autoFocus
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeWorkModal} disabled={savingWork} className="h-11 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50">إلغاء</button>
                <button type="button" onClick={saveWorkValue} disabled={savingWork} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  {savingWork ? "جارٍ الحفظ..." : "حفظ القيمة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isNoteModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ui-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeNoteModal();
          }}
        >
          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            className="ui-modal max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingNote ? "تعديل الملاحظة" : "إضافة ملاحظة جديدة"}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  اكتب كل التفاصيل الخاصة بالمستخلص أو أرفق الصور التي تريد الاحتفاظ بها.
                </p>
              </div>
              <button
                type="button"
                onClick={closeNoteModal}
                disabled={savingNote}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-78px)] overflow-y-auto p-5 sm:p-6">
              {noteError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ui-shake">
                  {noteError}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-black text-slate-600">الملاحظة</label>
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="اكتب هنا كل ما يخص المستخلص أو الملاحظة..."
                  className="min-h-36 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="mt-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-600">الصور والمستندات</label>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">يمكنك اختيار أكثر من صورة مرة واحدة.</p>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm">
                    <Camera className="h-4 w-4" />
                    إرفاق صور
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                {noteImages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <ImagePlus className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-600">لم تتم إضافة صور</p>
                    <p className="mt-1 text-xs text-slate-400">صور المستخلصات ستظهر هنا بشكل مصغر ويمكن فتحها بالحجم الكامل.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {noteImages.map((image) => (
                      <div key={image.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => setViewerImage(image)}
                          className="block h-32 w-full"
                          title="فتح الصورة"
                        >
                          <img src={image.dataUrl} alt={image.name} className="h-full w-full object-cover" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePendingImage(image.id)}
                          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm transition-all hover:bg-red-700"
                          aria-label="حذف الصورة"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <p className="truncate border-t border-slate-100 px-2 py-2 text-[10px] font-bold text-slate-500">{image.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeNoteModal}
                  disabled={savingNote}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={savingNote}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingNote ? "جارٍ الحفظ..." : "حفظ الملاحظة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewerImage && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewerImage(null);
          }}
        >
          <button
            type="button"
            onClick={() => setViewerImage(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-all hover:bg-white/20"
            aria-label="إغلاق الصورة"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex max-h-[90vh] max-w-[95vw] flex-col items-center gap-3">
            <img
              src={viewerImage.dataUrl}
              alt={viewerImage.name}
              className="max-h-[82vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            />
            <p className="max-w-[90vw] truncate text-xs font-bold text-white/80">{viewerImage.name}</p>
          </div>
        </div>
      )}

      {dialog}
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  valueClass = "text-slate-900",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="accounting-card ui-fade-up p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className={`accounting-number mt-2 text-2xl font-black ${valueClass}`}>
        {value} <span className="text-sm font-bold">{label.includes("عدد") ? "" : "جنيه"}</span>
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: () => void;
}) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>
      <p className="mt-4 text-sm font-black text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-6 text-slate-400">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          إضافة ملاحظة
        </button>
      )}
    </div>
  );
}

function WalletIcon() {
  return <CircleDollarSign className="h-5 w-5" />;
}
