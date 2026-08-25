"use client";

import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/api";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser } from "@/types";
import { useToast } from "@/components/ui/Toast";

export function useAuth() {
  const router = useRouter();
  const toast = useToast();
  const { token, user, isHydrated, setAuth, clearAuth } = useAuthStore();

  const login = async (loginId: string, password: string) => {
    const res = await authService.login(loginId, password);
    const { accessToken, user: authUser } = res.data.data as { accessToken: string; user: AuthUser };
    setAuth(accessToken, authUser);
    return authUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      clearAuth();
      toast.info("You have been logged out");
      router.replace("/login");
    }
  };

  const hasPermission = (module: string, action: "view" | "add" | "edit" | "delete") => {
    if (!user) return false;
    if (user.role === "super_admin") return true;
    if (user.role === "staff") {
      const perm = user.permissions.find((p) => p.module === module);
      return Boolean(perm?.[action]);
    }
    return false;
  };

  return { token, user, isHydrated, login, logout, hasPermission };
}

export { getErrorMessage };
