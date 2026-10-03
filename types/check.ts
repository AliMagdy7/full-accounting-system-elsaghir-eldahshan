import type { CompanyNoteImage } from "@/types/company-note";

export type CheckStatus = "received" | "due" | "collected" | "returned" | "cancelled";

export interface CompanyCheck {
  id: string;
  companyId: string;
  settlementId: string;
  number: string;
  bank: string;
  beneficiary: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: CheckStatus;
  /** الحساب البنكي/المالي داخل عهدتي أنا إذا كان الشيك دخل عندي. */
  financialAccountId?: string;
  /** حساب الشريك المستلم إذا لم يدخل الشيك عندي. */
  partnerAccountId?: string;
  custodyTransactionId?: string;
  notes: string;
  images: CompanyNoteImage[];
  createdAt: string;
  updatedAt: string;
}
