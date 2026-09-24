"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Save } from "lucide-react";

import {
  getProjectById,
  updateProject,
} from "@/lib/data/projects";

import {
  ensureProjectCustody,
  getCustodies,
  getProjectCustody,
  updateProjectCustody,
} from "@/lib/data/custodies";

import type {
  ProjectResponsibleHistory,
} from "@/types/project";

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();

  const projectId = String(params.id);

  const [availablePeople, setAvailablePeople] =
    useState<string[]>([]);

  const [name, setName] = useState("");
  const [status, setStatus] =
    useState<
      "active" | "stopped" | "closed"
    >("active");

  const [responsiblePerson, setResponsiblePerson] =
    useState("");

  const [assignmentDate, setAssignmentDate] =
    useState("");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * تحميل المشروع الحالي + أسماء المسؤولين
   * المسجلين سابقًا كاقتراحات فقط.
   */
  useEffect(() => {
    const project =
      getProjectById(projectId);

    if (!project) {
      setError("المشروع غير موجود.");
      setLoading(false);
      return;
    }

    setName(project.name);

    setStatus(project.status);

    setResponsiblePerson(
      project.currentResponsible ?? "",
    );

    setAssignmentDate(
      project.assignmentStartDate ?? "",
    );

    setNotes(project.notes ?? "");

    const custodies = getCustodies();

    const people = custodies
      .flatMap((custody) => {
        const names: string[] = [];

        if (
          custody.type === "person" &&
          custody.name.trim()
        ) {
          names.push(custody.name.trim());
        }

        if (
          custody.responsiblePerson?.trim()
        ) {
          names.push(
            custody.responsiblePerson.trim(),
          );
        }

        return names;
      })
      .filter(Boolean);

    /*
     * نضيف المسؤول الحالي حتى لو لم يكن
     * موجودًا في أي عهدة أخرى.
     */
    if (
      project.currentResponsible?.trim()
    ) {
      people.push(
        project.currentResponsible.trim(),
      );
    }

    setAvailablePeople(
      Array.from(new Set(people)).sort(
        (a, b) =>
          a.localeCompare(b, "ar"),
      ),
    );

    setLoading(false);
  }, [projectId]);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const project =
      getProjectById(projectId);

    if (!project) {
      setError("المشروع غير موجود.");
      return;
    }

    const trimmedName = name.trim();

    const newResponsible =
      responsiblePerson.trim();

    if (!trimmedName) {
      setError(
        "من فضلك اكتب اسم المشروع.",
      );
      return;
    }

    if (
      newResponsible &&
      !assignmentDate
    ) {
      setError(
        "من فضلك اختر تاريخ بداية مسؤولية العهدة.",
      );
      return;
    }

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const oldResponsible =
      project.currentResponsible ?? "";

    const effectiveAssignmentDate =
      newResponsible
        ? assignmentDate || today
        : today;

    /*
     * نحتفظ بكل تاريخ المسؤولين السابقين.
     */
    const responsibleHistory: ProjectResponsibleHistory[] =
      [...project.responsibleHistory];

    /*
     * المسؤول اتغير.
     */
    if (
      oldResponsible !== newResponsible
    ) {
      /*
       * إغلاق فترة المسؤول القديم.
       */
      if (oldResponsible) {
        const oldHistoryIndex =
          responsibleHistory.findIndex(
            (item) =>
              item.personName ===
                oldResponsible &&
              !item.endDate,
          );

        if (oldHistoryIndex !== -1) {
          responsibleHistory[
            oldHistoryIndex
          ] = {
            ...responsibleHistory[
              oldHistoryIndex
            ],
            endDate:
              effectiveAssignmentDate,
          };
        } else {
          responsibleHistory.push({
            id: `history-${Date.now()}-old`,
            personName:
              oldResponsible,
            startDate:
              project.assignmentStartDate ??
              effectiveAssignmentDate,
            endDate:
              effectiveAssignmentDate,
          });
        }
      }

      /*
       * إضافة المسؤول الجديد.
       */
      if (newResponsible) {
        responsibleHistory.push({
          id: `history-${Date.now()}-new`,
          personName:
            newResponsible,
          startDate:
            effectiveAssignmentDate,
        });
      }
    } else if (newResponsible) {
      /*
       * المسؤول لم يتغير،
       * لكن ممكن المستخدم عدل تاريخ البداية.
       */
      const lastHistoryIndex =
        responsibleHistory.length - 1;

      if (lastHistoryIndex >= 0) {
        responsibleHistory[
          lastHistoryIndex
        ] = {
          ...responsibleHistory[
            lastHistoryIndex
          ],
          personName:
            newResponsible,
          startDate:
            effectiveAssignmentDate,
          endDate: undefined,
        };
      } else {
        responsibleHistory.push({
          id: `history-${Date.now()}`,
          personName:
            newResponsible,
          startDate:
            effectiveAssignmentDate,
        });
      }
    } else if (
      responsibleHistory.length > 0
    ) {
      /*
       * تم إزالة المسؤول الحالي.
       */
      const lastHistoryIndex =
        responsibleHistory.length - 1;

      responsibleHistory[
        lastHistoryIndex
      ] = {
        ...responsibleHistory[
          lastHistoryIndex
        ],
        endDate:
          responsibleHistory[
            lastHistoryIndex
          ].endDate ?? today,
      };
    }

    /*
     * حفظ بيانات المشروع.
     */
    const updatedProject =
      updateProject(
        projectId,
        {
          name: trimmedName,
          status,
          currentResponsible:
            newResponsible ||
            undefined,
          assignmentStartDate:
            newResponsible
              ? effectiveAssignmentDate
              : undefined,
          notes:
            notes.trim() ||
            undefined,
          responsibleHistory,
        },
      );

    if (!updatedProject) {
      setError(
        "تعذر حفظ تعديلات المشروع.",
      );
      return;
    }

    /*
     * تحديث عهدة المشروع نفسها.
     */
    const existingCustody =
      getProjectCustody(projectId);

    if (existingCustody) {
      updateProjectCustody(
        projectId,
        {
          name: `عهدة ${trimmedName}`,
          responsiblePerson:
            newResponsible ||
            undefined,
        },
      );
    } else {
      ensureProjectCustody(
        projectId,
        trimmedName,
        newResponsible ||
          undefined,
      );
    }

    router.push(
      `/projects/${projectId}`,
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm font-semibold text-slate-500">
          جاري تحميل بيانات المشروع...
        </p>
      </div>
    );
  }

  if (
    error &&
    !name
  ) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowRight className="h-4 w-4" />
          العودة
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowRight className="h-4 w-4" />
          العودة
        </button>

        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          تعديل المشروع
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          تعديل بيانات المشروع ومسؤول العهدة مع
          الحفاظ على السجل السابق.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {/* Project Name */}
          <div>
            <label
              htmlFor="project-name"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              اسم المشروع
            </label>

            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="project-status"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              حالة المشروع
            </label>

            <select
              id="project-status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as
                    | "active"
                    | "stopped"
                    | "closed",
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="active">
                نشط
              </option>

              <option value="stopped">
                متوقف
              </option>

              <option value="closed">
                مغلق
              </option>
            </select>
          </div>

          {/* Responsible Person */}
          <div>
            <label
              htmlFor="responsible-person"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              مسؤول العهدة الحالي
            </label>

            <input
              id="responsible-person"
              type="text"
              list="responsible-people"
              value={
                responsiblePerson
              }
              onChange={(event) =>
                setResponsiblePerson(
                  event.target.value,
                )
              }
              placeholder="اكتب اسم مسؤول العهدة"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />

            <datalist id="responsible-people">
              {availablePeople.map(
                (person) => (
                  <option
                    key={person}
                    value={person}
                  />
                ),
              )}
            </datalist>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              اكتب أي اسم بنفسك. الأسماء السابقة
              تظهر كاقتراحات فقط.
            </p>
          </div>

          {/* Assignment Date */}
          <div>
            <label
              htmlFor="assignment-date"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              تاريخ بداية مسؤولية العهدة
            </label>

            <input
              id="assignment-date"
              type="date"
              value={
                assignmentDate
              }
              onChange={(event) =>
                setAssignmentDate(
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label
              htmlFor="project-notes"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              ملاحظات
            </label>

            <textarea
              id="project-notes"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
          >
            <Save className="h-4 w-4" />
            حفظ التعديلات
          </button>
        </div>
      </form>
    </div>
  );
}