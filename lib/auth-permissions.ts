import type { UserRole } from "@/types/user";
export type Permission = "view"|"create"|"update"|"delete"|"reports"|"audit"|"manage_users";
const DEFAULTS:Record<UserRole,Permission[]>={admin:["view","create","update","delete","reports","audit","manage_users"],accountant:["view","create","update","delete","reports","audit"],viewer:["view","reports"]};
const KEY="elsaghir-role-permissions";
function getStored():Record<UserRole,Permission[]>|null{if(typeof window==="undefined")return null;try{const x=JSON.parse(localStorage.getItem(KEY)||"null");return x&&typeof x==="object"?x:null}catch{return null}}
export function hasPermission(role:UserRole,permission:Permission){const stored=getStored();return (stored?.[role]??DEFAULTS[role]).includes(permission)}
export function getRolePermissions(role:UserRole){return [...(getStored()?.[role]??DEFAULTS[role])]}
export function setRolePermissions(role:UserRole,permissions:Permission[]){
if(typeof window==="undefined")return;
const stored=getStored()??{...DEFAULTS};
localStorage.setItem(KEY,JSON.stringify({...stored,[role]:[...new Set(permissions)]}));
window.dispatchEvent(new CustomEvent("elsaghir-auth-updated"));
window.dispatchEvent(new CustomEvent("elsaghir-data-updated"))}
export function getDefaultRolePermissions(){return DEFAULTS}
