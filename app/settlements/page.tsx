"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, ImagePlus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { canCurrentUser } from "@/lib/permission-check";
import { getCompanies } from "@/lib/data/companies";
import { addSettlement, deleteSettlement, getSettlementPaidAmount, getSettlements, getSettlementRemaining, SETTLEMENT_STATUSES, updateSettlement } from "@/lib/data/settlements";
import type { Settlement } from "@/types/settlement";
import type { Company } from "@/types/company";
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
export default function SettlementsPage(){
const [rows,setRows]=useState<Settlement[]>([]);
const [companies,setCompanies]=useState<Company[]>([]);
const [q,setQ]=useState("");
const [editing,setEditing]=useState<Settlement|null>(null);
const [open,setOpen]=useState(false);
const [companyId,setCompanyId]=useState("");
const [number,setNumber]=useState("");
const [date,setDate]=useState(new Date().toISOString().slice(0,10));
const [work,setWork]=useState("");
const [deductions,setDeductions]=useState("0");
const [status,setStatus]=useState<Settlement["status"]>("draft");
const [notes,setNotes]=useState("");
const [images,setImages]=useState<CompanyNoteImage[]>([]);
const [error,setError]=useState("");
const load=()=>{
setRows(getSettlements());
setCompanies(getCompanies())};
useEffect(()=>{
load()},[]);
const cmap=useMemo(()=>new Map(companies.map(x=>[x.id,x.name])),[companies]);
const filtered=useMemo(()=>{
const s=q.trim().toLocaleLowerCase();return rows.filter(x=>!s||x.number.toLocaleLowerCase().includes(s)||(cmap.get(x.companyId)||"").toLocaleLowerCase().includes(s))},[rows,q,cmap]);
const reset=()=>{
setEditing(null);
setCompanyId("");
setNumber("");
setDate(new Date().toISOString().slice(0,10));
setWork("");
setDeductions("0");
setStatus("draft");
setNotes("");
setImages([]);
setError("")};
const edit=(x:Settlement)=>{
setEditing(x);
setCompanyId(x.companyId);
setNumber(x.number);
setDate(x.date);
setWork(String(x.workValue));
setDeductions(String(x.deductions));
setStatus(x.status);
setNotes(x.notes);
setImages(x.images);
setError("");
setOpen(true)};
const submit=(e:React.FormEvent)=>{
e.preventDefault();
try{
const input={companyId,number,date,workValue:Number(work.replace(/,/g,"")),deductions:Number(deductions.replace(/,/g,"")),status,notes,images};
if(editing)updateSettlement(editing.id,input);
else addSettlement(input);
setOpen(false);
reset();
load()}catch(err){
setError(err instanceof Error?err.message:"تعذر حفظ المستخلص.")}};
const upload=async(e:React.ChangeEvent<HTMLInputElement>)=>{
const files=Array.from(e.target.files??[]);
e.target.value="";
try{
const converted=await Promise.all(files.map(compress));
setImages(v=>[...v,...converted])}catch(err){
setError(err instanceof Error?err.message:"تعذر إضافة الصورة.")}};
return <AppShell>
<div dir="rtl" className="app-page mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<div>
<h1 className="text-2xl font-black">المستخلصات</h1>
<p className="mt-1 text-sm font-semibold text-slate-500">مستخلصات الشركات المستقلة عن حسابات المقاولين.</p>
</div>{canCurrentUser("create")&&<button onClick={()=>{
reset();
setOpen(true)}} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">
<Plus className="h-4 w-4"/>إضافة مستخلص</button>}</div>
<div className="relative">
<Search className="absolute right-4 top-3.5 h-4 w-4 text-slate-400"/>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث برقم المستخلص أو الشركة" className="h-11 w-full rounded-xl border pr-11 pl-4 text-sm font-semibold"/>
</div>
<div className="overflow-x-auto rounded-2xl border bg-white">
<table className="min-w-full text-right text-sm">
<thead className="bg-slate-50 text-xs font-black text-slate-500">
<tr>
<th className="px-4 py-3">المستخلص</th>
<th className="px-4 py-3">الشركة</th>
<th className="px-4 py-3">التاريخ</th>
<th className="px-4 py-3">الصافي</th>
<th className="px-4 py-3">المحصل</th>
<th className="px-4 py-3">المتبقي</th>
<th className="px-4 py-3">الحالة</th>
<th className="px-4 py-3">إجراء</th>
</tr>
</thead>
<tbody>{filtered.map(x=>{
const paid=getSettlementPaidAmount(x.id),remaining=getSettlementRemaining(x);return <tr key={x.id} className="border-t"><td className="px-4 py-4 font-black">#{x.number}</td><td className="px-4 py-4 font-bold">{cmap.get(x.companyId)||"شركة غير موجودة"}</td><td className="px-4 py-4">{x.date}</td><td className="px-4 py-4 font-black">{money(x.netValue)} ج.م</td><td className="px-4 py-4 font-black text-emerald-700">{money(paid)}</td><td className="px-4 py-4 font-black text-amber-700">{money(remaining)}</td><td className="px-4 py-4">{SETTLEMENT_STATUSES.find(s=>s.value===x.status)?.label}</td><td className="px-4 py-4"><div className="flex gap-2">{canCurrentUser("update")&&<button onClick={()=>edit(x)} className="rounded-lg border p-2"><Pencil className="h-4 w-4"/></button>}{canCurrentUser("delete")&&<button onClick={()=>{
try{
deleteSettlement(x.id);load()}catch(err){
setError(err instanceof Error?err.message:"تعذر الحذف.")}}} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 className="h-4 w-4"/></button>}</div></td></tr>})}</tbody>
</table>{filtered.length===0&&<div className="p-10 text-center text-sm font-bold text-slate-400">لا توجد مستخلصات.</div>}</div>{error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}<a href="/checks" className="inline-flex rounded-xl border bg-white px-4 py-3 text-xs font-black">الانتقال إلى الشيكات ←</a>{open&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
<form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">
<div className="flex items-center justify-between">
<h2 className="text-xl font-black">{editing?"تعديل مستخلص":"إضافة مستخلص"}</h2>
<button type="button" onClick={()=>setOpen(false)}>
<X/>
</button>
</div>
<div className="mt-5 grid gap-4 sm:grid-cols-2">
<select required value={companyId} onChange={e=>setCompanyId(e.target.value)} className="h-11 rounded-xl border px-3 text-sm font-semibold">
<option value="">اختر الشركة</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
<input required value={number} onChange={e=>setNumber(e.target.value)} placeholder="رقم المستخلص" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<select value={status} onChange={e=>setStatus(e.target.value as Settlement["status"])} className="h-11 rounded-xl border px-3 text-sm font-semibold">{SETTLEMENT_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>
<input required value={work} onChange={e=>setWork(e.target.value)} placeholder="قيمة الأعمال" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<input required value={deductions} onChange={e=>setDeductions(e.target.value)} placeholder="الخصومات والاستقطاعات" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>
<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات المستخلص" className="min-h-28 rounded-xl border p-3 text-sm font-semibold sm:col-span-2"/>
<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black sm:col-span-2">
<ImagePlus className="h-4 w-4"/>إرفاق صور ومستندات<input type="file" accept="image/*" multiple onChange={upload} className="sr-only"/>
</label>
</div>{images.length>0&&<div className="mt-3 grid grid-cols-3 gap-3">{images.map(img=><div key={img.id} className="relative overflow-hidden rounded-xl border"><img src={img.dataUrl} alt={img.name} className="h-28 w-full object-cover"/><button type="button" onClick={()=>setImages(v=>v.filter(x=>x.id!==img.id))} className="absolute left-1 top-1 rounded bg-red-600 p-1 text-white"><X className="h-3 w-3"/></button></div>)}</div>}<div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-black">صافي المستخلص: {money(Number(work||0)-Number(deductions||0))} ج.م</div>{error&&<p className="mt-3 text-sm font-bold text-red-600">{error}</p>}<button className="mt-5 h-11 w-full rounded-xl bg-slate-900 text-sm font-black text-white">حفظ المستخلص</button>
</form>
</div>}</div>
</AppShell>}
