"use client";
import {useSearchParams} from "next/navigation";
import {getAuditLogs} from "@/lib/data/audit-logs";
import {ExtensionPage} from "@/components/ui/ExtensionPage";
export default function Timeline(){
const p=useSearchParams();
const id=p.get("id")||"";
const entity=p.get("entity")||"";
const rows=getAuditLogs().filter(x=>(!id||x.entityId===id)&&(!entity||x.entity===entity));
return <ExtensionPage title="التسلسل الزمني" description="تاريخ التغييرات والعمليات المرتبطة بالكيان المحدد.">
<div className="space-y-3">{rows.map(x=><div key={x.id} className="rounded-2xl border bg-white p-4"><b>{x.description}</b><div className="mt-1 text-xs text-slate-500">{new Date(x.createdAt).toLocaleString("ar-EG")} • {x.action}</div></div>)}</div>
</ExtensionPage>}
