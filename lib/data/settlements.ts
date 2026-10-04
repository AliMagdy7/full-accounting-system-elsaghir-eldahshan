import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import { assertTransactionEditable } from "@/lib/data/system-controls";
import { getCompanyById } from "@/lib/data/companies";
import type { Settlement, SettlementStatus } from "@/types/settlement";
import type { CompanyCheck } from "@/types/check";
const STORAGE_KEY="elsaghir-eldahshan-settlements";
const read=():Settlement[]=>{if(typeof window==="undefined")return[];try{const raw=window.localStorage.getItem(STORAGE_KEY);const p=raw?JSON.parse(raw):[];return Array.isArray(p)?p:[]}catch{return[]}};
const save=(x:Settlement[])=>{if(typeof window!=="undefined"){window.localStorage.setItem(STORAGE_KEY,JSON.stringify(x));window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));}};
const getLinkedChecks=(settlementId:string):CompanyCheck[]=>{
if(typeof window==="undefined")return[];
try{
const raw=window.localStorage.getItem("elsaghir-eldahshan-company-checks");
const parsed=raw?JSON.parse(raw):[];
return Array.isArray(parsed)?parsed.filter((x):x is CompanyCheck=>x&&typeof x==="object"&&x.settlementId===settlementId):[]}catch{
return[]}};
export function getSettlements(){return read().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));}
export function getSettlementById(id:string){return read().find(x=>x.id===id);}
export function getSettlementsByCompany(companyId:string){return getSettlements().filter(x=>x.companyId===companyId);}
export function addSettlement(input:Omit<Settlement,"id"|"netValue"|"createdAt"|"updatedAt">){
assertCurrentUserPermission("create");
assertTransactionEditable(input.date);
if(!getCompanyById(input.companyId))throw new Error("الشركة المحددة غير موجودة.");
const number=input.number.trim();
if(!number)throw new Error("رقم المستخلص مطلوب.");
if(read().some(x=>x.number.trim().toLocaleLowerCase()===number.toLocaleLowerCase()))throw new Error("رقم المستخلص مستخدم بالفعل.");
const work=Number(input.workValue),ded=Number(input.deductions);
if(!Number.isFinite(work)||work<0||!Number.isFinite(ded)||ded<0||ded>work)throw new Error("قيم المستخلص أو الخصومات غير صحيحة.");
const now=new Date().toISOString();
const row:Settlement={...input,number,workValue:work,deductions:ded,netValue:work-ded,id:crypto.randomUUID(),createdAt:now,updatedAt:now};
save([...read(),row]);
addAuditLog({action:"create",entity:"settlement",entityId:row.id,description:`تمت إضافة المستخلص رقم ${number} بقيمة صافي ${row.netValue.toLocaleString("en-US")} ج.م.`,notificationTitle:"إضافة مستخلص",notificationType:"success",notificationHref:"/settlements"});
return row;
}
export function updateSettlement(id:string,updates:Partial<Omit<Settlement,"id"|"createdAt"|"netValue">>){
assertCurrentUserPermission("update");
assertTransactionEditable(updates.date ?? getSettlementById(id)?.date ?? new Date().toISOString());
const items=read();
const i=items.findIndex(x=>x.id===id);
if(i<0)throw new Error("المستخلص غير موجود.");
const prev=items[i];
const number=(updates.number??prev.number).trim();
if(!number)throw new Error("رقم المستخلص مطلوب.");
if(items.some(x=>x.id!==id&&x.number.trim().toLocaleLowerCase()===number.toLocaleLowerCase()))throw new Error("رقم المستخلص مستخدم بالفعل.");
const work=Number(updates.workValue??prev.workValue),ded=Number(updates.deductions??prev.deductions);
if(!Number.isFinite(work)||work<0||!Number.isFinite(ded)||ded<0||ded>work)throw new Error("قيم المستخلص أو الخصومات غير صحيحة.");
if(updates.companyId&&!getCompanyById(updates.companyId))throw new Error("الشركة المحددة غير موجودة.");
const linkedChecks=getLinkedChecks(id);
if(linkedChecks.length){
if(updates.companyId&&updates.companyId!==prev.companyId)throw new Error("لا يمكن تغيير الشركة لمستخلص مرتبط بشيكات.");
const activeChecksTotal=linkedChecks.filter(x=>x.status!=="cancelled"&&x.status!=="returned").reduce((sum,x)=>sum+Number(x.amount||0),0);
if(activeChecksTotal>work-ded+0.01)throw new Error("لا يمكن تخفيض صافي المستخلص إلى أقل من إجمالي الشيكات المرتبطة به.");
}const next={...prev,...updates,number,workValue:work,deductions:ded,netValue:work-ded,updatedAt:new Date().toISOString()};
items[i]=next;
save(items);
addAuditLog({action:"update",entity:"settlement",entityId:id,description:`تم تعديل المستخلص رقم ${number}.`,notificationTitle:"تعديل مستخلص",notificationType:"info",notificationHref:`/settlements/${id}`,metadata:{previous:prev,updates}});
return next;
}
export function deleteSettlement(id:string){
assertCurrentUserPermission("delete");
const row=getSettlementById(id);
if(!row)throw new Error("المستخلص غير موجود.");
let checks:CompanyCheck[]=[];
try{
const raw=window.localStorage.getItem("elsaghir-eldahshan-company-checks");
const parsed=raw?JSON.parse(raw):[];
checks=Array.isArray(parsed)?parsed:[]}catch{
}if(checks.some(x=>x.settlementId===id))throw new Error("لا يمكن حذف المستخلص لأنه مرتبط بشيكات.");
save(read().filter(x=>x.id!==id));
addAuditLog({action:"delete",entity:"settlement",entityId:id,description:`تم حذف المستخلص رقم ${row.number}.`,notificationTitle:"حذف مستخلص",notificationType:"warning",notificationHref:"/settlements"});
}
export function getSettlementPaidAmount(settlementId:string){
let checks:CompanyCheck[]=[];
try{
const raw=typeof window!=="undefined"?window.localStorage.getItem("elsaghir-eldahshan-company-checks"):null;
const parsed=raw?JSON.parse(raw):[];
checks=Array.isArray(parsed)?parsed:[]}catch{
}return checks.filter(x=>x.settlementId===settlementId&&x.status==="collected").reduce((s,x)=>s+Number(x.amount||0),0);
}
export function getSettlementRemaining(settlement:Settlement){return Math.max(0,settlement.netValue-getSettlementPaidAmount(settlement.id));}
export const SETTLEMENT_STATUSES: {value:SettlementStatus;
label:string}[]=[{value:"draft",label:"مسودة"},{value:"review",label:"مراجعة"},{value:"approved",label:"معتمد"},{value:"paid",label:"مدفوع"},{value:"rejected",label:"مرفوض"}];
