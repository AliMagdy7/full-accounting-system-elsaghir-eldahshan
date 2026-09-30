"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, MapPin, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canCurrentUser } from "@/lib/permission-check";
import { getProjectById } from "@/lib/data/projects";
import { addProjectSite, deleteProjectSite, getProjectSites, updateProjectSite } from "@/lib/data/project-sites";
import type { ProjectSite } from "@/types/project-site";
import type { SubmitEvent  } from "react";

export default function ProjectSitesPage() {
  const params = useParams(); const router = useRouter(); const projectId = String(params.id);
  const [projectName, setProjectName] = useState(""); const [sites, setSites] = useState<ProjectSite[]>([]); const [editing, setEditing] = useState<ProjectSite | null>(null);
  const [name,setName]=useState(""); const [address,setAddress]=useState(""); const [responsiblePerson,setResponsiblePerson]=useState(""); const [notes,setNotes]=useState(""); const [error,setError]=useState("");
  const { confirm, dialog } = useConfirmDialog();
  const load=()=>{const p=getProjectById(projectId); if(!p){router.push("/projects");return;} setProjectName(p.name);setSites(getProjectSites(projectId));}; useEffect(()=>{load();},[projectId]);
  const reset=()=>{setEditing(null);setName("");setAddress("");setResponsiblePerson("");setNotes("");setError("");};
  const edit=(s:ProjectSite)=>{setEditing(s);setName(s.name);setAddress(s.address??"");setResponsiblePerson(s.responsiblePerson??"");setNotes(s.notes??"");setError("");};
  const submit=(e:SubmitEvent )=>{e.preventDefault();try{if(editing)updateProjectSite(editing.id,{name,address,responsiblePerson,notes});else addProjectSite({projectId,name,address,responsiblePerson,notes,active:true});reset();load();}catch(err){setError(err instanceof Error?err.message:"حدث خطأ.")}};
  const remove=(id:string)=>{
    const site = sites.find((item) => item.id === id);
    confirm({
      title: "تأكيد حذف الموقع",
      description: `هل أنت متأكد من حذف ${site?.name ? `الموقع «${site.name}»` : "هذا الموقع"}؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: "حذف الموقع",
      cancelText: "إلغاء",
      variant: "danger",
    }, () => {
      try { deleteProjectSite(id); load(); }
      catch(err){setError(err instanceof Error?err.message:"تعذر الحذف.");}
    });
  };
  return <AppShell><div dir="rtl" className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><button onClick={()=>router.back()} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><ArrowRight className="h-4 w-4"/>العودة</button><div className="flex items-center gap-2 text-blue-600"><MapPin className="h-5 w-5"/><span className="text-sm font-bold">مواقع المشروع</span></div><h1 className="mt-2 text-2xl font-extrabold">{projectName}</h1><p className="mt-2 text-sm text-slate-500">إدارة المواقع التابعة للمشروع ومسؤوليها.</p></section>
  {(canCurrentUser("create")||editing)&&<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-extrabold">{editing?"تعديل موقع":"إضافة موقع"}</h2><button onClick={reset}><X className="h-5 w-5 text-slate-400"/></button></div><form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الموقع" className="h-11 rounded-xl border border-slate-200 px-4 text-sm"/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="العنوان" className="h-11 rounded-xl border border-slate-200 px-4 text-sm"/><input value={responsiblePerson} onChange={e=>setResponsiblePerson(e.target.value)} placeholder="مسؤول الموقع" className="h-11 rounded-xl border border-slate-200 px-4 text-sm"/><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات" className="h-11 rounded-xl border border-slate-200 px-4 text-sm"/>{error&&<div className="md:col-span-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}<button className="md:col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white"><Save className="h-4 w-4"/>حفظ الموقع</button></form></section>}
  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">{sites.length===0?<div className="p-14 text-center"><MapPin className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm font-bold text-slate-400">لا توجد مواقع لهذا المشروع.</p>{canCurrentUser("create")&&<button onClick={reset} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4"/>إضافة موقع</button>}</div>:<div className="divide-y divide-slate-100">{sites.map(site=><div key={site.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-extrabold">{site.name}</p><p className="mt-1 text-xs text-slate-400">{site.address||"بدون عنوان"}{site.responsiblePerson?` • مسؤول: ${site.responsiblePerson}`:""}</p></div><div className="flex gap-2">{canCurrentUser("update")&&<button onClick={()=>edit(site)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><Pencil className="h-4 w-4"/>تعديل</button>}{canCurrentUser("delete")&&<button onClick={()=>remove(site.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600"><Trash2 className="h-4 w-4"/>حذف</button>}</div></div>)}</div>}</section></div>{dialog}</AppShell>;
}
