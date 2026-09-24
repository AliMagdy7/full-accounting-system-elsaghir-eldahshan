export type CustodyTransactionType =
  | "in"
  | "out"
  | "transfer";

export interface CustodyTransaction {
  id: string;
  custodyId: string;
  type: CustodyTransactionType;
  amount: number;
  date: string;
  description: string;

  source?: string;
  fundingSource?: string;

  relatedCustodyId?: string;
  relatedTransactionId?: string;

  /** وسيلة الدفع / الحساب الذي نفذ الحركة. */
  financialAccountId?: string;

  /** وسيلة الدفع المقابلة في التحويل. */
  relatedFinancialAccountId?: string;

  projectId?: string;

  createdAt: string;
  updatedAt: string;
}
