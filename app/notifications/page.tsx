"use client";
import {getNotifications,markNotificationAsRead,markAllNotificationsAsRead} from "@/lib/data/notifications";
import {ExtensionPage} from "@/components/ui/ExtensionPage";
export default function Notifications(){
const rows=getNotifications();
return <ExtensionPage title="مركز الإشعارات" description="التنبيهات المالية والإدارية المهمة في مكان واحد." action={<button onClick={()=>markAllNotificationsAsRead()} className="rounded-xl border px-4 py-2 text-sm font-bold">تحديد الكل كمقروء</button>}>
<div className="space-y-3">{rows.map(x=><button key={x.id} onClick={()=>markNotificationAsRead(x.id)} className={`w-full rounded-2xl border bg-white p-4 text-right ${x.read?"opacity-60":"shadow-sm"}`}><div className="font-bold">{x.title}</div><div className="mt-1 text-sm text-slate-500">{x.message}</div></button>)}</div>
</ExtensionPage>}
