"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { canCurrentUser } from "@/lib/permission-check";
import { addPartnerFinancialAccount, getPartnerFinancialAccounts, updatePartnerFinancialAccount } from "@/lib/data/partner-financial-accounts";
import { PARTNER_ACCOUNT_OWNERS } from "@/types/partner-financial-account";
import type { PartnerFinancialAccount, PartnerAccountOwner } from "@/types/partner-financial-account";
const money=(n:number)=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});
export default function PartnerAccountsPage(){
const [rows,setRows]=useState<PartnerFinancialAccount[]>(()=>getPartnerFinancialAccounts());
const [open,setOpen]=useState(false);
const [editing,setEditing]=useState<PartnerFinancialAccount|null>(null);
const [owner,setOwner]=useState<PartnerAccountOwner>("hajj_ramadan");
const [name,setName]=useState("");
const [opening,setOpening]=useState("0");
const [notes,setNotes]=useState("");
const [error,setError]=useState("");
const load=useCallback(()=>setRows(getPartnerFinancialAccounts()),[]);
useEffect(()=>{
window.addEventListener("elsaghir-data-updated",load);return()=>window.removeEventListener("elsaghir-data-updated",load)},[load]);
const reset=()=>{
setEditing(null);
setOwner("hajj_ramadan");
setName("");
setOpening("0");
setNotes("");
setError("")};
const edit=(row:PartnerFinancialAccount)=>{
setEditing(row);
setOwner(row.owner);
setName(row.name);
setOpening(String(row.openingBalance));
setNotes(row.notes||"");
setError("");
setOpen(true)};
const submit=(e:React.FormEvent)=>{
e.preventDefault();
try{
if(editing)updatePartnerFinancialAccount(editing.id,{owner,name,notes});
else addPartnerFinancialAccount({owner,name,openingBalance:Number(opening.replace(/,/g,"")),notes});
setOpen(false);
reset();
load()}catch(err){
setError(err instanceof Error?err.message:"تعذر حفظ الحساب.")}};
return <AppShell>
<div dir="rtl" className="app-page mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<div>
<h1 className="text-2xl font-black">حسابات الحجاج</h1>
<p className="mt-1 text-sm font-semibold text-slate-500">حسابات مستقلة عن عهدتي أنا. أي شيك يتم تحصيله عليها لا يدخل في رصيدي أو عهدتي المركزية.</p>
</div>
<div className="flex gap-2">
<button onClick={load} className="inline-flex h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-black">
<RefreshCw className="h-4 w-4"/>تحديث</button>{canCurrentUser("create")&&<button onClick={()=>{
reset();
setOpen(true)}} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">
<Plus className="h-4 w-4"/>إضافة حساب</button>}</div>
</div>
<div className="grid gap-4 md:grid-cols-2">{rows.map(row=><div key={row.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-slate-400">{PARTNER_ACCOUNT_OWNERS.find(x=>x.value===row.owner)?.label}</p><h2 className="mt-1 text-lg font-black">{row.name}</h2></div>{canCurrentUser("update")&&<button onClick={()=>edit(row)} className="rounded-lg border p-2"><Pencil className="h-4 w-4"/></button>}</div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold text-slate-400">الرصيد</p><p className="mt-1 font-black">{money(row.balance)} ج.م</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[11px] font-bold text-emerald-700">إجمالي الداخل</p><p className="mt-1 font-black text-emerald-800">{money(row.totalIn)} ج.م</p></div><div className="rounded-xl bg-red-50 p-3"><p className="text-[11px] font-bold text-red-700">إجمالي الخارج</p><p className="mt-1 font-black text-red-800">{money(row.totalOut)} ج.م</p></div></div>{row.notes&&<p className="mt-4 text-sm font-semibold text-slate-500">{row.notes}</p>}</div>)}</div>{open&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
<form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6">
<h2 className="text-xl font-black">{editing?"تعديل حساب":"إضافة حساب"}</h2>
<div className="mt-5 grid gap-4">
<select value={owner} onChange={e=>setOwner(e.target.value as PartnerAccountOwner)} className="h-11 rounded-xl border px-3 text-sm font-semibold">{PARTNER_ACCOUNT_OWNERS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
<input required value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الحساب" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>{!editing&&<input value={opening} onChange={e=>setOpening(e.target.value)} placeholder="الرصيد الافتتاحي" className="h-11 rounded-xl border px-3 text-sm font-semibold"/>}<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات" className="min-h-24 rounded-xl border p-3 text-sm font-semibold"/>{error&&<p className="text-sm font-bold text-red-600">{error}</p>}<div className="grid grid-cols-2 gap-3">
<button type="button" onClick={()=>setOpen(false)} className="h-11 rounded-xl border text-sm font-black">إلغاء</button>
<button className="h-11 rounded-xl bg-slate-900 text-sm font-black text-white">حفظ</button>
</div>
</div>
</form>
</div>}</div>
</AppShell>}
