"use client";import {useState} from "react";import {addSupplier,getSuppliers} from "@/lib/data/finance-extensions";import {ExtensionPage,SearchBox,Stat} from "@/components/ui/ExtensionPage";
export default function Suppliers(){
const [q,setQ]=useState("");
const [name,setName]=useState("");
const rows=getSuppliers().filter(x=>x.name.includes(q)||x.phone?.includes(q));
return <ExtensionPage title="الموردون" description="بيانات الموردين وكشوف حساباتهم والمدفوعات المرتبطة بهم.">
<Stat label="عدد الموردين" value={getSuppliers().length}/>
<div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
<form onSubmit={e=>{
e.preventDefault();
try{
addSupplier({name});
setName("")}catch(err){
alert(err instanceof Error?err.message:"خطأ")}}} className="rounded-2xl border bg-white p-5">
<h2 className="font-black">إضافة مورد</h2>
<input className="mt-4 w-full rounded-xl border p-3" value={name} onChange={e=>setName(e.target.value)} placeholder="اسم المورد"/>
<button className="mt-3 w-full rounded-xl bg-slate-900 p-3 font-bold text-white">حفظ</button>
</form>
<div className="rounded-2xl border bg-white p-5">
<SearchBox value={q} onChange={setQ}/>
<div className="mt-4 overflow-auto">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-right">
<th className="p-3">المورد</th>
<th className="p-3">الهاتف</th>
<th className="p-3">الرقم الضريبي</th>
</tr>
</thead>
<tbody>{rows.map(x=><tr key={x.id} className="border-b"><td className="p-3 font-bold">{x.name}</td><td className="p-3">{x.phone||"—"}</td><td className="p-3">{x.taxNumber||"—"}</td></tr>)}</tbody>
</table>
</div>
</div>
</div>
</ExtensionPage>}
