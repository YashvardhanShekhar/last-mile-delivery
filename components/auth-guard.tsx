"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, dashboardPath, Role } from "@/lib/api-client";

export function AuthGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(dashboardPath(user.role));
    }
  }, [router, roles]);

  return <>{children}</>;
}
