import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import type { Company } from "@/types/company";
import type { Settlement } from "@/types/settlement";
import type { CompanyCheck } from "@/types/check";
import type { CompanyNote } from "@/types/company-note";

const STORAGE_KEY = "elsaghir-eldahshan-companies";
const notify = () => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
const read = (): Company[] => {
  if (typeof window === "undefined") return [];
  try { const raw = window.localStorage.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};
const save = (items: Company[]) => { if (typeof window !== "undefined") { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); notify(); } };

export function getCompanies() { return read().sort((a,b) => a.name.localeCompare(b.name, "ar")); }
export function getCompanyById(id: string) { return read().find(item => item.id === id); }
export function addCompany(input: Omit<Company,"id"|"createdAt"|"updatedAt">) {
  assertCurrentUserPermission("create");
  const name = input.name.trim();
  if (!name) throw new Error("اسم الشركة مطلوب.");
  if (read().some(item => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("يوجد شركة بنفس الاسم بالفعل.");
  const now = new Date().toISOString();
  const company: Company = { ...input, name, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  save([...read(), company]);
  addAuditLog({ action:"create", entity:"company", entityId:company.id, description:`تمت إضافة الشركة: ${name}.`, notificationTitle:"إضافة شركة", notificationType:"success", notificationHref:"/companies" });
  return company;
}
export function updateCompany(id:string, updates:Partial<Omit<Company,"id"|"createdAt">>) {
  assertCurrentUserPermission("update"); const items=read(); const index=items.findIndex(x=>x.id===id); if(index<0) throw new Error("الشركة غير موجودة.");
  const previous=items[index]; const name=(updates.name ?? previous.name).trim(); if(!name) throw new Error("اسم الشركة مطلوب.");
  if(items.some(x=>x.id!==id && x.name.trim().toLocaleLowerCase()===name.toLocaleLowerCase())) throw new Error("يوجد شركة بنفس الاسم بالفعل.");
  const next={...previous,...updates,name,updatedAt:new Date().toISOString()}; items[index]=next; save(items);
  addAuditLog({action:"update",entity:"company",entityId:id,description:`تم تعديل بيانات الشركة: ${name}.`,notificationTitle:"تعديل شركة",notificationType:"info",notificationHref:`/companies/${id}`,metadata:{previous,updates}}); return next;
}
export function deleteCompany(id:string) {
  assertCurrentUserPermission("delete"); const company=getCompanyById(id); if(!company) throw new Error("الشركة غير موجودة.");
  const hasLinked = ((key:string) => { try { const raw=window.localStorage.getItem(key); const rows=raw?JSON.parse(raw):[]; return Array.isArray(rows) && rows.some((x: Settlement | CompanyCheck | CompanyNote) => x.companyId===id); } catch { return false; } })("elsaghir-eldahshan-settlements") || ((key:string) => { try { const raw=window.localStorage.getItem(key); const rows=raw?JSON.parse(raw):[]; return Array.isArray(rows) && rows.some((x: Settlement | CompanyCheck | CompanyNote) => x.companyId===id); } catch { return false; } })("elsaghir-eldahshan-company-checks") || ((key:string) => { try { const raw=window.localStorage.getItem(key); const rows=raw?JSON.parse(raw):[]; return Array.isArray(rows) && rows.some((x: Settlement | CompanyCheck | CompanyNote) => x.companyId===id); } catch { return false; } })("elsaghir-eldahshan-company-notes");
  if(hasLinked) throw new Error("لا يمكن حذف الشركة لأنها مرتبطة بمستخلصات أو شيكات أو ملاحظات.");
  save(read().filter(x=>x.id!==id)); addAuditLog({action:"delete",entity:"company",entityId:id,description:`تم حذف الشركة: ${company.name}.`,notificationTitle:"حذف شركة",notificationType:"warning",notificationHref:"/companies"});
}
