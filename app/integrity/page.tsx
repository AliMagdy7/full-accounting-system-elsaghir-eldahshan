"use client";
import {getSystemIntegrityReport} from "@/lib/data/system-integrity";
import {ExtensionPage} from "@/components/ui/ExtensionPage";
import {useState} from "react";
export default function Integrity(){
const [r,setR]=useState<ReturnType<typeof getSystemIntegrityReport>|null>(null);
return <ExtensionPage title="فحص سلامة النظام" description="فحص العلاقات والأرصدة والتكرارات قبل العمليات الحساسة.">
<button onClick={()=>setR(getSystemIntegrityReport())} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">تشغيل الفحص</button>{r&&<pre className="mt-5 overflow-auto rounded-2xl bg-slate-950 p-5 text-sm text-white">{JSON.stringify(r,null,2)}</pre>}</ExtensionPage>}
