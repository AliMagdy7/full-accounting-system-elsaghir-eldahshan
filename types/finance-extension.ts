export type AccountKind = "cash" | "bank";
export interface CashBankAccount { id:string; name:string; kind:AccountKind; bankName?:string; accountNumber?:string; openingBalance:number; balance:number; notes?:string; createdAt:string; updatedAt:string; }
export interface Supplier { id:string; name:string; phone?:string; taxNumber?:string; address?:string; notes?:string; createdAt:string; updatedAt:string; }
export interface PurchaseInvoice { id:string;
supplierId:string;
financialAccountId?:string;
number:string;
date:string;
subtotal:number;
discount:number;
tax:number;
total:number;
paid:number;
status:"draft"|"approved"|"partially_paid"|"paid"|"cancelled";
notes?:string;
createdAt:string;
updatedAt:string;
}
export interface AccountingPeriod { id:string; month:string; status:"open"|"closed"; closedAt?:string; closedBy?:string; reason?:string; }
export interface ApprovalRequest { id:string; entity:string; entityId:string; status:"pending"|"approved"|"rejected"; requestedBy?:string; decidedBy?:string; reason?:string; createdAt:string; decidedAt?:string; }
export interface SystemDocument { id:string; title:string; category:string; entityType:string; entityId:string; fileName:string; dataUrl:string; notes?:string; createdAt:string; createdBy?:string; }
