export type PartnerAccountOwner = "hajj_ramadan" | "hajj_nabil";

export interface PartnerFinancialAccount {
  id: string;
  owner: PartnerAccountOwner;
  name: string;
  openingBalance: number;
  balance: number;
  totalIn: number;
  totalOut: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const PARTNER_ACCOUNT_OWNERS: { value: PartnerAccountOwner; label: string }[] = [
  { value: "hajj_ramadan", label: "الحاج رمضان" },
  { value: "hajj_nabil", label: "الحاج نبيل" },
];
