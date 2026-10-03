"use client";
import AppShell from "@/components/layout/AppShell";
import type { ReactNode } from "react";
export default function EnterpriseShell({title,description,children}:{title:string;description:string;children:ReactNode}){return <AppShell><main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"><div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>{children}</main></AppShell>}
