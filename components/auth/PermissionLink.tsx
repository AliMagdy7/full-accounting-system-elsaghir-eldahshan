"use client";

import Link, { type LinkProps } from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { Permission } from "@/lib/auth-permissions";
import { canCurrentUser } from "@/lib/permission-check";

type Props = Omit<LinkProps, "href"> & {
  href: LinkProps["href"];
  permission: Permission;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export default function PermissionLink({ permission, children, ...props }: Props) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const load = () => setAllowed(canCurrentUser(permission));
    load();
    window.addEventListener("elsaghir-auth-updated", load);
    return () => window.removeEventListener("elsaghir-auth-updated", load);
  }, [permission]);

  if (!allowed) return null;
  return <Link {...props}>{children}</Link>;
}
