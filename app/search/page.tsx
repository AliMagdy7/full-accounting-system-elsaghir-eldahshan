"use client";
import {useState} from "react";
import {searchAll} from "@/lib/data/finance-extensions";
import {ExtensionPage,SearchBox} from "@/components/ui/ExtensionPage";
export default function Search(){
const [q,setQ]=useState("");
const rows=searchAll(q);
return <ExtensionPage title="البحث الشامل" description="ابحث في أهم كيانات النظام من مكان واحد.">
<SearchBox value={q} onChange={setQ} placeholder="شركة، مشروع، عامل، مقاول، أصل، شيك، مستخلص، فاتورة..."/>
<div className="mt-5 space-y-2">{rows.map((x,i)=><div key={`${x.type}-${x.id}-${i}`} className="rounded-xl border bg-white p-4"><span className="text-xs font-bold text-slate-400">{x.label}</span><div className="font-bold">{x.text}</div></div>)}</div>
</ExtensionPage>}
