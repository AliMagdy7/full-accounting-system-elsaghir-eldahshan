import type { CompanyNoteImage } from "@/types/company-note";

export type SettlementStatus = "draft" | "review" | "approved" | "paid" | "rejected";

export interface Settlement {
  id: string;
  companyId: string;
  number: string;
  date: string;
  workValue: number;
  deductions: number;
  netValue: number;
  status: SettlementStatus;
  notes: string;
  images: CompanyNoteImage[];
  createdAt: string;
  updatedAt: string;
}
