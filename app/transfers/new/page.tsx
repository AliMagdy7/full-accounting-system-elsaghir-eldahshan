"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  FileText,
  WalletCards,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getCustodies,
  updateCustodyBalance,
} from "@/lib/data/custodies";

import {
  addCustodyTransaction,
} from "@/lib/data/custody-transactions";

import type { Custody } from "@/types/custody";
import { getCustodyFinancialAccounts, updateCustodyFinancialAccountBalance } from "@/lib/data/custody-financial-accounts";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";

function NewTransferPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
   * لو الصفحة اتفتحت من زر
   * "تحويل من عهدتي"
   * نحدد عهدتي أنا تلقائيًا.
   */
  const fromQuery =
    searchParams.get("from") ?? "";

  const [custodies, setCustodies] =
    useState<Custody[]>([]);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [fromCustodyId, setFromCustodyId] =
    useState("");

  const [toCustodyId, setToCustodyId] =
    useState("");

  const [fromFinancialAccountId, setFromFinancialAccountId] = useState("");
  const [fromFinancialAccounts, setFromFinancialAccounts] = useState<CustodyFinancialAccount[]>([]);

  /*
   * مصدر التمويل:
   *
   * central
   * = المبلغ موجود فعلًا في عهدتي أنا
   *
   * external
   * = المبلغ جاي من جهة خارجية
   */
  const [fundingMode, setFundingMode] =
    useState<"central" | "external">(
      "central",
    );

  const [externalSource, setExternalSource] =
    useState("");

  const [date, setDate] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [error, setError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  /*
   * ============================================================
   * تحميل العهد
   * ============================================================
   */

  useEffect(() => {
    const loadedCustodies =
      getCustodies();

    setCustodies(
      loadedCustodies,
    );

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    setDate(today);

    /*
     * لو جاي من زر:
     * "تحويل من عهدتي"
     */
    if (fromQuery === "central") {
      const central =
        loadedCustodies.find(
          (custody) =>
            custody.id === "central",
        );

      if (central) {
        setFromCustodyId(
          central.id,
        );
      }
    }

    setIsLoaded(true);
  }, [fromQuery]);

  /*
   * ============================================================
   * العهدة المرسلة
   * ============================================================
   */

  const fromCustody =
    useMemo(
      () =>
        custodies.find(
          (custody) =>
            custody.id ===
            fromCustodyId,
        ),
      [
        custodies,
        fromCustodyId,
      ],
    );

  /*
   * ============================================================
   * العهدة المستلمة
   * ============================================================
   */

  const toCustody =
    useMemo(
      () =>
        custodies.find(
          (custody) =>
            custody.id ===
            toCustodyId,
        ),
      [
        custodies,
        toCustodyId,
      ],
    );

  /*
   * ============================================================
   * هل التحويل صادر من عهدتي أنا؟
   * ============================================================
   */

  const isCentralTransfer =
    fromCustody?.id === "central";

  /*
   * ============================================================
   * العهد التي يمكن التحويل إليها
   * ============================================================
   *
   * مهم جدًا:
   *
   * هنا لا نستخدم أسماء أشخاص.
   * ولا نستخدم قائمة ثابتة.
   *
   * نستخدم العهد الفعلية الموجودة
   * داخل النظام.
   *
   * وبالتالي:
   *
   * عهدة أحمد
   * عهدة مصطفى
   * عهدة سيوة
   * عهدة أبو حمص
   * عهدة العامل
   * إلخ...
   *
   * كلها تظهر كعهد حقيقية.
   */

  const destinationCustodies = useMemo(() => {
    if (!fromCustodyId) {
      return custodies;
    }

    // هذه الصفحة مخصصة للتحويلات بين العهد فقط.
    // التحويل الداخلي بين وسائل الدفع داخل عهدتي أنا له شاشة مستقلة.
    return custodies.filter(
      (custody) => custody.id !== fromCustodyId,
    );
  }, [custodies, fromCustodyId]);

  const showFundingSource =
    isCentralTransfer;

  const showSourceFinancialAccount =
    isCentralTransfer && fundingMode === "central";


  useEffect(() => {
    setFromFinancialAccounts(
      fromCustodyId ? getCustodyFinancialAccounts(fromCustodyId) : [],
    );
    setFromFinancialAccountId("");
  }, [fromCustodyId]);


  /*
   * ============================================================
   * تنسيق المبلغ
   * ============================================================
   */

  const formatAmount = (
    value: number,
  ) =>
    value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    );

  /*
   * ============================================================
   * تغيير العهدة المرسلة
   * ============================================================
   */

  const handleFromCustodyChange = (
    custodyId: string,
  ) => {
    setFromCustodyId(
      custodyId,
    );

    /*
     * منع اختيار نفس العهدة
     * كمستلم.
     */
    if (
      custodyId === toCustodyId &&
      custodyId !== "central"
    ) {
      setToCustodyId("");
    }

    setError("");

    /*
     * مصدر خارجي خاص بعهدتي أنا فقط.
     */
    if (custodyId !== "central") {
      setFundingMode(
        "central",
      );

      setExternalSource("");
    }
  };

  /*
   * ============================================================
   * تغيير العهدة المستلمة
   * ============================================================
   */

  const handleToCustodyChange = (
    custodyId: string,
  ) => {
    setToCustodyId(
      custodyId,
    );

    setError("");
  };

  /*
   * ============================================================
   * حفظ التحويل
   * ============================================================
   */

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    /*
     * ----------------------------------------------------------
     * التحقق من العهدة المرسلة
     * ----------------------------------------------------------
     */

    if (!fromCustody) {
      setError(
        "من فضلك اختر العهدة المرسلة.",
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * التحقق من العهدة المستلمة
     * ----------------------------------------------------------
     */

    if (!toCustody) {
      setError(
        "من فضلك اختر العهدة المستلمة.",
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * منع التحويل لنفس العهدة
     * ----------------------------------------------------------
     */

    if (fromCustody.id === toCustody.id) {
      setError(
        "لا يمكن التحويل إلى نفس العهدة. التحويل الداخلي بين وسائل الدفع يتم من شاشة التحويل الداخلي.",
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * التاريخ
     * ----------------------------------------------------------
     */

    if (!date) {
      setError(
        "من فضلك اختر تاريخ التحويل.",
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * المبلغ
     * ----------------------------------------------------------
     */

    const numericAmount =
      Number(amount);

    if (
      !amount ||
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "من فضلك أدخل مبلغًا صحيحًا أكبر من صفر.",
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * البيان
     * ----------------------------------------------------------
     */

    const trimmedDescription =
      description.trim();

    if (!trimmedDescription) {
      setError(
        "من فضلك أدخل بيان التحويل.",
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * هل التمويل خارجي؟
     * ----------------------------------------------------------
     */

    const isExternalFunding =
      showFundingSource &&
      fundingMode ===
        "external";

    const trimmedExternalSource =
      externalSource.trim();

    /*
     * لو المصدر خارجي لازم نكتب المصدر.
     */

    if (
      isExternalFunding &&
      !trimmedExternalSource
    ) {
      setError(
        "من فضلك اكتب مصدر الأموال الخارجي.",
      );

      return;
    }

    const needsSourceFinancialAccount =
      isCentralTransfer &&
      fundingMode === "central";

    if (
      needsSourceFinancialAccount &&
      !fromFinancialAccountId
    ) {
      setError("من فضلك اختر وسيلة الدفع التي سيتم الخصم منها.");
      return;
    }

    setError("");
    setIsSaving(true);

    const now =
      new Date().toISOString();

    /*
     * ==========================================================
     * الحالة الأولى:
     *
     * تحويل عادي بين عهدتين
     *
     * مثال:
     *
     * عهدة أحمد
     *       ↓
     * عهدة مصطفى
     *
     * أو:
     *
     * عهدتي أنا
     *       ↓
     * عهدة سيوة
     *
     * هنا لا يوجد مصدر خارجي.
     * ==========================================================
     */

    if (!isExternalFunding) {
      const transferTransactionId =
        crypto.randomUUID();

      const incomingTransactionId =
        crypto.randomUUID();

      /*
       * حركة خروج من العهدة المرسلة
       */

      addCustodyTransaction({
        id:
          transferTransactionId,

        custodyId:
          fromCustody.id,

        type:
          "transfer",

        amount:
          numericAmount,

        date,

        description:
          trimmedDescription,

        relatedCustodyId:
          toCustody.id,
        ...(fromFinancialAccountId
          ? { financialAccountId: fromFinancialAccountId }
          : {}),

        /*
         * لو العهدة المستلمة
         * عهدة مشروع، نحفظ المشروع.
         */
        ...(toCustody.type ===
        "project"
          ? {
              projectId:
                toCustody.projectId,
            }
          : {}),

        /*
         * ربط الحركة بالحركة المقابلة.
         */
        relatedTransactionId:
          incomingTransactionId,

        createdAt:
          now,

        updatedAt:
          now,
      });

      /*
       * حركة دخول للعهدة المستلمة
       */

      addCustodyTransaction({
        id:
          incomingTransactionId,

        custodyId:
          toCustody.id,

        type:
          "in",

        amount:
          numericAmount,

        date,

        description:
          trimmedDescription,

        source:
          `تحويل من ${fromCustody.name}`,

        relatedCustodyId:
          fromCustody.id,

        /*
         * لو العهدة المستلمة
         * عهدة مشروع.
         */
        ...(toCustody.type ===
        "project"
          ? {
              projectId:
                toCustody.projectId,
            }
          : {}),

        /*
         * ربط الحركة بالحركة المقابلة.
         */
        relatedTransactionId:
          transferTransactionId,

        createdAt:
          now,

        updatedAt:
          now,
      });

      /*
       * تحديث رصيد العهدة المرسلة فقط إذا كان التحويل بين عهدتين مختلفتين.
       * التحويل الداخلي بين وسائل الدفع داخل نفس العهدة يتم من شاشة مستقلة.
       */
      if (fromCustody.id !== toCustody.id) {
        updateCustodyBalance(
          fromCustody.id,
          numericAmount,
          "out",
        );

        updateCustodyBalance(
          toCustody.id,
          numericAmount,
          "in",
        );
      }

      if (fromFinancialAccountId) {
        updateCustodyFinancialAccountBalance(
          fromFinancialAccountId,
          numericAmount,
          "out",
        );
      }


      router.push(
        "/transfers",
      );

      return;
    }

    /*
     * ==========================================================
     * الحالة الثانية:
     *
     * الأموال من مصدر خارجي
     *
     * مثال مهم جدًا:
     *
     * الحاج نبيل
     *       ↓ 10,000
     * عهدتي أنا
     *       ↓ 10,000
     * عهدة سيوة
     *
     * النتيجة:
     *
     * عهدتي أنا:
     *
     * +10,000
     * -10,000
     * = 0
     *
     * عهدة سيوة:
     *
     * +10,000
     *
     * والمصدر:
     *
     * الحاج نبيل
     *
     * يظل محفوظًا في كل الحركات
     * المرتبطة بالعملية.
     * ==========================================================
     */

    const centralIncomingId =
      crypto.randomUUID();

    const centralTransferId =
      crypto.randomUUID();

    const recipientIncomingId =
      crypto.randomUUID();

    /*
     * ----------------------------------------------------------
     * 1) دخول المبلغ إلى عهدتي أنا
     * من المصدر الخارجي
     * ----------------------------------------------------------
     */

    addCustodyTransaction({
      id:
        centralIncomingId,

      custodyId:
        fromCustody.id,

      type:
        "in",

      amount:
        numericAmount,

      date,

      description:
        `واصل من ${trimmedExternalSource} إلى ${toCustody.name}`,

      source:
        trimmedExternalSource,

      fundingSource:
        trimmedExternalSource,

      relatedCustodyId:
        toCustody.id,

      relatedTransactionId:
        centralTransferId,

      createdAt:
        now,

      updatedAt:
        now,
    });

    /*
     * ----------------------------------------------------------
     * 2) تحويل المبلغ من عهدتي أنا
     * إلى العهدة المستلمة
     * ----------------------------------------------------------
     */

    addCustodyTransaction({
      id:
        centralTransferId,

      custodyId:
        fromCustody.id,

      type:
        "transfer",

      amount:
        numericAmount,

      date,

      description:
        trimmedDescription,

      /*
       * مصدر الأموال يظل ظاهرًا
       * على حركة التحويل.
       */
      source:
        trimmedExternalSource,

      fundingSource:
        trimmedExternalSource,

      relatedCustodyId:
        toCustody.id,

      relatedTransactionId:
        recipientIncomingId,

      createdAt:
        now,

      updatedAt:
        now,
    });

    /*
     * ----------------------------------------------------------
     * 3) دخول المبلغ إلى العهدة المستلمة
     * ----------------------------------------------------------
     */

    addCustodyTransaction({
      id:
        recipientIncomingId,

      custodyId:
        toCustody.id,

      type:
        "in",

      amount:
        numericAmount,

      date,

      description:
        trimmedDescription,

      source:
        trimmedExternalSource,

      fundingSource:
        trimmedExternalSource,

      relatedCustodyId:
        fromCustody.id,

      relatedTransactionId:
        centralTransferId,

      /*
       * لو العهدة المستلمة عهدة مشروع،
       * نربط العملية بالمشروع تلقائيًا.
       */
      ...(toCustody.type ===
      "project"
        ? {
            projectId:
              toCustody.projectId,
          }
        : {}),

      createdAt:
        now,

      updatedAt:
        now,
    });

    /*
     * ----------------------------------------------------------
     * تحديث الأرصدة
     * ----------------------------------------------------------
     *
     * عهدتي أنا:
     *
     * + المبلغ
     * - المبلغ
     *
     * وبالتالي صافي الرصيد لا يتغير.
     *
     * العهدة المستلمة:
     *
     * + المبلغ
     * ----------------------------------------------------------
     */

    updateCustodyBalance(
      fromCustody.id,
      numericAmount,
      "in",
    );

    updateCustodyBalance(
      fromCustody.id,
      numericAmount,
      "out",
    );

    updateCustodyBalance(
      toCustody.id,
      numericAmount,
      "in",
    );

    router.push(
      "/transfers",
    );
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-6">

        {/* ================================================== */}
        {/* Page Header */}
        {/* ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

            <Link
              href="/transfers"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
              aria-label="العودة إلى التحويلات"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>

            <div className="min-w-0">

              <div className="mb-2 flex flex-wrap items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>

                <span className="text-sm font-bold text-blue-600">
                  التحويلات
                </span>

                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">
                  حركة بين العهد
                </span>

              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                تسجيل تحويل جديد
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                نقل مبلغ من عهدة فعلية إلى عهدة فعلية أخرى مع الاحتفاظ بمصدر الأموال وتحديث الأرصدة تلقائيًا.
              </p>

            </div>

          </div>

        </section>

        {/* ================================================== */}
        {/* Main Form */}
        {/* ================================================== */}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >

          {/* Form Header */}

          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ArrowLeftRight className="h-5 w-5" />
              </div>

              <div>

                <h2 className="text-base font-extrabold text-slate-900">
                  بيانات التحويل
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  اختر العهد الحقيقية المسجلة في النظام، وليس أسماء أشخاص منفصلة.
                </p>

              </div>

            </div>

          </div>

          {!isLoaded ? (
            <div className="flex min-h-80 items-center justify-center p-6">

              <div className="text-center">

                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

                <p className="mt-4 text-sm font-semibold text-slate-500">
                  جاري تحميل العهد...
                </p>

              </div>

            </div>
          ) : (
            <>

              <div className="space-y-6 p-5 sm:p-6">

                {/* ================================================== */}
                {/* From / To */}
                {/* ================================================== */}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* From Custody */}

                  <div>

                    <label
                      htmlFor="from-custody"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      من عهدة
                      <span className="mr-1 text-red-500">
                        *
                      </span>
                    </label>

                    <div className="relative">

                      <WalletCards className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <select
                        id="from-custody"
                        value={fromCustodyId}
                        onChange={(event) =>
                          handleFromCustodyChange(
                            event.target.value,
                          )
                        }
                        className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm font-semibold text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >

                        <option value="">
                          اختر العهدة المرسلة
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

                    </div>

                    {fromCustody && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">

                        <span className="text-slate-400">
                          الرصيد الحالي:
                        </span>

                        <span
                          className={
                            fromCustody.balance <
                            0
                              ? "text-red-600"
                              : fromCustody.balance >
                                  0
                                ? "text-emerald-600"
                                : "text-slate-600"
                          }
                        >
                          {formatAmount(
                            fromCustody.balance,
                          )}{" "}
                          جنيه
                        </span>

                        {fromCustody.type ===
                          "project" &&
                          fromCustody.responsiblePerson && (
                            <span className="text-slate-400">
                              المسؤول:{" "}
                              <span className="font-bold text-slate-600">
                                {
                                  fromCustody.responsiblePerson
                                }
                              </span>
                            </span>
                          )}

                      </div>
                    )}

                  </div>

                  {/* To Custody */}

                  <div>

                    <label
                      htmlFor="to-custody"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      إلى عهدة
                      <span className="mr-1 text-red-500">
                        *
                      </span>
                    </label>

                    <div className="relative">

                      <WalletCards className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <select
                        id="to-custody"
                        value={toCustodyId}
                        onChange={(event) =>
                          handleToCustodyChange(
                            event.target.value,
                          )
                        }
                        className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm font-semibold text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >

                        <option value="">
                          اختر العهدة المستلمة
                        </option>

                        {destinationCustodies.map(
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

                    </div>

                    {toCustody && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">

                        <span className="text-slate-400">
                          الرصيد الحالي:
                        </span>

                        <span
                          className={
                            toCustody.balance <
                            0
                              ? "text-red-600"
                              : toCustody.balance >
                                  0
                                ? "text-emerald-600"
                                : "text-slate-600"
                          }
                        >
                          {formatAmount(
                            toCustody.balance,
                          )}{" "}
                          جنيه
                        </span>

                        {toCustody.type ===
                          "project" &&
                          toCustody.responsiblePerson && (
                            <span className="text-slate-400">
                              المسؤول:{" "}
                              <span className="font-bold text-slate-600">
                                {
                                  toCustody.responsiblePerson
                                }
                              </span>
                            </span>
                          )}

                      </div>
                    )}

                  </div>

                </div>

                {showSourceFinancialAccount && (
                  <div className="mt-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-bold text-slate-700">
                          وسيلة الدفع المرسلة *
                        </label>
                        <Link
                          href="/custodies/accounts"
                          className="text-xs font-bold text-blue-600"
                        >
                          + إدارة الوسائل
                        </Link>
                      </div>

                      <select
                        value={fromFinancialAccountId}
                        onChange={(event) =>
                          setFromFinancialAccountId(event.target.value)
                        }
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">اختر وسيلة الدفع</option>
                        {fromFinancialAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} — {formatAmount(account.balance)} جنيه
                          </option>
                        ))}
                      </select>

                      {!fromFinancialAccounts.length && fromCustody && (
                        <p className="mt-2 text-xs font-semibold text-amber-600">
                          لا توجد وسائل دفع لعهدتك. أنشئ واحدة أولًا.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ================================================== */}
                {/* Funding Source */}
                {/* ================================================== */}

                {showFundingSource && (
                  <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5">

                    <div className="mb-4">

                      <h3 className="text-sm font-extrabold text-slate-800">
                        مصدر الأموال
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        حدد هل المبلغ خارج فعلًا من عهدتي أنا، أم أن الأموال جايه من جهة خارجية وسيتم تمريرها إلى العهدة المستلمة.
                      </p>

                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                      {/* Own Money */}

                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                          fundingMode ===
                          "central"
                            ? "border-blue-300 bg-white shadow-sm"
                            : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                        }`}
                      >

                        <input
                          type="radio"
                          name="funding-mode"
                          value="central"
                          checked={
                            fundingMode ===
                            "central"
                          }
                          onChange={() => {
                            setFundingMode(
                              "central",
                            );

                            setExternalSource(
                              "",
                            );

                            setError("");
                          }}
                          className="mt-1 h-4 w-4 cursor-pointer accent-blue-600"
                        />

                        <span className="min-w-0">

                          <span className="block text-sm font-bold text-slate-800">
                            من عهدتي أنا
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            المبلغ موجود فعلًا في عهدتي، وسيقل رصيدي عند التحويل.
                          </span>

                        </span>

                      </label>

                      {/* External Money */}

                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                          fundingMode ===
                          "external"
                            ? "border-blue-300 bg-white shadow-sm"
                            : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                        }`}
                      >

                        <input
                          type="radio"
                          name="funding-mode"
                          value="external"
                          checked={
                            fundingMode ===
                            "external"
                          }
                          onChange={() => {
                            setFundingMode(
                              "external",
                            );

                            setError("");
                          }}
                          className="mt-1 h-4 w-4 cursor-pointer accent-blue-600"
                        />

                        <span className="min-w-0">

                          <span className="block text-sm font-bold text-slate-800">
                            من جهة خارجية
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            المبلغ ليس خارجًا من رصيدي أنا، وإنما من مصدر خارجي مثل الحاج نبيل أو الحاج رمضان.
                          </span>

                        </span>

                      </label>

                    </div>

                    {/* External Source */}

                    {fundingMode ===
                      "external" && (
                      <div className="mt-4">

                        <label
                          htmlFor="external-source"
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          مصدر الأموال
                          <span className="mr-1 text-red-500">
                            *
                          </span>
                        </label>

                        <input
                          id="external-source"
                          type="text"
                          value={
                            externalSource
                          }
                          onChange={(event) => {
                            setExternalSource(
                              event.target.value,
                            );

                            setError("");
                          }}
                          placeholder="مثال: الحاج نبيل"
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          اكتب اسم الجهة التي جاء منها المبلغ فعليًا.
                        </p>

                      </div>
                    )}

                  </section>
                )}

                {/* ================================================== */}
                {/* Destination Info */}
                {/* ================================================== */}

                {toCustody && (
                  <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                        <WalletCards className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">

                        <p className="text-sm font-extrabold text-slate-800">
                          العهدة المستلمة
                        </p>

                        <p className="mt-1 text-sm font-bold text-emerald-700">
                          {toCustody.name}
                        </p>

                        <div className="mt-2 space-y-1">

                          {toCustody.type ===
                            "project" && (
                            <p className="text-xs leading-5 text-slate-500">
                              نوع العهدة:{" "}
                              <span className="font-bold text-slate-700">
                                عهدة مشروع / موقع
                              </span>
                            </p>
                          )}

                          {toCustody.type ===
                            "person" && (
                            <p className="text-xs leading-5 text-slate-500">
                              نوع العهدة:{" "}
                              <span className="font-bold text-slate-700">
                                عهدة شخص
                              </span>
                            </p>
                          )}

                          {toCustody.type ===
                            "worker" && (
                            <p className="text-xs leading-5 text-slate-500">
                              نوع العهدة:{" "}
                              <span className="font-bold text-slate-700">
                                عهدة عامل
                              </span>
                            </p>
                          )}

                          {toCustody.responsiblePerson && (
                            <p className="text-xs leading-5 text-slate-500">
                              المسؤول:{" "}
                              <span className="font-bold text-slate-700">
                                {
                                  toCustody.responsiblePerson
                                }
                              </span>
                            </p>
                          )}

                        </div>

                      </div>

                    </div>

                  </section>
                )}

                {/* ================================================== */}
                {/* Date */}
                {/* ================================================== */}

                <div>

                  <label
                    htmlFor="transfer-date"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    تاريخ التحويل
                    <span className="mr-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">

                    <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="transfer-date"
                      type="date"
                      value={date}
                      onChange={(event) => {
                        setDate(
                          event.target.value,
                        );

                        setError("");
                      }}
                      className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                  </div>

                </div>

                {/* ================================================== */}
                {/* Amount */}
                {/* ================================================== */}

                <div>

                  <label
                    htmlFor="transfer-amount"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    المبلغ
                    <span className="mr-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">

                    <WalletCards className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="transfer-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) => {
                        setAmount(
                          event.target.value,
                        );

                        setError("");
                      }}
                      placeholder="مثال: 5000"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                  </div>

                </div>

                {/* ================================================== */}
                {/* Description */}
                {/* ================================================== */}

                <div>

                  <label
                    htmlFor="transfer-description"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    بيان التحويل
                    <span className="mr-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">

                    <FileText className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-slate-400" />

                    <textarea
                      id="transfer-description"
                      value={description}
                      onChange={(event) => {
                        setDescription(
                          event.target.value,
                        );

                        setError("");
                      }}
                      rows={4}
                      placeholder={
                        fromCustody &&
                        toCustody
                          ? `تحويل من ${fromCustody.name} إلى ${toCustody.name}`
                          : "مثال: تحويل عهدة إلى سيوة"
                      }
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white py-3 pr-12 pl-4 text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-300 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                  </div>

                </div>

                {/* ================================================== */}
                {/* Preview */}
                {/* ================================================== */}

                {fromCustody &&
                  toCustody &&
                  amount && (
                    <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">

                      <div className="flex items-start gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                          <ArrowLeftRight className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-extrabold text-slate-800">
                            ملخص العملية
                          </p>

                          <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">

                            سيتم تحويل{" "}

                            <span className="font-extrabold text-slate-800">
                              {formatAmount(
                                Number(
                                  amount,
                                ) || 0,
                              )}{" "}
                              جنيه
                            </span>

                            {" "}من{" "}

                            <span className="font-extrabold text-slate-800">
                              {
                                fromCustody.name
                              }
                            </span>

                            {" "}إلى{" "}

                            <span className="font-extrabold text-slate-800">
                              {
                                toCustody.name
                              }
                            </span>

                            .

                          </p>

                          {/* External Source Preview */}

                          {isCentralTransfer &&
                            fundingMode ===
                              "external" && (
                              <div className="mt-3 rounded-xl border border-blue-100 bg-white/80 p-3">

                                <p className="text-xs font-bold text-slate-500">
                                  مصدر المبلغ الأصلي
                                </p>

                                <p className="mt-1 text-sm font-extrabold text-blue-700">
                                  {externalSource.trim() ||
                                    "لم يتم تحديد المصدر بعد"}
                                </p>

                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                  سيتم تسجيل مصدر المبلغ كجهة خارجية ثم إضافته مباشرة إلى العهدة المستلمة، دون اعتباره رصيدًا فعليًا دخل إحدى وسائل الدفع الخاصة بعهدتي أنا.
                                </p>

                              </div>
                            )}

                          {/* Normal Funding Preview */}

                          {isCentralTransfer &&
                            fundingMode ===
                              "central" && (
                              <p className="mt-3 text-xs leading-6 text-slate-500">
                                {fromCustody.id === toCustody.id
                                  ? "سيتم نقل المبلغ بين وسائل الدفع داخل عهدتي أنا، لذلك إجمالي رصيد العهدة لن يتغير."
                                  : "المبلغ خارج فعليًا من عهدتي أنا، وسيتم خصمه من وسيلة الدفع التي اخترتها، بينما تظل طريقة استلام العهدة الأخرى غير مطلوبة."}
                              </p>
                            )}

                          {/* Non Central Preview */}

                          {!isCentralTransfer && (
                            <p className="mt-3 text-xs leading-6 text-slate-500">
                              سيتم خصم المبلغ من العهدة المرسلة وإضافته إلى العهدة المستلمة. لا نحتاج إلى تحديد وسيلة الدفع التي ستستلم بها العهدة الأخرى.
                            </p>
                          )}

                        </div>

                      </div>

                    </section>
                  )}

                {/* ================================================== */}
                {/* Error */}
                {/* ================================================== */}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
                    {error}
                  </div>
                )}

              </div>

              {/* ================================================== */}
              {/* Actions */}
              {/* ================================================== */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                <Link
                  href="/transfers"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
                >
                  إلغاء
                </Link>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  <ArrowLeftRight className="h-4 w-4" />

                  {isSaving
                    ? "جاري تسجيل التحويل..."
                    : "حفظ التحويل"}

                </button>

              </div>

            </>
          )}

        </form>

      </div>
    </AppShell>
  );
}

export default function NewTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            <p className="mt-4 text-sm font-semibold text-slate-500">
              جاري تحميل الصفحة...
            </p>
          </div>
        </div>
      }
    >
      <NewTransferPageContent />
    </Suspense>
  );
}
