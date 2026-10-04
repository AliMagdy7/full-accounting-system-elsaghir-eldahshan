"use client";
import {useState} from "react";
import {getPeriods,setPeriodStatus} from "@/lib/data/finance-extensions";
import {ExtensionPage} from "@/components/ui/ExtensionPage";
export default function Periods(){
const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
const rows=getPeriods();
return <ExtensionPage title="إقفال الفترات" description="قفل الشهر يمنع العمليات المالية عليه إلا بإعادة فتحه بصلاحية الإدارة.">
<div className="rounded-2xl border bg-white p-5">
<div className="flex flex-wrap gap-3">
<input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-xl border p-3"/>
<button onClick={()=>setPeriodStatus(month,"closed","إقفال الفترة")} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">إقفال الفترة</button>
<button onClick={()=>setPeriodStatus(month,"open")} className="rounded-xl border px-5 py-3 font-bold">فتح الفترة</button>
</div>
<div className="mt-6 space-y-3">{rows.map(x=><div key={x.id} className="flex justify-between rounded-xl border p-4"><span>{x.month}</span><b className={x.status==="closed"?"text-red-600":"text-emerald-600"}>{x.status==="closed"?"مقفلة":"مفتوحة"}</b></div>)}</div>
</div>
</ExtensionPage>}
