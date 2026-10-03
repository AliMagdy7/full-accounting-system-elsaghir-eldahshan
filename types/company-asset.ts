export type CompanyAssetStatus = "active" | "partially_sold" | "sold" | "disposed";
export type CompanyAssetTransactionType = "purchase" | "additional_purchase" | "sale";

export interface CompanyAssetTransaction {
  id: string;
  assetId: string;
  type: CompanyAssetTransactionType;
  date: string;
  quantity: number;
  amount: number;
  unitCost: number;
  financialAccountId?: string;
  buyer?: string;
  notes: string;
  createdAt: string;
}

export interface CompanyAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  serialNumber: string;
  unit: string;
  quantity: number;
  totalCost: number;
  currentValue: number;
  realizedProfit: number;
  realizedLoss: number;
  status: CompanyAssetStatus;
  location: string;
  projectId?: string;
  siteId?: string;
  purchaseDate: string;
  notes: string;
  images: { id: string; name: string; dataUrl: string }[];
  createdAt: string;
  updatedAt: string;
}
