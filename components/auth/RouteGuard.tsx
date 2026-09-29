"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentSession } from "@/lib/data/users";
import { hasPermission, type Permission } from "@/lib/auth-permissions";

interface RouteGuardProps {
  children: ReactNode;
  permission?: Permission;
}

export default function RouteGuard({ children, permission = "view" }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized] = useState(() => {
    const session = getCurrentSession();
    return Boolean(session && hasPermission(session.role, permission));
  });

  useEffect(() => {
    if (authorized) return;
    const session = getCurrentSession();
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    router.replace("/");
  }, [authorized, pathname, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
