import {assertCurrentUserPermission} from "@/lib/permission-check";
import {addAuditLog} from "@/lib/data/audit-logs";
import {getCurrentSession} from "@/lib/data/users";
import {createSystemBackup} from "@/lib/data/system-backup";
const KEY="elsaghir-system-controls";type C={backupEnabled:boolean;backupFrequency:"daily"|"weekly";lastBackupAt?:string;transactionLock:boolean;permissions:Record<string,string[]>};
const defaults:C={backupEnabled:false,backupFrequency:"daily",transactionLock:true,permissions:{admin:["view","create","update","delete","approve","export","backup"],accountant:["view","create","update","delete","approve","export"],viewer:["view"]}};
export const getControls=():C=>{if(typeof window==="undefined")return defaults;try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return defaults}};
export function updateControls(p:Partial<C>){
assertCurrentUserPermission("update");
const x={...getControls(),...p};
localStorage.setItem(KEY,JSON.stringify(x));
window.dispatchEvent(new CustomEvent("elsaghir-data-updated"));
addAuditLog({action:"system",entity:"system_controls",description:"تم تحديث إعدادات الحماية والنسخ الاحتياطي.",notificationTitle:"إعدادات النظام",notificationType:"info",notificationHref:"/settings"});
return x}
export const isTransactionLocked=()=>getControls().transactionLock;
export function assertTransactionEditable(date:string){
const period=localStorage.getItem("elsaghir-accounting-periods");
try{
const rows=period?JSON.parse(period):[];
if(rows.some((x:{month:string;status:string})=>x.month===date.slice(0,7)&&x.status==="closed"))throw new Error("الفترة المحاسبية مغلقة ولا يمكن تعديل الحركة.")}catch(e){
if(e instanceof Error&&e.message.includes("مغلقة"))throw e} }
export function maybeAutomaticBackup(){
if(typeof window==="undefined")return;
const c=getControls();
if(!c.backupEnabled)return;
const last=c.lastBackupAt?new Date(c.lastBackupAt).getTime():0;
const age=Date.now()-last;
const limit=c.backupFrequency==="weekly"?7*86400000:86400000;
if(age<limit)return;
try{
const b=createSystemBackup();
localStorage.setItem("elsaghir-latest-auto-backup",JSON.stringify(b));
updateControls({lastBackupAt:new Date().toISOString()})}catch{
/* permissions can block auto backup */}}
export function exportManagedData(){
assertCurrentUserPermission("update");
const b=createSystemBackup();
const blob=new Blob([JSON.stringify(b,null,2)],{type:"application/json"});
const a=document.createElement("a");
a.href=URL.createObjectURL(blob);
a.download=`elsaghir-export-${new Date().toISOString().slice(0,10)}.json`;
a.click();
URL.revokeObjectURL(a.href);
}
