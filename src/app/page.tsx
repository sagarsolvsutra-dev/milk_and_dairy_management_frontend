"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Spinner } from "@/components/ui/Spinner";

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

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}
