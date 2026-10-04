"use client";
import {useState} from "react";
import {getCompanies} from "@/lib/data/companies";
import {getSettlements} from "@/lib/data/settlements";
import {getCompanyChecks} from "@/lib/data/company-checks";
import {getSuppliers,getPurchases} from "@/lib/data/finance-extensions";
import {ExtensionPage,SearchBox} from "@/components/ui/ExtensionPage";
export default function AccountStatement(){
const [q,setQ]=useState("");
const companies=getCompanies(),suppliers=getSuppliers();
const company=companies.find(x=>x.name.includes(q)),supplier=suppliers.find(x=>x.name.includes(q));
const rows=company?[...getSettlements().filter(x=>x.companyId===company.id).map(x=>({date:x.date,desc:`مستخلص ${x.number}`,in:x.netValue,out:0})),...getCompanyChecks().filter(x=>x.companyId===company.id&&x.status==='collected').map(x=>({date:x.dueDate,desc:`تحصيل شيك ${x.number}`,in:0,out:x.amount}))]:supplier?getPurchases().filter(x=>x.supplierId===supplier.id).map(x=>({date:x.date,desc:`فاتورة شراء ${x.number}`,in:0,out:x.total})):[];
let balance=0;
return <ExtensionPage title="كشف الحساب الموحد" description="كشف حركة موحد للشركات والموردين بناءً على المستخلصات والشيكات وفواتير الشراء.">
<SearchBox value={q} onChange={setQ} placeholder="اكتب اسم الشركة أو المورد"/>
<div className="mt-5 rounded-2xl border bg-white p-5">
<div className="mb-4 text-sm font-bold text-slate-500">{company?`الشركة: ${company.name}`:supplier?`المورد: ${supplier.name}`:"اختر طرفًا للعرض"}</div>
<div className="overflow-auto">
<table className="w-full text-sm">
<thead>
<tr className="border-b">
<th className="p-3 text-right">التاريخ</th>
<th className="p-3 text-right">البيان</th>
<th className="p-3">مدين</th>
<th className="p-3">دائن</th>
<th className="p-3">الرصيد</th>
</tr>
</thead>
<tbody>{rows.map((x,i)=>{
balance+=x.in-x.out;return <tr key={i} className="border-b"><td className="p-3">{x.date}</td><td className="p-3 font-bold">{x.desc}</td><td className="p-3">{x.out.toLocaleString("en-US")}</td><td className="p-3">{x.in.toLocaleString("en-US")}</td><td className="p-3 font-bold">{balance.toLocaleString("en-US")}</td></tr>})}</tbody>
</table>
</div>
</div>
</ExtensionPage>}
