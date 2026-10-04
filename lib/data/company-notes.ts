import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import type { CompanyNote, CompanyNoteImage } from "@/types/company-note";
const STORAGE_KEY="elsaghir-eldahshan-company-notes";
const read=():CompanyNote[]=>{if(typeof window==="undefined")return[];try{const raw=window.localStorage.getItem(STORAGE_KEY);const p=raw?JSON.parse(raw):[];return Array.isArray(p)?p:[]}catch{return[]}};
const save=(x:CompanyNote[])=>{if(typeof window!=="undefined"){window.localStorage.setItem(STORAGE_KEY,JSON.stringify(x));window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));}};
export function getCompanyNotes(companyId:string){return read().filter(x=>x.companyId===companyId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export function addCompanyNote(input:{companyId:string;text:string;images?:CompanyNoteImage[]}){
assertCurrentUserPermission("create");
const text=input.text.trim();
const images=input.images??[];
if(!text&&!images.length)throw new Error("اكتب الملاحظة أو أرفق صورة واحدة على الأقل.");
const now=new Date().toISOString();
const note={id:crypto.randomUUID(),companyId:input.companyId,text,images,createdAt:now,updatedAt:now};
save([...read(),note]);
addAuditLog({action:"create",entity:"company",entityId:input.companyId,description:"تمت إضافة ملاحظة ومستندات للشركة.",notificationTitle:"إضافة ملاحظة شركة",notificationType:"success",notificationHref:`/companies/${input.companyId}`,metadata:{noteId:note.id,imageCount:images.length}});
return note;
}
export function updateCompanyNote(id:string,updates:Partial<Pick<CompanyNote,"text"|"images">>){
assertCurrentUserPermission("update");
const items=read();
const i=items.findIndex(x=>x.id===id);
if(i<0)throw new Error("الملاحظة غير موجودة.");
const prev=items[i];
const next={...prev,...updates,text:updates.text!==undefined?updates.text.trim():prev.text,images:updates.images??prev.images,updatedAt:new Date().toISOString()};
if(!next.text&&!next.images.length)throw new Error("لا يمكن حفظ ملاحظة فارغة.");
items[i]=next;
save(items);
addAuditLog({action:"update",entity:"company",entityId:next.companyId,description:"تم تعديل ملاحظة في حساب شركة.",notificationTitle:"تعديل ملاحظة شركة",notificationType:"info",notificationHref:`/companies/${next.companyId}`,metadata:{noteId:id,previous:prev}});
return next;
}
export function deleteCompanyNote(id:string){
assertCurrentUserPermission("delete");
const items=read();
const note=items.find(x=>x.id===id);
if(!note)throw new Error("الملاحظة غير موجودة.");
save(items.filter(x=>x.id!==id));
addAuditLog({action:"delete",entity:"company",entityId:note.companyId,description:"تم حذف ملاحظة من حساب شركة.",notificationTitle:"حذف ملاحظة شركة",notificationType:"warning",notificationHref:`/companies/${note.companyId}`});
}
