"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, ImagePlus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { canCurrentUser } from "@/lib/permission-check";
import { getCompanies } from "@/lib/data/companies";
import { addCompanyCheck, CHECK_STATUSES, deleteCompanyCheck, getCompanyChecks, updateCompanyCheck } from "@/lib/data/company-checks";
import { getSettlements } from "@/lib/data/settlements";
import { getCustodyFinancialAccounts } from "@/lib/data/custody-financial-accounts";
import { getPartnerFinancialAccounts } from "@/lib/data/partner-financial-accounts";
import type { CompanyCheck } from "@/types/check";
import type { Company } from "@/types/company";
import type { Settlement } from "@/types/settlement";
import type { CustodyFinancialAccount } from "@/types/custody-financial-account";
import type { PartnerFinancialAccount } from "@/types/partner-financial-account";
import type { CompanyNoteImage } from "@/types/company-note";
const money=(n:number)=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});
const compress=async(file:File):Promise<CompanyNoteImage>=>{
if(!file.type.startsWith("image/"))throw new Error("المرفق يجب أن يكون صورة.");
const url=URL.createObjectURL(file);
try{
const img=await new Promise<HTMLImageElement>((r,j)=>{
const x=new Image();x.onload=()=>r(x);x.onerror=()=>j(new Error("تعذر قراءة الصورة."));x.src=url});
const s=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
const c=document.createElement("canvas");
c.width=Math.max(1,Math.round(img.naturalWidth*s));
c.height=Math.max(1,Math.round(img.naturalHeight*s));
const ctx=c.getContext("2d");
if(!ctx)throw new Error("تعذر تجهيز الصورة.");
ctx.drawImage(img,0,0,c.width,c.height);
return{id:crypto.randomUUID(),name:file.name,dataUrl:c.toDataURL("image/jpeg",.78)}}finally{
URL.revokeObjectURL(url)}};
export default function ChecksPage(){
const [rows,setRows]=useState<CompanyCheck[]>(()=>getCompanyChecks());
const [companies,setCompanies]=useState<Company[]>(()=>getCompanies());
const [settlements,setSettlements]=useState<Settlement[]>(()=>getSettlements());
const [accounts,setAccounts]=useState<CustodyFinancialAccount[]>(()=>getCustodyFinancialAccounts("central"));
const [partnerAccounts,setPartnerAccounts]=useState<PartnerFinancialAccount[]>(()=>getPartnerFinancialAccounts());
const [q,setQ]=useState("");
const [editing,setEditing]=useState<CompanyCheck|null>(null);
const [open,setOpen]=useState(false);
const [companyId,setCompanyId]=useState("");
const [settlementId,setSettlementId]=useState("");
const [number,setNumber]=useState("");
const [bank,setBank]=useState("");
const [beneficiary,setBeneficiary]=useState("");
const [amount,setAmount]=useState("");
const [issueDate,setIssueDate]=useState(new Date().toISOString().slice(0,10));
const [dueDate,setDueDate]=useState(new Date().toISOString().slice(0,10));
const [status,setStatus]=useState<CompanyCheck["status"]>("received");
const [destinationType,setDestinationType]=useState<"mine"|"partner">("mine");
const [accountId,setAccountId]=useState("");
const [partnerAccountId,setPartnerAccountId]=useState("");
const [notes,setNotes]=useState("");
const [images,setImages]=useState<CompanyNoteImage[]>([]);
const [error,setError]=useState("");
const load=useCallback(()=>{
setRows(getCompanyChecks());setCompanies(getCompanies());setSettlements(getSettlements());setAccounts(getCustodyFinancialAccounts("central"));setPartnerAccounts(getPartnerFinancialAccounts())},[]);
useEffect(()=>{
window.addEventListener("elsaghir-data-updated",load);return()=>window.removeEventListener("elsaghir-data-updated",load)},[load]);
const cmap=useMemo(()=>new Map(companies.map(x=>[x.id,x.name])),[companies]);
const smap=useMemo(()=>new Map(settlements.map(x=>[x.id,x.number])),[settlements]);
const pmap=useMemo(()=>new Map(partnerAccounts.map(x=>[x.id,x.name])),[partnerAccounts]);
const filtered=useMemo(()=>{
const s=q.trim().toLocaleLowerCase();return rows.filter(x=>!s||x.number.toLocaleLowerCase().includes(s)||(cmap.get(x.companyId)||"").toLocaleLowerCase().includes(s)||(x.bank||"").toLocaleLowerCase().includes(s))},[rows,q,cmap]);
const reset=()=>{
setEditing(null);
setCompanyId("");
setSettlementId("");
setNumber("");
setBank("");
setBeneficiary("");
setAmount("");
setIssueDate(new Date().toISOString().slice(0,10));
setDueDate(new Date().toISOString().slice(0,10));
setStatus("received");
setDestinationType("mine");
setAccountId("");
setPartnerAccountId("");
setNotes("");
setImages([]);
setError("")};
const edit=(x:CompanyCheck)=>{
setEditing(x);
setCompanyId(x.companyId);
setSettlementId(x.settlementId);
setNumber(x.number);
setBank(x.bank);
setBeneficiary(x.beneficiary);
setAmount(String(x.amount));
setIssueDate(x.issueDate);
setDueDate(x.dueDate);
setStatus(x.status);
setDestinationType(x.partnerAccountId?"partner":"mine");
setAccountId(x.financialAccountId||"");
setPartnerAccountId(x.partnerAccountId||"");
setNotes(x.notes);
setImages(x.images);
setError("");
setOpen(true)};
const submit=(e:React.FormEvent)=>{
e.preventDefault();
try{
const input={companyId,settlementId,number,bank,beneficiary,amount:Number(amount.replace(/,/g,"")),issueDate,dueDate,status,financialAccountId:status==="collected"&&destinationType==="mine"?accountId:undefined,partnerAccountId:status==="collected"&&destinationType==="partner"?partnerAccountId:undefined,custodyTransactionId:editing?.custodyTransactionId,notes,images};
if(editing)updateCompanyCheck(editing.id,input);
else addCompanyCheck(input);
setOpen(false);
reset();
load()}catch(err){
setError(err instanceof Error?err.message:"تعذر حفظ الشيك.")}};
const upload=async(e:React.ChangeEvent<HTMLInputElement>)=>{
const files=Array.from(e.target.files??[]);
e.target.value="";
try{
const converted=await Promise.all(files.map(compress));
setImages(v=>[...v,...converted])}catch(err){
setError(err instanceof Error?err.message:"تعذر إضافة الصورة.")}};
const companySettlements=settlements.filter(x=>x.companyId===companyId);
return <AppShell>
<div dir="rtl" className="app-page mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<div>
<h1 className="text-2xl font-black">الشيكات</h1>
<p className="mt-1 text-sm font-semibold text-slate-500">شيكات الشركات المرتبطة بالمستخلصات — رقم الشيك لا يتكرر على مستوى النظام.</p>
</div>{canCurrentUser("create")&&<button onClick={()=>{
reset();
setOpen(true)}} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">
<Plus className="h-4 w-4"/>إضافة شيك</button>}</div>
<div className="relative">
<Search className="absolute right-4 top-3.5 h-4 w-4 text-slate-400"/>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث برقم الشيك أو الشركة أو البنك" className="h-11 w-full rounded-xl border pr-11 pl-4 text-sm font-semibold"/>
</div>
<div className="overflow-x-auto rounded-2xl border bg-white">
<table className="min-w-full text-right text-sm">
<thead className="bg-slate-50 text-xs font-black text-slate-500">
<tr>
<th className="px-4 py-3">رقم الشيك</th>
<th className="px-4 py-3">الشركة</th>
<th className="px-4 py-3">المستخلص</th>
<th className="px-4 py-3">البنك</th>
<th className="px-4 py-3">القيمة</th>
<th className="px-4 py-3">الاستحقاق</th>
<th className="px-4 py-3">الحالة</th>
<th className="px-4 py-3">وجهة التحصيل</th>
<th className="px-4 py-3">إجراء</th>
</tr>
</thead>
<tbody>{filtered.map(x=><tr key={x.id} className="border-t"><td className="px-4 py-4 font-black">{x.number}</td><td className="px-4 py-4 font-bold">{cmap.get(x.companyId)||"شركة غير موجودة"}</td><td className="px-4 py-4">#{smap.get(x.settlementId)||"-"}</td><td className="px-4 py-4">{x.bank}</td><td className="px-4 py-4 font-black">{money(x.amount)} ج.م</td><td className="px-4 py-4">{x.dueDate}</td><td className="px-4 py-4">{CHECK_STATUSES.find(s=>s.value===x.status)?.label}</td><td className="px-4 py-4 font-bold">{x.status!=="collected"?"-":x.partnerAccountId?(pmap.get(x.partnerAccountId)||"حساب شريك"):"حسابي أنا"}</td><td className="px-4 py-4"><div className="flex gap-2">{canCurrentUser("update")&&<button onClick={()=>edit(x)} className="rounded-lg border p-2"><Pencil className="h-4 w-4"/></button>}{canCurrentUser("delete")&&<button onClick={()=>{
try{
deleteCompanyCheck(x.id);load()}catch(err){
setError(err instanceof Error?err.message:"تعذر الحذف.")}}} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 className="h-4 w-4"/></button>}</div></td></tr>)}</tbody>
</table>{filtered.length===0&&<div className="p-10 text-center text-sm font-bold text-slate-400">لا توجد شيكات.</div>}</div>{error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}<a href="/settlements" className="inline-flex rounded-xl border bg-white px-4 py-3 text-xs font-black">العودة للمستخلصات ←</a>{open&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
<form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">
<div className="flex items-center justify-between">
<h2 className="text-xl font-black">{editing?"تعديل شيك":"إضافة شيك"}</h2>
<button type="button" onClick={()=>setOpen(false)}>
<X/>
</button>
</div>
<div className="mt-5 grid gap-4 sm:grid-cols-2">
<select required value={companyId} onChange={e=>{
setCompanyId(e.target.value);
setSettlementId("")}} className="h-11 rounded-xl border px-3 text-sm font-semibold">
<option value="">اختر الشركة</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
<select required value={settlementId} onChange={e=>setSettlementId(e.target.value)} className="h-11 rounded-xl border px-3 text-sm font-semibold">
<option value="">اختر المستخلص</option>{companySettlements.map(s=><option key={s.id} value={s.id}>#{s.number} — {money(s.netValue)} ج.م</option>)}</select>
<input required value={number} onChange={e=>setNumber(e.target.value)} placeholder="رقم الشيك — يجب أن يكون فريدًا" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<input required value={bank} onChange={e=>setBank(e.target.value)} placeholder="البنك" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<input required value={beneficiary} onChange={e=>setBeneficiary(e.target.value)} placeholder="المستفيد" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<input required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="قيمة الشيك" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<input type="date" required value={issueDate} onChange={e=>setIssueDate(e.target.value)} className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<input type="date" required value={dueDate} onChange={e=>setDueDate(e.target.value)} className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<select value={status} onChange={e=>setStatus(e.target.value as CompanyCheck["status"])} className="h-11 rounded-xl border px-3 text-sm font-semibold">{CHECK_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>{status==="collected"&&<>
<select required value={destinationType} onChange={e=>{
const value=e.target.value as "mine"|"partner";
setDestinationType(value);
setAccountId("");
setPartnerAccountId("")}} className="h-11 rounded-xl border px-3 text-sm font-semibold">
<option value="mine">دخل في حسابي أنا</option>
<option value="partner">دخل في حساب أحد الحجاج</option>
</select>{destinationType==="mine"?<select required value={accountId} onChange={e=>setAccountId(e.target.value)} className="h-11 rounded-xl border px-3 text-sm font-semibold">
<option value="">اختر حسابي المالي</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>:<select required value={partnerAccountId} onChange={e=>setPartnerAccountId(e.target.value)} className="h-11 rounded-xl border px-3 text-sm font-semibold">
<option value="">اختر حساب الحاج</option>{partnerAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}</>}<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات الشيك" className="min-h-28 rounded-xl border p-3 text-sm font-semibold sm:col-span-2"/>
<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black sm:col-span-2">
<ImagePlus className="h-4 w-4"/>إرفاق صور ومستندات<input type="file" accept="image/*" multiple onChange={upload} className="sr-only"/>
</label>
</div>{images.length>0&&<div className="mt-3 grid grid-cols-3 gap-3">{images.map(img=><div key={img.id} className="relative overflow-hidden rounded-xl border"><img src={img.dataUrl} alt={img.name} className="h-28 w-full object-cover"/><button type="button" onClick={()=>setImages(v=>v.filter(x=>x.id!==img.id))} className="absolute left-1 top-1 rounded bg-red-600 p-1 text-white"><X className="h-3 w-3"/></button></div>)}</div>}<p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">تنبيه: رقم الشيك فريد على مستوى النظام بالكامل. وعند التحصيل يجب تحديد هل دخل في حسابي أنا أم في حساب أحد الحجاج؛ وإذا دخل حساب أحد الحجاج فلن يزيد رصيدي أو عهدتي المركزية.</p>{error&&<p className="mt-3 text-sm font-bold text-red-600">{error}</p>}<button className="mt-5 h-11 w-full rounded-xl bg-slate-900 text-sm font-black text-white">حفظ الشيك</button>
</form>
</div>}</div>
</AppShell>}
