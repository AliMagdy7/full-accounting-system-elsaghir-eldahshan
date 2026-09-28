import { assertCurrentUserPermission } from "@/lib/permission-check";
import type { CustodyTransaction } from "@/types/custody-transaction";
import { addAuditLog } from "@/lib/data/audit-logs";

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

export function getCustodyTransactionByWorkerFinancialMovementId(
  workerFinancialMovementId: string,
): CustodyTransaction | undefined {
  return readTransactions().find(
    (transaction) =>
      transaction.workerFinancialMovementId ===
      workerFinancialMovementId,
  );
}

export function addCustodyTransaction(
  transaction: CustodyTransaction,
): CustodyTransaction {
  assertCurrentUserPermission("create");
  const transactions =
    readTransactions();

  transactions.push(transaction);

  saveTransactions(transactions);

  addAuditLog({
    action: transaction.type === "transfer" ? "transfer" : "create",
    entity: "custody_transaction",
    entityId: transaction.id,
    description: `تمت إضافة حركة عهدة: ${transaction.description} بقيمة ${transaction.amount.toLocaleString("en-US")} ج.م.`,
    notificationTitle: transaction.type === "transfer" ? "تحويل بين العهد" : "حركة عهدة جديدة",
    notificationType: "success",
    notificationHref: "/custodies",
    notify: transaction.type === "transfer",
  });

  return transaction;
}

export function updateCustodyTransaction(
  id: string,
  updates: Partial<CustodyTransaction>,
): CustodyTransaction | undefined {
  assertCurrentUserPermission("update");
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

  addAuditLog({
    action: "update",
    entity: "custody_transaction",
    entityId: updatedTransaction.id,
    description: `تم تعديل حركة العهدة: ${updatedTransaction.description}.`,
    notificationTitle: "تعديل حركة عهدة",
    notificationType: "info",
    notificationHref: "/custodies",
    metadata: { previous: transactions[index], updates },
  });

  return updatedTransaction;
}

export function deleteCustodyTransaction(
  id: string,
): void {
  assertCurrentUserPermission("delete");
  const transactions =
    readTransactions();

  const exists = transactions.some(
    (transaction) =>
      transaction.id === id,
  );

  if (!exists) {
    throw new Error("حركة العهدة غير موجودة.");
  }

  saveTransactions(
    transactions.filter(
      (transaction) =>
        transaction.id !== id,
    ),
  );

  addAuditLog({
    action: "delete",
    entity: "custody_transaction",
    entityId: id,
    description: "تم حذف حركة عهدة.",
    notificationTitle: "حذف حركة عهدة",
    notificationType: "warning",
    notificationHref: "/custodies",
  });
}
