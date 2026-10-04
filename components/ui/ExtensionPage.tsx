"use client";
import { useEffect,useState } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
export function ExtensionPage({title,description,children,action}:{title:string;description:string;children:React.ReactNode;action?:React.ReactNode}){
const [,setTick]=useState(0);
useEffect(()=>{
const f=()=>setTick(x=>x+1);window.addEventListener("elsaghir-data-updated",f);return()=>window.removeEventListener("elsaghir-data-updated",f)},[]);
return <main dir="rtl" className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
<div className="mx-auto max-w-7xl">
<div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
<div>
<h1 className="text-2xl font-black text-slate-900">{title}</h1>
<p className="mt-1 text-sm text-slate-500">{description}</p>
</div>{action}</div>{children}</div>
</main>}
export function Stat({label,value}:{label:string;value:string|number}){
return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
<div className="text-xs font-bold text-slate-500">{label}</div>
<div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
</div>}
export function SearchBox({value,onChange,placeholder="بحث..."}:{value:string;onChange:(v:string)=>void;placeholder?:string}){
return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
<Search className="h-4 w-4 text-slate-400"/>
<input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm outline-none"/>
</div>}
