"use client";
import {getSettlements} from "@/lib/data/settlements";
import {getCompanyChecks} from "@/lib/data/company-checks";
import {getExpenses} from "@/lib/data/expenses";
import {getCompanyAssets} from "@/lib/data/company-assets";
import {getPurchases,getAccounts} from "@/lib/data/finance-extensions";
import {ExtensionPage,Stat} from "@/components/ui/ExtensionPage";
export default function FinancialReports(){
const s=getSettlements(),c=getCompanyChecks(),e=getExpenses(),a=getCompanyAssets(),p=getPurchases(),accounts=getAccounts();
const income=c.filter(x=>x.status==='collected').reduce((n,x)=>n+x.amount,0);
const expense=e.reduce((n,x)=>n+x.amount,0)+p.reduce((n,x)=>n+x.paid,0);
const assetProfit=a.reduce((n,x)=>n+x.realizedProfit-x.realizedLoss,0);
return <ExtensionPage title="التقارير المالية" description="مؤشرات مالية مجمعة للتدفقات والمصروفات والمستخلصات والشيكات والأصول والمشتريات.">
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
<Stat label="إجمالي المتحصل" value={income.toLocaleString("en-US")+" ج.م"}/>
<Stat label="إجمالي المدفوعات والمصروفات" value={expense.toLocaleString("en-US")+" ج.م"}/>
<Stat label="صافي التدفق" value={(income-expense).toLocaleString("en-US")+" ج.م"}/>
<Stat label="ربح/خسارة الأصول" value={assetProfit.toLocaleString("en-US")+" ج.م"}/>
<Stat label="المستخلصات" value={s.length}/>
<Stat label="الشيكات" value={c.length}/>
<Stat label="الأصول" value={a.length}/>
<Stat label="أرصدة الحسابات" value={accounts.reduce((n,x)=>n+x.balance,0).toLocaleString("en-US")+" ج.م"}/>
</div>
</ExtensionPage>}
