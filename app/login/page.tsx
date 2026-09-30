"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { authenticateUser, getCurrentSession, signInUser } from "@/lib/data/users";
import { formatDisplayDate } from "@/lib/formatters";
import type { SubmitEvent  } from "react";
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getCurrentSession()) router.replace("/");
  }, [router]);

  const handleSubmit = (event: SubmitEvent <HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("من فضلك أدخل اسم المستخدم وكلمة المرور.");
      return;
    }

    setLoading(true);

    window.setTimeout(() => {
      const result = authenticateUser(username, password);

      if (!result.success) {
        setLoading(false);
        setError(
          result.reason === "inactive"
            ? "هذا الحساب متوقف حاليًا. تواصل مع مدير النظام."
            : "اسم المستخدم أو كلمة المرور غير صحيحة.",
        );
        return;
      }

      signInUser(result.user, rememberMe);
      router.replace("/");
    }, 450);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-slate-200/80 blur-3xl" />

      <section className="ui-fade-up relative w-full max-w-115">
        <div className="rounded-4xl border border-slate-200/90 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-7">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:h-24 sm:w-24">
                <Image src="/images/elsaghir-logo.jpeg" alt="شعار الصغير" width={96} height={96} className="h-full w-full object-contain" priority />
              </div>
              <div className="h-14 w-px bg-slate-200" />
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:h-24 sm:w-24">
                <Image src="/images/eldahshan-logo.jpeg" alt="شعار الدهشان" width={96} height={96} className="h-full w-full object-contain" priority />
              </div>
            </div>

            <p className="mt-6 text-sm font-bold text-blue-600">أهلاً بك</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              نظام المحاسبة والإدارة
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              نظام الإدارة المالية لشركة الصغير والدهشان للمقاولات العامة.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="login-username" className="mb-2 block text-xs font-extrabold text-slate-700">
                اسم المستخدم
              </label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.08)]">
                <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                <input id="login-username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="أدخل اسم المستخدم" className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-xs font-extrabold text-slate-700">
                كلمة المرور
              </label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.08)]">
                <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />
                <input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="أدخل كلمة المرور" className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 px-1 text-xs font-semibold text-slate-500">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-blue-200" />
              تذكرني على هذا الجهاز
            </label>

            {error && <div className="ui-shake rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">{error}</div>}

            <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs font-semibold text-slate-400">الصغير والدهشان للمقاولات العامة</p>
            <p className="mt-1 text-[10px] text-slate-300">آخر تحديث للنظام: {formatDisplayDate(new Date().toISOString())}</p>
          </div>
        </div>

      </section>
    </main>
  );
}
