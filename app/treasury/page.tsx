"use client";
import {useState} from "react";
import {addCustodyFinancialAccount,getCustodyFinancialAccounts} from "@/lib/data/custody-financial-accounts";
import {getCustodies} from "@/lib/data/custodies";
import {ExtensionPage,Stat} from "@/components/ui/ExtensionPage";
export default function Treasury(){
const [name,setName]=useState("");
const [opening,setOpening]=useState("0");
const custodies=getCustodies(),central=custodies.find(x=>x.id==="central")||custodies[0];
const accounts=getCustodyFinancialAccounts();
return <ExtensionPage title="الخزينة والبنوك" description="مركز موحد لوسائل الدفع والأرصدة المالية داخل العهد مع كشف الرصيد لكل حساب.">
<div className="grid gap-4 sm:grid-cols-3">
<Stat label="الحسابات المالية" value={accounts.length}/>
<Stat label="إجمالي الأرصدة" value={accounts.reduce((a,x)=>a+x.balance,0).toLocaleString("en-US")+" ج.م"}/>
<Stat label="العهد" value={custodies.length}/>
</div>
<div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
<form onSubmit={e=>{
e.preventDefault();
if(!central)return;
try{
addCustodyFinancialAccount({custodyId:central.id,name,openingBalance:Number(opening)||0});
setName("");
setOpening("0")}catch(err){
alert(err instanceof Error?err.message:"خطأ")}}} className="rounded-2xl border bg-white p-5">
<h2 className="font-black">إضافة خزينة / حساب بنكي</h2>
<p className="mt-1 text-xs text-slate-500">سيُحفظ الحساب داخل العهدة المركزية ليكون متوافقًا مع الشيكات والحركات الحالية.</p>
<input className="mt-4 w-full rounded-xl border p-3" value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الحساب"/>
<input type="number" className="mt-3 w-full rounded-xl border p-3" value={opening} onChange={e=>setOpening(e.target.value)} placeholder="الرصيد الافتتاحي"/>
<button className="mt-4 w-full rounded-xl bg-slate-900 p-3 font-bold text-white">إضافة</button>
</form>
<div className="rounded-2xl border bg-white p-5">
<h2 className="font-black">الحسابات الحالية</h2>
<div className="mt-4 space-y-3">{accounts.map(x=><div key={x.id} className="flex items-center justify-between rounded-xl border p-4"><div><b>{x.name}</b><div className="text-xs text-slate-500">{custodies.find(c=>c.id===x.custodyId)?.name||"عهدة"}</div></div><strong>{x.balance.toLocaleString("en-US")} ج.م</strong></div>)}</div>
</div>
</div>
</ExtensionPage>}
