"use client";

import { useState, useEffect } from "react";
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative h-20 w-20 rounded-full p-1 bg-white/50 backdrop-blur-sm shadow-xl shadow-indigo-100/50 mb-4 ring-1 ring-white/60">
            <Image
              src="/logo.jpg"
              alt="Murli Milk"
              width={80}
              height={80}
              className="h-full w-full rounded-full object-cover"
              priority
            />
          </div>
          <h1 className="mt-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-700 tracking-tight">Murli Milk Dairy</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            તમારા એડમિન અથવા ડેરી પેનલમાં લોગિન કરો<br/>
            <span className="text-xs opacity-80">(Sign in to your admin or dairy panel)</span>
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/70 rounded-3xl border border-white/50 shadow-2xl shadow-indigo-900/5 p-8 transition-all duration-300 hover:shadow-indigo-900/10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Alert type="error">{error}</Alert>
              </div>
            )}

            <div className="group">
              <Input
                label="લોગિન ID (Login ID)"
                placeholder="e.g. admin"
                icon={<FiUser className="h-5 w-5 text-indigo-500/70 group-focus-within:text-indigo-600 transition-colors" />}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
                autoFocus
                className="bg-white/50 border-slate-200 focus:border-indigo-400 focus:bg-white transition-all shadow-sm group-hover:border-indigo-300"
              />
            </div>
            
            <div className="group">
              <PasswordInput
                label="પાસવર્ડ (Password)"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/50 border-slate-200 focus:border-indigo-400 focus:bg-white transition-all shadow-sm group-hover:border-indigo-300"
              />
            </div>

            <Button 
              type="submit" 
              className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200 h-12 text-base font-medium rounded-xl" 
              loading={loading}
            >
              લોગિન કરો (Sign In)
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs font-medium text-slate-400/80 tracking-wide">
          SolvSutra Software &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
