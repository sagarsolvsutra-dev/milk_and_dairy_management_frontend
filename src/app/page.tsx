"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppShellSkeleton } from "@/components/ui/Skeleton";

export default function RootPage() {
  const router = useRouter();
  const { token, user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (!token || !user) {
      router.replace("/login");
    } else if (user.role === "dairy_user") {
      router.replace("/dairy");
    } else {
      router.replace("/dashboard");
    }
  }, [isHydrated, token, user, router]);

  return <AppShellSkeleton />;
}
