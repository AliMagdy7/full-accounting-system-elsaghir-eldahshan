"use client";
import {useState} from "react";
import {getAuditLogs} from "@/lib/data/audit-logs";
import {ExtensionPage,SearchBox} from "@/components/ui/ExtensionPage";
export default function Audit(){
const [q,setQ]=useState("");
const rows=getAuditLogs().filter(x=>!q||x.description.includes(q)||x.entity.includes(q));
return <ExtensionPage title="سجل التدقيق المركزي" description="كل العمليات الحساسة في مكان واحد مع المستخدم والتاريخ والكيان." >
<SearchBox value={q} onChange={setQ}/>
<div className="mt-5 space-y-2">{rows.map(x=><div key={x.id} className="rounded-2xl border bg-white p-4"><div className="flex justify-between gap-3"><b>{x.description}</b><span className="text-xs text-slate-400">{new Date(x.createdAt).toLocaleString("ar-EG")}</span></div><div className="mt-2 text-xs text-slate-500">{x.action} • {x.entity} • {x.actor?.userName||"النظام"}</div></div>)}</div>
</ExtensionPage>}
