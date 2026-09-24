"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  FileText,
  FolderKanban,
  Tag,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import {
  getCustodies,
  getProjectCustody,
  updateCustodyBalance,
} from "@/lib/data/custodies";
import {
  addCustodyTransaction,
} from "@/lib/data/custody-transactions";
import {
  addExpense,
} from "@/lib/data/expenses";
import {
  getProjects,
} from "@/lib/data/projects";

import type { Custody } from "@/types/custody";
import type { Project } from "@/types/project";
import {
  getCustodyFinancialAccounts,
  updateCustodyFinancialAccountBalance,
} from "@/lib/data/custody-financial-accounts";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";

function getLocalDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function NewExpensePage() {
  const router = useRouter();

  const [custodies, setCustodies] =
    useState<Custody[]>([]);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [date, setDate] =
    useState("");

  const [custodyId, setCustodyId] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [projectId, setProjectId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [financialAccountId, setFinancialAccountId] =
    useState("");

  const [financialAccounts, setFinancialAccounts] =
    useState<CustodyFinancialAccount[]>([]);

  const [error, setError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  /*
   * تحميل البيانات وتحديد المشروع القادم
   * من صفحة تفاصيل المشروع تلقائيًا.
   */
  useEffect(() => {
    const loadedCustodies =
      getCustodies();

    const loadedProjects =
      getProjects();

    setCustodies(loadedCustodies);
    setProjects(loadedProjects);
    setDate(getLocalDate());

    /*
     * قراءة المشروع من الرابط بدون useSearchParams
     * حتى لا نحتاج إلى hook إضافي أثناء بناء الصفحة.
     */
    const projectFromUrl =
      new URLSearchParams(
        window.location.search,
      ).get("project");

    if (projectFromUrl) {
      const projectExists =
        loadedProjects.some(
          (project) =>
            project.id === projectFromUrl,
        );

      if (projectExists) {
        setProjectId(
          projectFromUrl,
        );

        /*
         * بما أن المصروف بدأ من داخل مشروع،
         * نحدد عهدة المشروع تلقائيًا.
         */
        const projectCustody =
          getProjectCustody(
            projectFromUrl,
          );

        if (projectCustody) {
          setCustodyId(
            projectCustody.id,
          );
        }
      }
    }

    setIsLoaded(true);
  }, []);

  const selectedCustody =
    custodies.find(
      (custody) =>
        custody.id === custodyId,
    );

  const selectedProject =
    projects.find(
      (project) =>
        project.id === projectId,
    );

  /*
   * ==================================================
   * وسائل الدفع
   * ==================================================
   *
   * وسائل الدفع موجودة داخل "عهدتي أنا" فقط.
   *
   * لذلك:
   * - central  => تظهر وسائل الدفع
   * - أي عهدة أخرى => تختفي وسائل الدفع تمامًا
   */
  const isCentralCustody =
    selectedCustody?.id === "central";

  /*
   * تحميل وسائل الدفع لعهدتي أنا فقط.
   *
   * لا يتم تحميل أو عرض أي وسائل دفع
   * لعهدة شخص أو مشروع أو عامل.
   */
  useEffect(() => {
    /*
     * بمجرد تغيير العهدة، نمسح الاختيار السابق.
     */
    setFinancialAccountId("");

    /*
     * وسائل الدفع لا تخص إلا العهدة المركزية.
     */
    if (custodyId !== "central") {
      setFinancialAccounts([]);
      return;
    }

    const accounts =
      getCustodyFinancialAccounts(
        "central",
      );

    setFinancialAccounts(accounts);
  }, [custodyId]);

  /*
   * حماية إضافية:
   * لو العهدة تغيرت لأي سبب إلى عهدة غير مركزية،
   * يتم حذف وسيلة الدفع من الحالة نهائيًا.
   */
  useEffect(() => {
    if (!isCentralCustody) {
      setFinancialAccountId("");
      setFinancialAccounts([]);
    }
  }, [isCentralCustody]);

  /*
   * لو وسيلة الدفع المختارة لم تعد موجودة
   * داخل القائمة الحالية، يتم إلغاء الاختيار.
   */
  useEffect(() => {
    if (
      financialAccountId &&
      !financialAccounts.some(
        (account) =>
          account.id ===
          financialAccountId,
      )
    ) {
      setFinancialAccountId("");
    }
  }, [
    financialAccountId,
    financialAccounts,
  ]);

  /*
   * تغيير المشروع يغير العهدة تلقائيًا
   * إذا كان المشروع له عهدة مشروع.
   */
  const handleProjectChange = (
    value: string,
  ) => {
    setProjectId(value);
    setError("");

    if (!value) {
      /*
       * لو المستخدم اختار "مصروف عام"
       * لا نفترض أي عهدة.
       */
      setCustodyId("");
      return;
    }

    const projectCustody =
      getProjectCustody(value);

    if (projectCustody) {
      setCustodyId(
        projectCustody.id,
      );
    } else {
      setCustodyId("");
    }
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const numericAmount =
      Number(amount);

    const trimmedCategory =
      category.trim();

    const trimmedDescription =
      description.trim();

    if (!date) {
      setError(
        "من فضلك اختر تاريخ المصروف.",
      );
      return;
    }

    if (
      !projectId &&
      !custodyId
    ) {
      setError(
        "من فضلك اختر العهدة التي دفعت المصروف.",
      );
      return;
    }

    if (!custodyId) {
      setError(
        "لم يتم العثور على عهدة مرتبطة بالمشروع المختار. اختر العهدة التي دفعت المصروف.",
      );
      return;
    }

    /*
     * وسيلة الدفع مطلوبة فقط لعهدتي أنا.
     *
     * العهد الأخرى لا تحتوي على وسائل دفع
     * وبالتالي لا يتم طلبها منها.
     */
    if (
      isCentralCustody &&
      !financialAccountId
    ) {
      setError(
        "من فضلك اختر وسيلة الدفع التي دفعت المصروف.",
      );
      return;
    }

    if (!trimmedCategory) {
      setError(
        "من فضلك اكتب تصنيف المصروف.",
      );
      return;
    }

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "من فضلك أدخل مبلغًا صحيحًا.",
      );
      return;
    }

    if (!trimmedDescription) {
      setError(
        "من فضلك اكتب بيان المصروف.",
      );
      return;
    }

    if (!selectedCustody) {
      setError(
        "العهدة المختارة غير موجودة.",
      );
      return;
    }

    /*
     * حماية إضافية:
     * لا يمكن استخدام وسيلة دفع مع عهدة غير عهدتي أنا.
     */
    if (
      !isCentralCustody &&
      financialAccountId
    ) {
      setError(
        "وسيلة الدفع متاحة لعهدتي أنا فقط.",
      );
      return;
    }

    setError("");
    setIsSaving(true);

    const now =
      new Date().toISOString();

    const expenseId =
      crypto.randomUUID();

    /*
     * تسجيل المصروف.
     *
     * financialAccountId يتم حفظه فقط
     * إذا كان المصروف خارج عهدتي أنا.
     */
    addExpense({
      id: expenseId,
      date,
      amount: numericAmount,
      category:
        trimmedCategory,
      description:
        trimmedDescription,
      custodyId,
      ...(isCentralCustody &&
      financialAccountId
        ? {
            financialAccountId,
          }
        : {}),
      ...(projectId
        ? {
            projectId,
          }
        : {}),
      createdAt: now,
      updatedAt: now,
    });

    /*
     * تحديث رصيد العهدة.
     */
    updateCustodyBalance(
      custodyId,
      numericAmount,
      "out",
    );

    /*
     * تحديث رصيد وسيلة الدفع
     * فقط لو المصروف خرج من عهدتي أنا.
     */
    if (
      isCentralCustody &&
      financialAccountId
    ) {
      updateCustodyFinancialAccountBalance(
        financialAccountId,
        numericAmount,
        "out",
      );
    }

    /*
     * تسجيل حركة العهدة.
     *
     * financialAccountId يضاف فقط
     * لعهدتي أنا.
     */
    addCustodyTransaction({
      id: crypto.randomUUID(),
      custodyId,
      type: "out",
      amount: numericAmount,
      date,
      description:
        trimmedDescription,
      ...(isCentralCustody &&
      financialAccountId
        ? {
            financialAccountId,
          }
        : {}),
      ...(projectId
        ? {
            projectId,
          }
        : {}),
      createdAt: now,
      updatedAt: now,
    });

    /*
     * لو المصروف أُضيف من داخل مشروع،
     * نرجع لتفاصيل المشروع.
     */
    if (selectedProject) {
      router.push(
        `/projects/${selectedProject.id}`,
      );
      return;
    }

    /*
     * المصروف العام يرجع لتفاصيل العهدة.
     */
    router.push(
      selectedCustody.type ===
        "person"
        ? `/custodies/person/${selectedCustody.id}`
        : selectedCustody.id ===
            "central"
          ? "/custodies/central"
          : "/expenses",
    );
  };

  if (!isLoaded) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-bold text-slate-500">
            جاري تحميل البيانات...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-4xl space-y-6"
      >
        {/* Header */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5">
            <Link
              href={
                selectedProject
                  ? `/projects/${selectedProject.id}`
                  : "/expenses"
              }
              className="group inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md"
            >
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />

              {selectedProject
                ? "العودة إلى المشروع"
                : "العودة إلى المصروفات"}
            </Link>

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 shadow-sm">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="mb-1">
                  <span className="text-sm font-bold text-blue-600">
                    الإدارة المالية
                  </span>
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  تسجيل مصروف جديد
                </h1>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  تسجيل المصروف وربطه بالعهدة
                  والمشروع مع الاحتفاظ بالتصنيف
                  والبيان الأصلي.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <h2 className="text-base font-extrabold text-slate-900">
              بيانات المصروف
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              أدخل بيانات العملية كما تريد أن تظهر
              في السجلات والتقارير.
            </p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Date */}

              <div>
                <label
                  htmlFor="expense-date"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  التاريخ
                </label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute right-4 top-3.5 h-5 w-5 text-slate-400" />

                  <input
                    id="expense-date"
                    type="date"
                    value={date}
                    onChange={(event) => {
                      setDate(
                        event.target.value,
                      );
                      setError("");
                    }}
                    className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-right text-sm text-slate-800 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Project */}

              <div>
                <label
                  htmlFor="expense-project"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  المشروع / الموقع
                </label>

                <div className="relative">
                  <FolderKanban className="pointer-events-none absolute right-4 top-3.5 z-10 h-5 w-5 text-slate-400" />

                  <select
                    id="expense-project"
                    value={projectId}
                    onChange={(event) =>
                      handleProjectChange(
                        event.target.value,
                      )
                    }
                    className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-right text-sm text-slate-800 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">
                      مصروف عام
                    </option>

                    {projects.map(
                      (project) => (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {project.name}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {selectedProject && (
                  <p className="mt-2 text-xs leading-5 text-blue-600">
                    تم تحديد المشروع تلقائيًا لأنك
                    أضفت المصروف من داخل المشروع.
                  </p>
                )}
              </div>

              {/* Custody */}

              <div>
                <label
                  htmlFor="expense-custody"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  العهدة التي دفعت المصروف
                </label>

                <div className="relative">
                  <WalletCards className="pointer-events-none absolute right-4 top-3.5 z-10 h-5 w-5 text-slate-400" />

                  <select
                    id="expense-custody"
                    value={custodyId}
                    onChange={(event) => {
                      setCustodyId(
                        event.target.value,
                      );
                      setError("");
                    }}
                    className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-right text-sm text-slate-800 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">
                      اختر العهدة
                    </option>

                    {custodies.map(
                      (custody) => (
                        <option
                          key={custody.id}
                          value={custody.id}
                        >
                          {custody.name}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {selectedProject ? (
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    يتم اختيار عهدة المشروع تلقائيًا،
                    ويمكن تغييرها إذا كان هناك استثناء.
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    اختر العهدة التي خرج منها المبلغ
                    فعليًا.
                  </p>
                )}
              </div>

              {/* Financial account */}

              {isCentralCustody && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="expense-financial-account"
                      className="block text-sm font-bold text-slate-700"
                    >
                      وسيلة الدفع / الحساب
                      <span className="mr-1 text-red-500">
                        *
                      </span>
                    </label>

                    <Link
                      href="/custodies/accounts"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      + إدارة الوسائل
                    </Link>
                  </div>

                  <div className="relative">
                    <select
                      id="expense-financial-account"
                      value={financialAccountId}
                      onChange={(event) => {
                        setFinancialAccountId(
                          event.target.value,
                        );
                        setError("");
                      }}
                      className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="">
                        اختر وسيلة الدفع
                      </option>

                      {financialAccounts.map(
                        (account) => (
                          <option
                            key={account.id}
                            value={account.id}
                          >
                            {account.name} — الرصيد{" "}
                            {account.balance.toLocaleString(
                              "en-US",
                            )}{" "}
                            جنيه
                          </option>
                        ),
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  {!financialAccounts.length && (
                    <p className="mt-2 text-xs font-semibold text-amber-600">
                      لا توجد وسيلة دفع داخل عهدتك أنا.
                      أنشئ واحدة أولًا من إدارة الوسائل.
                    </p>
                  )}
                </div>
              )}

              {/* Category */}

              <div>
                <label
                  htmlFor="expense-category"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  تصنيف المصروف
                </label>

                <div className="relative">
                  <Tag className="pointer-events-none absolute right-4 top-3.5 h-5 w-5 text-slate-400" />

                  <input
                    id="expense-category"
                    type="text"
                    value={category}
                    onChange={(event) => {
                      setCategory(
                        event.target.value,
                      );
                      setError("");
                    }}
                    placeholder="مثال: معدات، كهرباء، سباكة، زيوت..."
                    className="h-12 w-full cursor-text rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-right text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  اكتب التصنيف كما تريد، وسيظهر تلقائيًا
                  ضمن فلاتر المصروفات.
                </p>
              </div>

              {/* Amount */}

              <div className="md:col-span-2">
                <label
                  htmlFor="expense-amount"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  المبلغ
                </label>

                <input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => {
                    setAmount(
                      event.target.value,
                    );
                    setError("");
                  }}
                  placeholder="مثال: 3500"
                  className="h-12 w-full cursor-text rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-300 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* Description */}

              <div className="md:col-span-2">
                <label
                  htmlFor="expense-description"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  بيان المصروف
                </label>

                <textarea
                  id="expense-description"
                  value={description}
                  onChange={(event) => {
                    setDescription(
                      event.target.value,
                    );
                    setError("");
                  }}
                  rows={4}
                  placeholder="اكتب البيان كما تريد أن يظهر في السجلات والتقارير..."
                  className="w-full cursor-text resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm leading-6 text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  البيان محفوظ كما تكتبه، والتصنيف منفصل
                  عنه ويستخدم للفلترة والتجميع.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-semibold leading-6 text-red-700"
              >
                {error}
              </div>
            )}
          </div>

          {/* Actions */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Link
              href={
                selectedProject
                  ? `/projects/${selectedProject.id}`
                  : "/expenses"
              }
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
            >
              إلغاء
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-7 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {isSaving
                ? "جاري الحفظ..."
                : "حفظ المصروف"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}