export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  custodyId: string;
  projectId?: string;
  financialAccountId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}