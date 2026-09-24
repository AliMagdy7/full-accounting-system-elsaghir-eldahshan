"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Save,
  FolderPlus,
} from "lucide-react";

import { addProject } from "@/lib/data/projects";
import {
  ensureProjectCustody,
  getCustodies,
} from "@/lib/data/custodies";

export default function NewProjectPage() {
  const router = useRouter();

  const [availablePeople, setAvailablePeople] =
    useState<string[]>([]);

  const [name, setName] = useState("");
  const [responsiblePerson, setResponsiblePerson] =
    useState("");
  const [assignmentDate, setAssignmentDate] =
    useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");

  /*
   * تحميل أسماء الأشخاص الذين تم تسجيلهم سابقًا
   * لاستخدامهم كاقتراحات فقط.
   *
   * الاسم ليس مقيدًا بهذه القائمة.
   * المستخدم يستطيع كتابة أي اسم جديد.
   */
  useEffect(() => {
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

        if (custody.responsiblePerson?.trim()) {
          names.push(
            custody.responsiblePerson.trim(),
          );
        }

        return names;
      })
      .filter(Boolean);

    setAvailablePeople(
      Array.from(new Set(people)).sort((a, b) =>
        a.localeCompare(b, "ar"),
      ),
    );
  }, []);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedResponsible =
      responsiblePerson.trim();

    if (!trimmedName) {
      setError("من فضلك اكتب اسم المشروع.");
      return;
    }

    if (trimmedResponsible && !assignmentDate) {
      setError(
        "من فضلك اختر تاريخ استلام العهدة.",
      );
      return;
    }

    const now = new Date().toISOString();

    const projectId = `project-${Date.now()}`;

    const project = {
      id: projectId,
      name: trimmedName,
      status: "active" as const,
      currentResponsible:
        trimmedResponsible || undefined,
      assignmentStartDate:
        trimmedResponsible
          ? assignmentDate
          : undefined,
      notes: notes.trim() || undefined,
      responsibleHistory:
        trimmedResponsible
          ? [
              {
                id: `history-${Date.now()}`,
                personName: trimmedResponsible,
                startDate: assignmentDate,
              },
            ]
          : [],
      createdAt: now,
      updatedAt: now,
    };

    addProject(project);

    /*
     * إنشاء عهدة المشروع تلقائيًا.
     *
     * اسم المسؤول هنا هو الاسم الذي كتبه المستخدم
     * وليس اسمًا من قائمة ثابتة.
     */
    ensureProjectCustody(
      projectId,
      trimmedName,
      trimmedResponsible || undefined,
    );

    router.push(`/projects/${projectId}`);
  };

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* ================================
          Page Header
      ================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5">
          {/* العودة */}

          <button
            type="button"
            onClick={() => router.back()}
            className="group flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md active:scale-[0.98]"
          >
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            <span>العودة</span>
          </button>

          {/* العنوان */}

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <FolderPlus className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                إضافة مشروع جديد
              </h1>

              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                أضف بيانات المشروع والمسؤول عن عهدته.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================
          Project Form
      ================================= */}

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        {/* Form Header */}

        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <h2 className="text-base font-extrabold text-slate-900">
            بيانات المشروع
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            أدخل البيانات الأساسية للمشروع والعهدة.
          </p>
        </div>

        {/* Form Body */}

        <div className="p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            {/* ================================
                اسم المشروع
            ================================= */}

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
                  setName(event.target.value)
                }
                placeholder="مثال: مشروع سيوة"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* ================================
                مسؤول العهدة
            ================================= */}

            <div>
              <label
                htmlFor="responsible-person"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                مسؤول العهدة
              </label>

              <input
                id="responsible-person"
                type="text"
                list="responsible-people"
                value={responsiblePerson}
                onChange={(event) =>
                  setResponsiblePerson(
                    event.target.value,
                  )
                }
                placeholder="اكتب اسم مسؤول العهدة"
                autoComplete="off"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

              <datalist id="responsible-people">
                {availablePeople.map((person) => (
                  <option
                    key={person}
                    value={person}
                  />
                ))}
              </datalist>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                اكتب أي اسم بنفسك. الأسماء السابقة تظهر
                كاقتراحات فقط.
              </p>
            </div>

            {/* ================================
                تاريخ استلام العهدة
            ================================= */}

            <div>
              <label
                htmlFor="assignment-date"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                تاريخ استلام العهدة
              </label>

              <input
                id="assignment-date"
                type="date"
                value={assignmentDate}
                onChange={(event) =>
                  setAssignmentDate(
                    event.target.value,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-right text-sm text-slate-900 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* ================================
                ملاحظات
            ================================= */}

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
                  setNotes(event.target.value)
                }
                placeholder="أي ملاحظات إضافية عن المشروع..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm leading-6 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          {/* ================================
              Error
          ================================= */}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-semibold leading-6 text-red-700"
            >
              {error}
            </div>
          )}
        </div>

        {/* ================================
            Form Actions
        ================================= */}

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
          >
            <Save className="h-4 w-4" />
            حفظ المشروع
          </button>
        </div>
      </form>
    </div>
  );
}