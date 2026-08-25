"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FiUser } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(loginId, password);
      router.replace(user.role === "dairy_user" ? "/dairy" : "/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo.jpg"
            alt="Murli Milk"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover shadow-lg shadow-indigo-200"
            priority
          />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Murli Milk Dairy Management</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your admin or dairy panel</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && <Alert type="error">{error}</Alert>}

          <Input
            label="Login ID"
            placeholder="e.g. admin"
            icon={<FiUser className="h-4 w-4" />}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            autoFocus
          />
          <PasswordInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="mt-2 w-full" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          SolvSutra Software &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
