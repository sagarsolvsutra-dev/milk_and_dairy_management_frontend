"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { findNavItem } from "@/components/layout/navConfig";
import { Spinner } from "@/components/ui/Spinner";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, isHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isHydrated && (!token || !user)) {
      router.replace("/login");
    }
  }, [isHydrated, token, user, router]);

  if (!isHydrated || !token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const navItem = findNavItem(pathname);
  const isDenied =
    navItem?.module &&
    user.role === "staff" &&
    !user.permissions.find((p) => p.module === navItem.module)?.view;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      <Sidebar role={user.role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {isDenied ? <AccessDenied /> : children}
        </main>
      </div>
    </div>
  );
}
