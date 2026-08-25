"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FiX, FiChevronDown } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { NAV_GROUPS } from "./navConfig";
import type { Role } from "@/types";

const STORAGE_KEY = "milk-dairy-sidebar-groups";

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let initial: Record<string, boolean> = {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) initial = JSON.parse(stored);
    } catch {
      // ignore malformed storage
    }
    NAV_GROUPS.forEach((g) => {
      if (!(g.id in initial)) initial[g.id] = true;
    });
    // Always expand the group containing the active route.
    const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/")));
    if (activeGroup) initial[activeGroup.id] = true;
    setOpenGroups(initial);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const canSeeItem = (item: (typeof NAV_GROUPS)[number]["items"][number]) => {
    if (!item.roles.includes(role)) return false;
    if (item.module && role === "staff") {
      const perm = user?.permissions.find((p) => p.module === item.module);
      return Boolean(perm?.view);
    }
    return true;
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Murli Milk" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" />
            <span className="text-sm font-semibold text-slate-900">Murli Milk Dairy</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter(canSeeItem);
            if (!items.length) return null;
            const isOpen = !hydrated || openGroups[group.id] !== false;
            return (
              <div key={group.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                >
                  {group.title}
                  <FiChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="mt-1 flex flex-col gap-0.5 pb-3">
                    {items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", active ? "text-indigo-600" : "text-slate-400")} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
