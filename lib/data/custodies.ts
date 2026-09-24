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
  const custody = getCustodyById(id);

  if (!custody) {
    return undefined;
  }

  const newBalance =
    type === "in"
      ? custody.balance + amount
      : custody.balance - amount;

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