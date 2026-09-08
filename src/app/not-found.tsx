"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiDroplet, FiHome } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const homeHref = !isHydrated || !user ? "/login" : user.role === "dairy_user" ? "/dairy" : "/dashboard";
  const homeLabel = !isHydrated || !user ? "Go to Login" : "Go to Dashboard";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>

      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${
          isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}
      >
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
          <h1 className="mt-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-700 tracking-tight">
            Murli Milk Dairy
          </h1>
        </div>

        <div className="backdrop-blur-xl bg-white/70 rounded-3xl border border-white/50 shadow-2xl shadow-indigo-900/5 p-8 text-center transition-all duration-300 hover:shadow-indigo-900/10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 ring-1 ring-indigo-100">
            <FiDroplet className="h-8 w-8 text-indigo-500" />
          </div>

          <p className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-6xl font-extrabold tracking-tight">
            404
          </p>

          <h2 className="mt-3 text-lg font-semibold text-slate-800">Page Not Found</h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              icon={<FiArrowLeft className="h-4 w-4" />}
              onClick={() => router.back()}
              className="shadow-sm"
            >
              Go Back
            </Button>
            <Button
              icon={<FiHome className="h-4 w-4" />}
              onClick={() => router.push(homeHref)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
            >
              {homeLabel}
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs font-medium text-slate-400/80 tracking-wide">
          SolvSutra Software &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
