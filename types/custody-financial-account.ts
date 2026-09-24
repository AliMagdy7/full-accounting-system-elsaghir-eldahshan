export interface CustodyFinancialAccount {
  id: string;
  custodyId: string;
  name: string;
  openingBalance: number;
  balance: number;
  totalIn: number;
  totalOut: number;
  createdAt: string;
  updatedAt: string;
}
