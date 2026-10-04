"use client";
import {useState} from "react";
import {getControls,updateControls,maybeAutomaticBackup} from "@/lib/data/system-controls";
import {ExtensionPage} from "@/components/ui/ExtensionPage";
export default function Backup(){
const [c,setC]=useState(getControls());
return <ExtensionPage title="النسخ الاحتياطي التلقائي" description="إعداد نسخة تلقائية دورية مع الاحتفاظ بآخر نسخة داخل النظام.">
<div className="rounded-2xl border bg-white p-6">
<label className="flex items-center gap-3">
<input type="checkbox" checked={c.backupEnabled} onChange={e=>{
const n=updateControls({backupEnabled:e.target.checked});
setC(n)}}/> تفعيل النسخ التلقائي</label>
<select value={c.backupFrequency} onChange={e=>setC(updateControls({backupFrequency:e.target.value as "daily"|"weekly"}))} className="mt-4 rounded-xl border p-3">
<option value="daily">يومي</option>
<option value="weekly">أسبوعي</option>
</select>
<div className="mt-4 text-sm text-slate-500">آخر نسخة: {c.lastBackupAt?new Date(c.lastBackupAt).toLocaleString("ar-EG"):"لم يتم إنشاء نسخة تلقائية بعد"}</div>
<button onClick={()=>{
maybeAutomaticBackup();
setC(getControls())}} className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">فحص وتشغيل النسخة الآن</button>
</div>
</ExtensionPage>}
