"use client";
import {exportManagedData} from "@/lib/data/system-controls";
import {restoreSystemBackup} from "@/lib/data/system-backup";
import {ExtensionPage} from "@/components/ui/ExtensionPage";
import {useState} from "react";
export default function ImportExport(){
const [busy,setBusy]=useState(false);
return <ExtensionPage title="الاستيراد والتصدير" description="تصدير واستيراد بيانات النظام بصيغة Backup موحدة مع التحقق قبل الاستعادة.">
<div className="grid gap-5 md:grid-cols-2">
<div className="rounded-2xl border bg-white p-6">
<h2 className="font-black">تصدير</h2>
<p className="mt-2 text-sm text-slate-500">ملف JSON كامل للبيانات المدارة، متوافق مع Restore.</p>
<button onClick={()=>exportManagedData()} className="mt-5 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white">تصدير البيانات</button>
</div>
<div className="rounded-2xl border bg-white p-6">
<h2 className="font-black">استيراد / Restore</h2>
<p className="mt-2 text-sm text-slate-500">الاستيراد يستبدل بيانات النظام المدارة بالكامل بعد التحقق.</p>
<input type="file" accept="application/json,.json" disabled={busy} className="mt-5 block w-full text-sm" onChange={async e=>{
const f=e.target.files?.[0];
if(!f)return;
setBusy(true);
try{
const raw=JSON.parse(await f.text());
const count=restoreSystemBackup(raw);
alert(`تمت استعادة ${count} مجموعة بيانات.`)}catch(err){
alert(err instanceof Error?err.message:"فشل الاستيراد")}finally{
setBusy(false);
e.currentTarget.value=""}}}/>
</div>
</div>
</ExtensionPage>}
