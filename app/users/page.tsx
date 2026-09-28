"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, ShieldCheck, UserCog, Users, X } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { getCurrentSession, getUsers, setCurrentSession, setUserActive, updateUserCredentials, updateUserRole } from "@/lib/data/users";
import { hasPermission, type Permission } from "@/lib/auth-permissions";
import type { SystemUser, UserRole } from "@/types/user";
import { useRouter } from "next/navigation";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  accountant: "Accountant",
  viewer: "Viewer",
};

const permissionLabels: Record<Permission, string> = {
  view: "عرض البيانات",
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  reports: "التقارير",
  audit: "سجل العمليات",
  manage_users: "إدارة المستخدمين",
};

const permissionOrder: Permission[] = [
  "view",
  "create",
  "update",
  "delete",
  "reports",
  "audit",
  "manage_users",
];

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [credentialsUser, setCredentialsUser] = useState<SystemUser | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");
  const router = useRouter();

  const loadUsers = () => setUsers(getUsers());

  useEffect(() => {
    const session = getCurrentSession();
    const role = session?.role ?? "admin";
    if (!hasPermission(role, "manage_users")) {
      router.replace("/");
      return;
    }
    setAllowed(true);
    loadUsers();
    window.addEventListener("elsaghir-auth-updated", loadUsers);
    return () => window.removeEventListener("elsaghir-auth-updated", loadUsers);
  }, [router]);

  const changeRole = (userId: string, role: UserRole) => {
    updateUserRole(userId, role);
    loadUsers();
  };

  const toggleActive = (user: SystemUser) => {
    setUserActive(user.id, !user.active);
    loadUsers();
  };

  const switchToUser = (user: SystemUser) => {
    if (!user.active) return;
    setCurrentSession(user);
    router.push("/");
  };

  const openCredentialsEditor = (user: SystemUser) => {
    setCredentialsUser(user);
    setNewUsername(user.username);
    setNewPassword("");
    setCredentialsError("");
    setShowPassword(false);
  };

  const saveCredentials = () => {
    if (!credentialsUser) return;
    if (!newUsername.trim()) {
      setCredentialsError("اسم المستخدم مطلوب.");
      return;
    }
    if (newPassword.length < 6) {
      setCredentialsError("كلمة المرور يجب ألا تقل عن 6 أحرف.");
      return;
    }

    try {
      updateUserCredentials(credentialsUser.id, newUsername, newPassword);
      setCredentialsUser(null);
      setNewUsername("");
      setNewPassword("");
      setCredentialsError("");
      loadUsers();
    } catch (error) {
      setCredentialsError(error instanceof Error ? error.message : "تعذر تحديث بيانات الدخول.");
    }
  };

  if (!allowed) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-600">إدارة النظام</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                المستخدمون والصلاحيات
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                إدارة المستخدمين والأدوار الأساسية التي سيعتمد عليها سجل العمليات والصلاحيات.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {user.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-extrabold text-slate-900">{user.name}</h2>
                    <p className="mt-0.5 text-xs text-slate-400">@{user.username}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {user.active ? "نشط" : "متوقف"}
                </span>
              </div>

              <label className="mt-5 block text-xs font-bold text-slate-500">الدور</label>
              <select
                value={user.role}
                onChange={(event) => changeRole(user.id, event.target.value as UserRole)}
                disabled={user.id === "admin"}
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 disabled:bg-slate-50"
              >
                <option value="admin">Admin</option>
                <option value="accountant">Accountant</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="button"
                onClick={() => switchToUser(user)}
                disabled={!user.active}
                className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                الدخول كمستخدم
              </button>

              <button
                type="button"
                onClick={() => openCredentialsEditor(user)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <KeyRound className="h-3.5 w-3.5" />
                بيانات الدخول
              </button>

              <button
                type="button"
                onClick={() => toggleActive(user)}
                disabled={user.id === "admin"}
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {user.active ? "إيقاف المستخدم" : "تفعيل المستخدم"}
              </button>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-slate-600" />
              <div>
                <h2 className="text-base font-extrabold text-slate-900">مصفوفة الصلاحيات</h2>
                <p className="mt-1 text-xs text-slate-400">الصلاحيات المعتمدة حاليًا لكل دور.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto p-4 sm:p-6">
            <table className="w-full min-w-[720px] border-collapse text-right">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="px-3 py-3 font-bold">الصلاحية</th>
                  <th className="px-3 py-3 font-bold">Admin</th>
                  <th className="px-3 py-3 font-bold">Accountant</th>
                  <th className="px-3 py-3 font-bold">Viewer</th>
                </tr>
              </thead>
              <tbody>
                {permissionOrder.map((permission) => (
                  <tr key={permission} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-3 text-sm font-semibold text-slate-700">{permissionLabels[permission]}</td>
                    {(["admin", "accountant", "viewer"] as UserRole[]).map((role) => (
                      <td key={role} className="px-3 py-3">
                        {hasPermission(role, permission) ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <UserCog className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h2 className="text-sm font-extrabold text-blue-900">ملاحظة مهمة</h2>
              <p className="mt-1 text-xs leading-6 text-blue-700">
                هذه المرحلة تبني طبقة المستخدمين والأدوار محليًا فوق النظام الحالي. الحماية الحقيقية من تعديل الطلبات مباشرة خارج الواجهة تحتاج Auth وقاعدة بيانات على السيرفر، وهي المرحلة التالية قبل الاعتماد الإنتاجي.
              </p>
              <p className="mt-2 text-xs font-bold text-blue-800">
                المستخدمون الأساسيون: المدير، المحاسب، الحاج رمضان، الحاج نبيل.
              </p>
            </div>
          </div>
        </section>
      </div>

      {credentialsUser && (
        <div
          className="ui-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCredentialsUser(null);
          }}
        >
          <div className="ui-modal w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold text-slate-900">بيانات دخول المستخدم</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  تحديد اسم المستخدم وكلمة المرور لـ {credentialsUser.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCredentialsUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-700">اسم المستخدم</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  dir="ltr"
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  autoFocus
                />
              </div>

              <div className="relative">
                <label className="mb-2 block text-xs font-extrabold text-slate-700">كلمة المرور الجديدة</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  dir="ltr"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pl-11 text-left text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute bottom-1.5 left-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {credentialsError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {credentialsError}
                </p>
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-700">
                بيانات الدخول يحددها المدير فقط، ولا يمكن للمستخدم تعديلها من حسابه الشخصي.
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
                <button
                  type="button"
                  onClick={() => setCredentialsUser(null)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={saveCredentials}
                  className="h-10 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white hover:bg-slate-800"
                >
                  حفظ بيانات الدخول
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
