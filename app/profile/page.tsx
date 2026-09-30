"use client";

import AppShell from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  changeCurrentUserPassword,
  getCurrentSession,
  getUserById,
  updateCurrentAdminCredentials,
  updateUserProfile,
} from "@/lib/data/users";
import type { SystemUser } from "@/types/user";

const roleLabels = {
  admin: "مدير النظام",
  accountant: "محاسب",
  viewer: "مشاهد",
} as const;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SystemUser | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getCurrentSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    const current = getUserById(session.userId);
    if (!current) {
      router.replace("/login");
      return;
    }

    setUser(current);
    setName(current.name);
    setUsername(current.username);
    setEmail(current.email ?? "");
    setPhone(current.phone ?? "");
    setJobTitle(current.jobTitle ?? "");
  }, [router]);

  const saveProfile = () => {
    if (!user || !name.trim()) {
      setError("الاسم الظاهر مطلوب.");
      setMessage("");
      return;
    }

    setError("");
    setMessage("");

    try {
      if (user.role === "admin") {
        updateCurrentAdminCredentials(username);
      }

      updateUserProfile(user.id, { name, email, phone, jobTitle });
      const updated = getUserById(user.id) ?? null;
      setUser(updated);
      if (updated) {
        setName(updated.name);
        setUsername(updated.username);
      }
      setMessage("تم حفظ بيانات الحساب بنجاح.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ بيانات الحساب.");
    }
  };

  const savePassword = () => {
    setError("");
    setMessage("");

    if (!user || user.role !== "admin") {
      setError("تغيير كلمة المرور من الملف الشخصي متاح للمدير فقط.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("أكمل بيانات تغيير كلمة المرور.");
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    if (!changeCurrentUserPassword(currentPassword, newPassword)) {
      setError("كلمة المرور الحالية غير صحيحة.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("تم تغيير كلمة المرور بنجاح.");
  };

  if (!user) return null;

  const isAdmin = user.role === "admin";

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="ui-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white shadow-sm">
              {user.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-600">الحساب الشخصي</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                الملف الشخصي
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold">@{user.username}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
                  {roleLabels[user.role]}
                </span>
              </div>
            </div>
          </div>
        </section>

        {(message || error) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">بيانات الحساب</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    البيانات التي تظهر داخل النظام.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <Field
                label="الاسم الظاهر"
                icon={<UserRound className="h-4 w-4" />}
                value={name}
                onChange={setName}
              />

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-700">
                  اسم المستخدم
                </label>
                {isAdmin ? (
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <span className="text-slate-400">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      dir="ltr"
                      className="h-full min-w-0 flex-1 bg-transparent text-left text-sm font-semibold text-slate-900 outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500">
                    @{user.username}
                  </div>
                )}
                <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                  {isAdmin
                    ? "يمكن للمدير فقط تغيير اسم المستخدم الخاص به."
                    : "اسم المستخدم يحدده المدير ولا يمكن تغييره من الحساب الشخصي."}
                </p>
              </div>

              <Field
                label="البريد الإلكتروني"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={setEmail}
                type="email"
              />
              <Field
                label="رقم الهاتف"
                icon={<Phone className="h-4 w-4" />}
                value={phone}
                onChange={setPhone}
              />
              <Field
                label="المسمى الوظيفي"
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                value={jobTitle}
                onChange={setJobTitle}
              />

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-700">الدور</label>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  {roleLabels[user.role]}
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={saveProfile}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  <Save className="h-4 w-4" />
                  حفظ بيانات الحساب
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">الأمان</h2>
                  <p className="mt-1 text-xs text-slate-400">إدارة كلمة المرور المحلية.</p>
                </div>
              </div>
            </div>

            {isAdmin ? (
              <div className="space-y-4 p-5 sm:p-6">
                <PasswordField
                  label="كلمة المرور الحالية"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
                <PasswordField
                  label="كلمة المرور الجديدة"
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <PasswordField
                  label="تأكيد كلمة المرور"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
                <button
                  type="button"
                  onClick={savePassword}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                >
                  <KeyRound className="h-4 w-4" />
                  تغيير كلمة المرور
                </button>
              </div>
            ) : (
              <div className="p-5 sm:p-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <div>
                      <p className="text-sm font-extrabold text-blue-900">
                        بيانات الدخول تحت إدارة المدير
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-6 text-blue-700">
                        لا يمكن تغيير اسم المستخدم أو كلمة المرور من هذا الحساب. المدير فقط هو من يحدد بيانات دخول المستخدمين.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-extrabold text-slate-700">{label}</label>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
        <span className="text-slate-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none"
        />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-extrabold text-slate-700">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="new-password"
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}
