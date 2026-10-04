"use client";
import {getAccounts,getSuppliers,getPurchases} from "@/lib/data/finance-extensions";
import {getCompanies} from "@/lib/data/companies";
import {getSettlements} from "@/lib/data/settlements";
import {getCompanyChecks} from "@/lib/data/company-checks";
import {getProjects} from "@/lib/data/projects";
import {ExtensionPage,Stat} from "@/components/ui/ExtensionPage";
export default function AdminReports(){
const accounts=getAccounts(),p=getPurchases();
return <ExtensionPage title="مركز التقارير الإدارية" description="ملخص إداري موحد للأرصدة والالتزامات والمشاريع والمخزون والمستخلصات والشيكات.">
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
<Stat label="الأرصدة" value={accounts.reduce((a,x)=>a+x.balance,0).toLocaleString("en-US")+" ج.م"}/>
<Stat label="المشاريع" value={getProjects().length}/>
<Stat label="المستخلصات" value={getSettlements().length}/>
<Stat label="الشيكات" value={getCompanyChecks().length}/>
<Stat label="الشركات" value={getCompanies().length}/>
<Stat label="الموردون" value={getSuppliers().length}/>
<Stat label="فواتير الشراء" value={p.length}/>
</div>
</ExtensionPage>}
