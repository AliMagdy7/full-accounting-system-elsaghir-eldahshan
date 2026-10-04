import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import { assertTransactionEditable } from "@/lib/data/system-controls";
import { updateCustodyFinancialAccountBalance } from "@/lib/data/custody-financial-accounts";
import type { CashBankAccount,Supplier,PurchaseInvoice,AccountingPeriod,ApprovalRequest,SystemDocument } from "@/types/finance-extension";
const notify=()=>typeof window!=="undefined"&&window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
const read=<T,>(key:string):T[]=>{if(typeof window==="undefined")return[];try{const x=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(x)?x:[]}catch{return[]}};
const save=<T,>(key:string,v:T[])=>{localStorage.setItem(key,JSON.stringify(v));notify()};
const norm=(s:string)=>s.trim().replace(/\s+/g," ").toLocaleLowerCase();
const now=()=>new Date().toISOString(); const id=()=>crypto.randomUUID();
export const getAccounts=()=>read<CashBankAccount>("elsaghir-finance-accounts");
export function addAccount(input:Omit<CashBankAccount,"id"|"createdAt"|"updatedAt"|"balance">){
assertCurrentUserPermission("create");
const rows=getAccounts();
if(rows.some(x=>norm(x.name)===norm(input.name)))throw new Error("اسم الحساب مستخدم بالفعل.");
const t=now();
const x={...input,id:id(),balance:input.openingBalance,createdAt:t,updatedAt:t};
save("elsaghir-finance-accounts",[...rows,x]);
addAuditLog({action:"create",entity:"finance_account",entityId:x.id,description:`تم إنشاء حساب ${x.name}.`,notificationTitle:"إضافة حساب مالي",notificationType:"success",notificationHref:"/treasury"});
return x}
export const getSuppliers=()=>read<Supplier>("elsaghir-suppliers");
export function addSupplier(input:Omit<Supplier,"id"|"createdAt"|"updatedAt">){
assertCurrentUserPermission("create");
const rows=getSuppliers();
if(rows.some(x=>norm(x.name)===norm(input.name)))throw new Error("اسم المورد مستخدم بالفعل.");
const t=now(),x={...input,id:id(),createdAt:t,updatedAt:t};
save("elsaghir-suppliers",[...rows,x]);
addAuditLog({action:"create",entity:"supplier",entityId:x.id,description:`تمت إضافة المورد ${x.name}.`,notificationTitle:"إضافة مورد",notificationType:"success",notificationHref:"/suppliers"});
return x}
export const getPurchases=()=>read<PurchaseInvoice>("elsaghir-purchase-invoices");
export function addPurchase(input:Omit<PurchaseInvoice,"id"|"createdAt"|"updatedAt">){
assertCurrentUserPermission("create");
assertTransactionEditable(input.date);
if(input.total<0||input.paid<0||input.paid>input.total)throw new Error("قيم الفاتورة أو المدفوع غير صحيحة.");
const rows=getPurchases();
if(rows.some(x=>x.number.trim()===input.number.trim()))throw new Error("رقم الفاتورة مستخدم بالفعل.");
const t=now(),x={...input,id:id(),createdAt:t,updatedAt:t};
if(x.paid>0){
if(!x.financialAccountId)throw new Error("حدد وسيلة الدفع عند تسجيل دفعة على الفاتورة.");
updateCustodyFinancialAccountBalance(x.financialAccountId,x.paid,"out")}save("elsaghir-purchase-invoices",[...rows,x]);
addAuditLog({action:"create",entity:"purchase_invoice",entityId:x.id,description:`تمت إضافة فاتورة شراء ${x.number}.`,notificationTitle:"فاتورة شراء",notificationType:"success",notificationHref:"/purchases"});
return x}
export const getPeriods=()=>read<AccountingPeriod>("elsaghir-accounting-periods");
export function setPeriodStatus(month:string,status:"open"|"closed",reason?:string){
assertCurrentUserPermission("update");
const rows=getPeriods();
const old=rows.find(x=>x.month===month);
const x:AccountingPeriod={id:old?.id||id(),month,status,closedAt:status==="closed"?now():undefined,closedBy:status==="closed"?"current-user":undefined,reason};
save("elsaghir-accounting-periods",[...rows.filter(x=>x.month!==month),x]);
addAuditLog({action:"system",entity:"accounting_period",entityId:x.id,description:`تم ${status==="closed"?"إغلاق":"فتح"} الفترة ${month}.`,notificationTitle:"الفترة المحاسبية",notificationType:status==="closed"?"warning":"info",notificationHref:"/periods"});
return x}
export const isPeriodClosed=(date:string)=>getPeriods().some(x=>x.month===date.slice(0,7)&&x.status==="closed");
export const getApprovals=()=>read<ApprovalRequest>("elsaghir-approval-requests");
export function requestApproval(entity:string,entityId:string,reason?:string){
assertCurrentUserPermission("create");
const x:ApprovalRequest={id:id(),entity,entityId,status:"pending",requestedBy:"current-user",reason,createdAt:now()};
save("elsaghir-approval-requests",[...getApprovals(),x]);
addAuditLog({action:"system",entity:"approval",entityId:x.id,description:`تم طلب اعتماد ${entity}.`,notificationTitle:"طلب اعتماد",notificationType:"info",notificationHref:"/approvals"});
return x}
export function decideApproval(idv:string,status:"approved"|"rejected",reason?:string){
assertCurrentUserPermission("update");
const rows=getApprovals();
const x=rows.find(r=>r.id===idv);
if(!x)throw new Error("طلب الاعتماد غير موجود.");
const n={...x,status,decidedBy:"current-user",decidedAt:now(),reason:reason||x.reason};
save("elsaghir-approval-requests",rows.map(r=>r.id===idv?n:r));
return n}
export const getDocuments=()=>read<SystemDocument>("elsaghir-system-documents");
export function addDocument(input:Omit<SystemDocument,"id"|"createdAt">){
assertCurrentUserPermission("create");
if(!input.dataUrl.startsWith("data:"))throw new Error("صيغة المرفق غير صالحة.");
const x={...input,id:id(),createdAt:now(),createdBy:"current-user"};
save("elsaghir-system-documents",[...getDocuments(),x]);
addAuditLog({action:"create",entity:"document",entityId:x.id,description:`تم إرفاق مستند ${x.fileName}.`,notificationTitle:"إضافة مستند",notificationType:"success",notificationHref:"/documents"});
return x}
export function searchAll(term:string){
const q=norm(term);
if(!q)return[];
const groups:[string,string,unknown[]][]=[["شركة","company",read("elsaghir-eldahshan-companies")],["مورد","supplier",getSuppliers()],["مشروع","project",read("elsaghir-eldahshan-projects")],["عامل","worker",read("elsaghir-eldahshan-workers")],["مقاول","contractor",read("elsaghir-eldahshan-contractors")],["أصل","asset",read("elsaghir-company-assets")],["مستخلص","settlement",read("elsaghir-eldahshan-settlements")],["شيك","check",read("elsaghir-eldahshan-company-checks")],["فاتورة شراء","purchase",getPurchases()]];
return groups.flatMap(([label,type,rows])=>(rows as Record<string,unknown>[]).filter(x=>Object.values(x).some(v=>typeof v==="string"&&norm(v).includes(q))).slice(0,20).map(x=>({label,type,id:String(x.id||""),text:String(x.name||x.number||x.code||x.title||label)})))}
