import type { Custody } from "@/types/custody";

const STORAGE_KEY = "accounting-system-custodies";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function loadCustodies(): Custody[] {
  if (!canUseStorage()) {
    return [];
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    const now = new Date().toISOString();

    const initialCustodies: Custody[] = [
      {
        id: "central",
        name: "عهدتي أنا",
        type: "central",
        balance: 0,
        totalIn: 0,
        totalOut: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];

    saveCustodies(initialCustodies);

    return initialCustodies;
  }

  try {
    return JSON.parse(stored) as Custody[];
  } catch {
    return [];
  }
}

function saveCustodies(
  custodies: Custody[],
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(custodies),
  );
}

export function getCustodies(): Custody[] {
  return loadCustodies();
}

export function getCustodyById(
  id: string,
): Custody | undefined {
  return getCustodies().find(
    (custody) => custody.id === id,
  );
}

export function addCustody(
  custody: Custody,
): Custody {
  const custodies = getCustodies();

  custodies.push(custody);

  saveCustodies(custodies);

  return custody;
}

export function updateCustody(
  id: string,
  updates: Partial<Custody>,
): Custody | undefined {
  const custodies = getCustodies();

  const index = custodies.findIndex(
    (custody) => custody.id === id,
  );

  if (index === -1) {
    return undefined;
  }

  const updatedCustody: Custody = {
    ...custodies[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  custodies[index] = updatedCustody;

  saveCustodies(custodies);

  return updatedCustody;
}

/*
 * تحديث رصيد العهدة بعد حركة مالية.
 *
 * "in"  = دخول مبلغ للعهدة
 * "out" = خروج مبلغ من العهدة
 */
export function updateCustodyBalance(
  id: string,
  amount: number,
  type: "in" | "out",
): Custody | undefined {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ حركة العهدة غير صحيح.");
  }

  const custody = getCustodyById(id);

  if (!custody) {
    return undefined;
  }

  const newBalance =
    type === "in"
      ? custody.balance + amount
      : custody.balance - amount;

  /*
   * عهدة "عهدتي أنا" لها رصيد فعلي لا يجوز تجاوزه.
   * عهدة الموقع وأي عهدة أخرى تمثل حسابًا مستمرًا،
   * لذلك يمكن أن يصبح رصيدها سالبًا عند تسجيل مصروف/سلفة.
   */
  if (
    type === "out" &&
    custody.type === "central" &&
    newBalance < 0
  ) {
    throw new Error("رصيد عهدتي أنا غير كافٍ.");
  }

  const newTotalIn =
    type === "in"
      ? custody.totalIn + amount
      : custody.totalIn;

  const newTotalOut =
    type === "out"
      ? custody.totalOut + amount
      : custody.totalOut;

  return updateCustody(id, {
    balance: newBalance,
    totalIn: newTotalIn,
    totalOut: newTotalOut,
  });
}

/*
 * عكس أثر حركة عهدة مسجلة بالفعل.
 *
 * إذا كانت الحركة الأصلية "out" يتم إعادة المبلغ للعهدة
 * وتقليل totalOut بنفس القيمة.
 * وإذا كانت "in" يتم سحب المبلغ وتقليل totalIn.
 */
export function reverseCustodyBalance(
  id: string,
  amount: number,
  originalType: "in" | "out",
): Custody | undefined {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ عكس حركة العهدة غير صحيح.");
  }

  const custody = getCustodyById(id);

  if (!custody) {
    throw new Error("العهدة المرتبطة بالحركة غير موجودة.");
  }

  const newBalance =
    originalType === "out"
      ? custody.balance + amount
      : custody.balance - amount;

  const newTotalIn =
    originalType === "in"
      ? Math.max(0, custody.totalIn - amount)
      : custody.totalIn;

  const newTotalOut =
    originalType === "out"
      ? Math.max(0, custody.totalOut - amount)
      : custody.totalOut;

  if (custody.type === "central" && newBalance < 0) {
    throw new Error("لا يمكن عكس الحركة لأن رصيد عهدتي أنا سيصبح سالبًا.");
  }

  return updateCustody(id, {
    balance: newBalance,
    totalIn: newTotalIn,
    totalOut: newTotalOut,
  });
}

export function getProjectCustody(
  projectId: string,
): Custody | undefined {
  return getCustodies().find(
    (custody) =>
      custody.type === "project" &&
      custody.projectId === projectId,
  );
}

export function ensureProjectCustody(
  projectId: string,
  projectName: string,
  responsiblePerson?: string,
): Custody {
  const existingCustody =
    getProjectCustody(projectId);

  if (existingCustody) {
    return (
      updateCustody(existingCustody.id, {
        name: `عهدة ${projectName}`,
        responsiblePerson,
        projectId,
        type: "project",
      }) ?? existingCustody
    );
  }

  const now = new Date().toISOString();

  return addCustody({
    id: `project-${projectId}`,
    name: `عهدة ${projectName}`,
    type: "project",
    responsiblePerson,
    projectId,
    balance: 0,
    totalIn: 0,
    totalOut: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateProjectCustody(
  projectId: string,
  updates: Pick<
    Custody,
    "name" | "responsiblePerson"
  >,
): Custody | undefined {
  const custody = getProjectCustody(projectId);

  if (!custody) {
    return undefined;
  }

  return updateCustody(
    custody.id,
    updates,
  );
}
