import type { CustodyTransaction } from "@/types/custody-transaction";

const STORAGE_KEY =
  "elsaghir-eldahshan-custody-transactions";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function readTransactions(): CustodyTransaction[] {
  if (!canUseStorage()) {
    return [];
  }

  const stored =
    window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed as CustodyTransaction[];
    }
  } catch {
    // Ignore invalid stored data.
  }

  return [];
}

function saveTransactions(
  transactions: CustodyTransaction[],
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(transactions),
  );
}

export function getCustodyTransactions(): CustodyTransaction[] {
  return readTransactions();
}

export function getCustodyTransactionsByCustodyId(
  custodyId: string,
): CustodyTransaction[] {
  return readTransactions().filter(
    (transaction) =>
      transaction.custodyId === custodyId,
  );
}

export function getCustodyTransactionById(
  id: string,
): CustodyTransaction | undefined {
  return readTransactions().find(
    (transaction) =>
      transaction.id === id,
  );
}

export function addCustodyTransaction(
  transaction: CustodyTransaction,
): CustodyTransaction {
  const transactions =
    readTransactions();

  transactions.push(transaction);

  saveTransactions(transactions);

  return transaction;
}

export function updateCustodyTransaction(
  id: string,
  updates: Partial<CustodyTransaction>,
): CustodyTransaction | undefined {
  const transactions =
    readTransactions();

  const index =
    transactions.findIndex(
      (transaction) =>
        transaction.id === id,
    );

  if (index === -1) {
    return undefined;
  }

  const updatedTransaction: CustodyTransaction =
    {
      ...transactions[index],
      ...updates,
      updatedAt:
        new Date().toISOString(),
    };

  transactions[index] =
    updatedTransaction;

  saveTransactions(transactions);

  return updatedTransaction;
}