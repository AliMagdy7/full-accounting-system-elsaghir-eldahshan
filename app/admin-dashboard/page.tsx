"use client";
import {getAccounts,getSuppliers,getPurchases} from "@/lib/data/finance-extensions";
import {getCompanies} from "@/lib/data/companies";
import {getSettlements} from "@/lib/data/settlements";
import {getCompanyChecks} from "@/lib/data/company-checks";
import {getCompanyAssets} from "@/lib/data/company-assets";
import {getProjects} from "@/lib/data/projects";
import {ExtensionPage,Stat} from "@/components/ui/ExtensionPage";
export default function AdminDashboard(){
const accounts=getAccounts(),p=getPurchases(),checks=getCompanyChecks(),settlements=getSettlements();
const openChecks=checks.filter(x=>!['cancelled','returned','collected'].includes(x.status));
const openSettlements=settlements.reduce((a,x)=>a+Math.max(0,x.netValue),0)-checks.filter(x=>x.status==='collected').reduce((a,x)=>a+x.amount,0);
return <ExtensionPage title="لوحة الإدارة" description="صورة تنفيذية مركزة للأرصدة والالتزامات والمشاريع والأصول والمخزون.">
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
<Stat label="إجمالي الأرصدة" value={accounts.reduce((a,x)=>a+x.balance,0).toLocaleString("en-US")+" ج.م"}/>
<Stat label="المستخلصات" value={settlements.length}/>
<Stat label="الشيكات المفتوحة" value={openChecks.length}/>
<Stat label="المتبقي التقريبي للمستخلصات" value={Math.max(0,openSettlements).toLocaleString("en-US")+" ج.م"}/>
<Stat label="الأصول" value={getCompanyAssets().length}/>
<Stat label="المشاريع" value={getProjects().length}/>
<Stat label="الموردون" value={getSuppliers().length}/>
<Stat label="فواتير الشراء" value={p.length}/>
<Stat label="الشركات" value={getCompanies().length}/>
</div>
</ExtensionPage>}
