"use client";
import {useState} from "react";
import {addDocument,getDocuments} from "@/lib/data/finance-extensions";
import {ExtensionPage,SearchBox} from "@/components/ui/ExtensionPage";
export default function Documents(){
const [q,setQ]=useState("");
const rows=getDocuments().filter(x=>x.title.includes(q)||x.fileName.includes(q));
return <ExtensionPage title="مركز المستندات" description="مكان مركزي للمرفقات المرتبطة بالشركات والمشاريع والأصول والمستخلصات والشيكات.">
<div className="rounded-2xl border bg-white p-5">
<input id="doc" type="file" className="block w-full text-sm" onChange={e=>{
const f=e.target.files?.[0];
if(!f)return;
const r=new FileReader();
r.onload=()=>{
try{
addDocument({title:f.name,category:"مرفق",entityType:"general",entityId:"general",fileName:f.name,dataUrl:String(r.result)});
alert("تم الحفظ")}catch(err){
alert(err instanceof Error?err.message:"خطأ")}};
r.readAsDataURL(f)}}/>
<div className="mt-4">
<SearchBox value={q} onChange={setQ}/>
</div>
</div>
<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(x=><a key={x.id} href={x.dataUrl} download={x.fileName} className="rounded-2xl border bg-white p-5 shadow-sm"><b>{x.title}</b><div className="mt-1 text-xs text-slate-500">{x.entityType} • {new Date(x.createdAt).toLocaleString("ar-EG")}</div></a>)}</div>
</ExtensionPage>}
