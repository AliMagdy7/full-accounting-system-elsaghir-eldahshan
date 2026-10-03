import { assertCurrentUserPermission } from "@/lib/permission-check";
import { addAuditLog } from "@/lib/data/audit-logs";
import { getCustodyFinancialAccountById, updateCustodyFinancialAccountBalance, reverseCustodyFinancialAccountBalance } from "@/lib/data/custody-financial-accounts";
import type { CompanyAsset, CompanyAssetTransaction } from "@/types/company-asset";

const ASSET_KEY = "elsaghir-eldahshan-company-assets";
const TX_KEY = "elsaghir-eldahshan-company-asset-transactions";
const notify = () => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
const read = <T>(key: string): T[] => { if (typeof window === "undefined") return []; try { const raw = window.localStorage.getItem(key); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const save = <T>(key: string, rows: T[]) => { if (typeof window === "undefined") return; window.localStorage.setItem(key, JSON.stringify(rows)); notify(); };
const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const money = (n: number) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function getCompanyAssets() { return read<CompanyAsset>(ASSET_KEY).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); }
export function getCompanyAssetById(id: string) { return read<CompanyAsset>(ASSET_KEY).find(x => x.id === id); }
export function getCompanyAssetTransactions(assetId?: string) { const rows = read<CompanyAssetTransaction>(TX_KEY); return assetId ? rows.filter(x => x.assetId === assetId).sort((a,b) => b.date.localeCompare(a.date)) : rows.sort((a,b) => b.date.localeCompare(a.date)); }

function assertAccount(id?: string) { if (id && !getCustodyFinancialAccountById(id)) throw new Error("وسيلة الدفع المحددة غير موجودة."); }
function recalc(asset: CompanyAsset, txs: CompanyAssetTransaction[]) {
  const purchases = txs.filter(x => x.type !== "sale");
  const sales = txs.filter(x => x.type === "sale");
  const qtyPurchased = purchases.reduce((s,x) => s + x.quantity, 0);
  const cost = purchases.reduce((s,x) => s + x.amount, 0);
  const qtySold = sales.reduce((s,x) => s + x.quantity, 0);
  const saleAmount = sales.reduce((s,x) => s + x.amount, 0);
  const avgCost = qtyPurchased > 0 ? cost / qtyPurchased : 0;
  const bookCostSold = qtySold * avgCost;
  const profit = saleAmount - bookCostSold;
  const quantity = Math.max(0, qtyPurchased - qtySold);
  asset.quantity = quantity;
  asset.totalCost = Math.max(0, cost - bookCostSold);
  asset.currentValue = asset.totalCost;
  asset.realizedProfit = Math.max(0, profit);
  asset.realizedLoss = Math.max(0, -profit);
  asset.status = quantity <= 0 ? "sold" : qtySold > 0 ? "partially_sold" : "active";
  return asset;
}

export function addCompanyAsset(input: Omit<CompanyAsset, "id"|"totalCost"|"currentValue"|"realizedProfit"|"realizedLoss"|"status"|"quantity"|"createdAt"|"updatedAt"> & { quantity: number; purchaseAmount: number; financialAccountId?: string }) {
  assertCurrentUserPermission("create");
  const code = input.code.trim(); const name = input.name.trim();
  if (!code || !name) throw new Error("كود الأصل واسم الأصل مطلوبان.");
  if (read<CompanyAsset>(ASSET_KEY).some(x => normalize(x.code) === normalize(code))) throw new Error("كود الأصل مستخدم بالفعل.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error("كمية الأصل يجب أن تكون أكبر من صفر.");
  if (!Number.isFinite(input.purchaseAmount) || input.purchaseAmount <= 0) throw new Error("قيمة شراء الأصل يجب أن تكون أكبر من صفر.");
  assertAccount(input.financialAccountId);
  const now = new Date().toISOString();
  const asset: CompanyAsset = { id: crypto.randomUUID(), code, name, category: input.category.trim(), serialNumber: input.serialNumber.trim(), unit: input.unit.trim() || "وحدة", quantity: input.quantity, totalCost: input.purchaseAmount, currentValue: input.purchaseAmount, realizedProfit: 0, realizedLoss: 0, status: "active", location: input.location.trim(), projectId: input.projectId, siteId: input.siteId, purchaseDate: input.purchaseDate, notes: input.notes, images: input.images, createdAt: now, updatedAt: now };
  const tx: CompanyAssetTransaction = { id: crypto.randomUUID(), assetId: asset.id, type: "purchase", date: input.purchaseDate, quantity: input.quantity, amount: input.purchaseAmount, unitCost: input.purchaseAmount / input.quantity, financialAccountId: input.financialAccountId, notes: "شراء أولي للأصل", createdAt: now };
  if (input.financialAccountId) updateCustodyFinancialAccountBalance(input.financialAccountId, input.purchaseAmount, "out");
  try { save(ASSET_KEY, [...read<CompanyAsset>(ASSET_KEY), asset]); save(TX_KEY, [...read<CompanyAssetTransaction>(TX_KEY), tx]); } catch (error) { if (input.financialAccountId) { try { reverseCustodyFinancialAccountBalance(input.financialAccountId, input.purchaseAmount, "out"); } catch {} } throw error; }
  addAuditLog({ action:"create", entity:"company_asset", entityId:asset.id, description:`تمت إضافة أصل ${name} بقيمة ${money(input.purchaseAmount)} ج.م.`, notificationTitle:"إضافة أصل", notificationType:"success", notificationHref:"/assets" });
  return asset;
}

export function addAssetPurchase(assetId: string, input: { date:string; quantity:number; amount:number; financialAccountId?:string; notes:string }) {
  assertCurrentUserPermission("create"); const asset = getCompanyAssetById(assetId); if (!asset) throw new Error("الأصل غير موجود.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || !Number.isFinite(input.amount) || input.amount <= 0) throw new Error("بيانات الشراء الإضافي غير صحيحة.");
  assertAccount(input.financialAccountId);
  if (input.financialAccountId) updateCustodyFinancialAccountBalance(input.financialAccountId, input.amount, "out");
  const tx: CompanyAssetTransaction = { id:crypto.randomUUID(), assetId, type:"additional_purchase", date:input.date, quantity:input.quantity, amount:input.amount, unitCost:input.amount/input.quantity, financialAccountId:input.financialAccountId, notes:input.notes.trim(), createdAt:new Date().toISOString() };
  try { const txs=[...read<CompanyAssetTransaction>(TX_KEY),tx]; save(TX_KEY,txs); const next=recalc({...asset,updatedAt:new Date().toISOString()},txs.filter(x=>x.assetId===assetId)); save(ASSET_KEY,read<CompanyAsset>(ASSET_KEY).map(x=>x.id===assetId?next:x)); } catch(error){ if(input.financialAccountId){try{reverseCustodyFinancialAccountBalance(input.financialAccountId,input.amount,"out")}catch{}} throw error; }
  addAuditLog({action:"create",entity:"company_asset",entityId:assetId,description:`تمت إضافة شراء للأصل ${asset.name} بقيمة ${money(input.amount)} ج.م.`,notificationTitle:"شراء إضافي لأصل",notificationType:"success",notificationHref:"/assets"});
}

export function sellAsset(assetId: string, input: { date:string; quantity:number; amount:number; financialAccountId?:string; buyer:string; notes:string }) {
  assertCurrentUserPermission("create"); const asset=getCompanyAssetById(assetId); if(!asset) throw new Error("الأصل غير موجود.");
  if(!Number.isFinite(input.quantity)||input.quantity<=0||input.quantity>asset.quantity) throw new Error("كمية البيع أكبر من الكمية المتاحة.");
  if(!Number.isFinite(input.amount)||input.amount<=0) throw new Error("قيمة البيع يجب أن تكون أكبر من صفر.");
  if(!input.buyer.trim()) throw new Error("اسم المشتري مطلوب."); assertAccount(input.financialAccountId);
  const txs=getCompanyAssetTransactions(assetId); const purchases=txs.filter(x=>x.type!=="sale"); const purchasedQty=purchases.reduce((s,x)=>s+x.quantity,0); const cost=purchases.reduce((s,x)=>s+x.amount,0); const avg=purchasedQty?cost/purchasedQty:0; const profit=input.amount-(avg*input.quantity);
  const tx:CompanyAssetTransaction={id:crypto.randomUUID(),assetId,type:"sale",date:input.date,quantity:input.quantity,amount:input.amount,unitCost:avg,financialAccountId:input.financialAccountId,buyer:input.buyer.trim(),notes:input.notes.trim(),createdAt:new Date().toISOString()};
  if(input.financialAccountId) updateCustodyFinancialAccountBalance(input.financialAccountId,input.amount,"in");
  try { const nextTxs=[...read<CompanyAssetTransaction>(TX_KEY),tx]; save(TX_KEY,nextTxs); const next=recalc({...asset,updatedAt:new Date().toISOString()},nextTxs.filter(x=>x.assetId===assetId)); save(ASSET_KEY,read<CompanyAsset>(ASSET_KEY).map(x=>x.id===assetId?next:x)); } catch(error){ if(input.financialAccountId){try{reverseCustodyFinancialAccountBalance(input.financialAccountId,input.amount,"in")}catch{}} throw error; }
  addAuditLog({action:"create",entity:"company_asset",entityId:assetId,description:`تم بيع ${input.quantity} ${asset.unit} من ${asset.name} بقيمة ${money(input.amount)} ج.م — ${profit>=0?`ربح ${money(profit)}`:`خسارة ${money(Math.abs(profit))}`}.`,notificationTitle:"بيع أصل",notificationType:profit>=0?"success":"warning",notificationHref:"/assets"});
  return { profit, costBasis: avg*input.quantity };
}
