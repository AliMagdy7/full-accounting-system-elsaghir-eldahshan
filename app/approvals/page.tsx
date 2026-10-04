"use client";
import {getApprovals,decideApproval} from "@/lib/data/finance-extensions";
import {ExtensionPage} from "@/components/ui/ExtensionPage";
export default function Approvals(){
const rows=getApprovals();
return <ExtensionPage title="الموافقات" description="دورة اعتماد موحدة للعمليات التي تحتاج مراجعة قبل التنفيذ.">
<div className="space-y-3">{rows.map(x=><div key={x.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><b>{x.entity}</b><div className="text-xs text-slate-500">{x.reason||"بدون ملاحظات"}</div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{x.status}</span></div>{x.status==="pending"&&<div className="mt-4 flex gap-2"><button onClick={()=>decideApproval(x.id,"approved")} className="rounded-xl bg-emerald-600 px-4 py-2 text-white">اعتماد</button><button onClick={()=>decideApproval(x.id,"rejected")} className="rounded-xl bg-red-600 px-4 py-2 text-white">رفض</button></div>}</div>)}</div>
</ExtensionPage>}
