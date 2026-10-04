"use client";
import {useState} from "react";
import {addPurchase,getPurchases,getSuppliers} from "@/lib/data/finance-extensions";
import {getCustodyFinancialAccounts} from "@/lib/data/custody-financial-accounts";
import {ExtensionPage,Stat} from "@/components/ui/ExtensionPage";
export default function Purchases(){
const [number,setNumber]=useState("");
const [supplierId,setSupplierId]=useState("");
const [total,setTotal]=useState("");
const [accountId,setAccountId]=useState("");
const [paid,setPaid]=useState("");
const suppliers=getSuppliers(), rows=getPurchases(), accounts=getCustodyFinancialAccounts();
return <ExtensionPage title="المشتريات والفواتير" description="فواتير شراء مرتبطة بالموردين والمدفوعات والحركة المالية.">
<div className="grid gap-4 sm:grid-cols-3">
<Stat label="الفواتير" value={rows.length}/>
<Stat label="إجمالي الفواتير" value={rows.reduce((a,x)=>a+x.total,0).toLocaleString("en-US")+" ج.م"}/>
<Stat label="المتبقي" value={rows.reduce((a,x)=>a+x.total-x.paid,0).toLocaleString("en-US")+" ج.م"}/>
</div>
<div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
<form onSubmit={e=>{
e.preventDefault();
try{
const t=Number(total)||0;
addPurchase({number,date:new Date().toISOString().slice(0,10),supplierId,subtotal:t,discount:0,tax:0,total:t,paid:Number(paid)||0,status:"draft",financialAccountId:accountId||undefined});
setNumber("");
setTotal("");
setPaid("")}catch(err){
alert(err instanceof Error?err.message:"خطأ")}}} className="rounded-2xl border bg-white p-5">
<h2 className="font-black">فاتورة جديدة</h2>
<input className="mt-4 w-full rounded-xl border p-3" value={number} onChange={e=>setNumber(e.target.value)} placeholder="رقم الفاتورة"/>
<select className="mt-3 w-full rounded-xl border p-3" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
<option value="">اختر المورد</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
<select className="mt-3 w-full rounded-xl border p-3" value={accountId} onChange={e=>setAccountId(e.target.value)}>
<option value="">بدون دفع الآن</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
<input type="number" className="mt-3 w-full rounded-xl border p-3" value={paid} onChange={e=>setPaid(e.target.value)} placeholder="المدفوع الآن"/>
<input type="number" className="mt-3 w-full rounded-xl border p-3" value={total} onChange={e=>setTotal(e.target.value)} placeholder="الإجمالي"/>
<button className="mt-3 w-full rounded-xl bg-slate-900 p-3 font-bold text-white">حفظ</button>
</form>
<div className="rounded-2xl border bg-white p-5">
<div className="space-y-3">{rows.map(x=><div key={x.id} className="flex justify-between rounded-xl border p-4"><span>فاتورة {x.number}</span><b>{x.total.toLocaleString("en-US")} ج.م</b></div>)}</div>
</div>
</div>
</ExtensionPage>}
