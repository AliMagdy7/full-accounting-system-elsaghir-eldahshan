"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { addCompany, deleteCompany, getCompanies, updateCompany } from "@/lib/data/companies";
import { addCompanyNote, deleteCompanyNote, getCompanyNotes } from "@/lib/data/company-notes";
import type { Company } from "@/types/company";
import type { CompanyNote, CompanyNoteImage } from "@/types/company-note";
import { canCurrentUser } from "@/lib/permission-check";

const compress = (file: File): Promise<CompanyNoteImage> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, dataUrl: String(reader.result) });
  reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
  reader.readAsDataURL(file);
});


export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Company | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [companyNotes, setCompanyNotes] = useState<CompanyNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteImages, setNoteImages] = useState<CompanyNoteImage[]>([]);

  const load = useCallback(() => setCompanies(getCompanies()), []);
  useEffect(() => {
    load();
    window.addEventListener("elsaghir-data-updated", load);
    return () => window.removeEventListener("elsaghir-data-updated", load);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return companies.filter((company) => !q || [company.name, company.phone, company.taxId, company.address].some((value) => (value || "").toLocaleLowerCase().includes(q)));
  }, [companies, query]);

  const reset = () => {
    setEditing(null); setName(""); setPhone(""); setTaxId(""); setAddress(""); setNotes(""); setError("");
  };

  const edit = (company: Company) => {
    setEditing(company); setName(company.name); setPhone(company.phone || ""); setTaxId(company.taxId || ""); setAddress(company.address || ""); setNotes(company.notes || ""); setError(""); setOpen(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const input = { name, phone, taxId, address, notes };
      if (editing) updateCompany(editing.id, input);
      else addCompany(input);
      setOpen(false); reset(); load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الشركة.");
    }
  };

  const selectCompany = (company: Company) => {
    setSelected(company);
    setCompanyNotes(getCompanyNotes(company.id));
    setNoteText(""); setNoteImages([]); setError("");
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    try {
      const images = await Promise.all(files.map(compress));
      setNoteImages((current) => [...current, ...images]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إضافة الصورة.");
    }
  };

  const saveNote = () => {
    if (!selected) return;
    try {
      addCompanyNote({ companyId: selected.id, text: noteText, images: noteImages });
      setCompanyNotes(getCompanyNotes(selected.id));
      setNoteText(""); setNoteImages([]); setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الملاحظة.");
    }
  };

  return (
    <AppShell>
      <div dir="rtl" className="app-page mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black">الشركات</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">إدارة الشركات التي نتعامل معها ومستخلصاتها وشيكاتها وملاحظاتها.</p>
          </div>
          {canCurrentUser("create") && <button onClick={() => {
          reset();
          setOpen(true);
          }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">
          <Plus className="h-4 w-4" />إضافة شركة</button>}
        </div>

        <div className="relative">
          <Search className="absolute right-4 top-3.5 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث باسم الشركة أو الهاتف أو الرقم الضريبي" className="h-11 w-full rounded-xl border bg-white pr-11 pl-4 text-sm font-semibold" />
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
            <tr>
            <th className="px-4 py-3">الشركة</th>
            <th className="px-4 py-3">الهاتف</th>
            <th className="px-4 py-3">الرقم الضريبي</th>
            <th className="px-4 py-3">العنوان</th>
            <th className="px-4 py-3">إجراء</th>
            </tr>
            </thead>
            <tbody>
              {filtered.map((company) => <tr key={company.id} className="border-t">
                <td className="px-4 py-4 font-black">{company.name}</td>
                <td className="px-4 py-4">{company.phone || "-"}</td>
                <td className="px-4 py-4">{company.taxId || "-"}</td>
                <td className="px-4 py-4">{company.address || "-"}</td>
                <td className="px-4 py-4"><div className="flex gap-2">
                  <button onClick={() => selectCompany(company)} className="rounded-lg border px-3 py-2 text-xs font-black">الملاحظات</button>
                  {canCurrentUser("update") && <button onClick={() => edit(company)} className="rounded-lg border p-2"><Pencil className="h-4 w-4" /></button>}
                  {canCurrentUser("delete") && <button onClick={() => {
                  try {
                  deleteCompany(company.id);
                  if (selected?.id === company.id) setSelected(null);
                  load();
                  } catch (err) {
                  setError(err instanceof Error ? err.message : "تعذر حذف الشركة.");
                  } }} className="rounded-lg border border-red-200 p-2 text-red-600">
                  <Trash2 className="h-4 w-4" />
                  </button>}
                </div></td>
              </tr>)}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-10 text-center text-sm font-bold text-slate-400"><Building2 className="mx-auto mb-2 h-8 w-8" />لا توجد شركات.</div>}
        </div>

        {selected && <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between gap-4">
          <div>
          <h2 className="text-lg font-black">ملاحظات ومرفقات — {selected.name}</h2>
          <p className="text-xs font-semibold text-slate-500">يمكن إضافة نصوص وصور مرتبطة بالشركة.</p>
          </div>
          <button onClick={() => setSelected(null)} className="rounded-lg border p-2">
          <X className="h-4 w-4" />
          </button>
          </div>
          <div className="mt-4 grid gap-3">
          <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="اكتب ملاحظة للشركة..." className="min-h-24 rounded-xl border p-3 text-sm font-semibold" />
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black">
            <ImagePlus className="h-4 w-4" />إرفاق صور<input type="file" accept="image/*" multiple onChange={upload} className="sr-only" />
            </label>
            {noteImages.length > 0 && <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{noteImages.map((image) => <div key={image.id} className="relative overflow-hidden rounded-xl border"><img src={image.dataUrl} alt={image.name} className="h-24 w-full object-cover" /><button type="button" onClick={() => setNoteImages((items) => items.filter((item) => item.id !== image.id))} className="absolute left-1 top-1 rounded bg-red-600 p-1 text-white"><X className="h-3 w-3" /></button></div>)}</div>}
            {canCurrentUser("create") && <button onClick={saveNote} className="h-11 rounded-xl bg-slate-900 text-sm font-black text-white">حفظ الملاحظة</button>}
          </div>
          <div className="mt-6 space-y-3">{companyNotes.map((note) => <div key={note.id} className="rounded-xl border bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><p className="whitespace-pre-wrap text-sm font-semibold">{note.text || "مرفقات بدون نص"}</p>{canCurrentUser("delete") && <button onClick={() => {
          try {
          deleteCompanyNote(note.id); setCompanyNotes(getCompanyNotes(selected.id)); } catch (err) {
          setError(err instanceof Error ? err.message : "تعذر حذف الملاحظة."); } }} className="text-red-600"><Trash2 className="h-4 w-4" /></button>}</div>{note.images.length > 0 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">{note.images.map((image) => <img key={image.id} src={image.dataUrl} alt={image.name} className="h-24 w-full rounded-lg border object-cover" />)}</div>}<p className="mt-3 text-[11px] font-semibold text-slate-400">{new Date(note.createdAt).toLocaleString("ar-EG")}</p></div>)}{companyNotes.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">لا توجد ملاحظات حتى الآن.</p>}</div>
        </div>}

        {open && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white p-6">
          <div className="flex items-center justify-between"><h2 className="text-xl font-black">{editing ? "تعديل شركة" : "إضافة شركة"}</h2><button type="button" onClick={() => setOpen(false)}><X /></button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم الشركة" className="h-11 rounded-xl border px-3 text-sm font-semibold" />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="رقم الهاتف" className="h-11 rounded-xl border px-3 text-sm font-semibold" />
          <input value={taxId} onChange={(event) => setTaxId(event.target.value)} placeholder="الرقم الضريبي" className="h-11 rounded-xl border px-3 text-sm font-semibold" />
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="العنوان" className="h-11 rounded-xl border px-3 text-sm font-semibold" />
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات عامة" className="min-h-28 rounded-xl border p-3 text-sm font-semibold sm:col-span-2" />
          </div>
          {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}<button className="mt-5 h-11 w-full rounded-xl bg-slate-900 text-sm font-black text-white">حفظ الشركة</button>
        </form></div>}
      </div>
    </AppShell>
  );
}
