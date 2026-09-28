export type ProjectExpenseMovementType =
  | "expense"
  | "worker_advance"
  | "contractor_advance";

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  custodyId: string;
  projectId?: string;
  financialAccountId?: string;
  movementType?: ProjectExpenseMovementType;
  custodyTransactionId?: string;
  contractorId?: string;
  workerId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
