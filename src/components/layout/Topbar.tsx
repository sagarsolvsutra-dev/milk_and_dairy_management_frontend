"use client";

import { useEffect, useRef, useState } from "react";
import { FiMenu, FiBell, FiLogOut, FiUser, FiChevronDown, FiInbox } from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/services/meta.service";
import { formatDateTime } from "@/lib/utils";
import { ProfileDialog } from "./ProfileDialog";
import type { Notification } from "@/types";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = (active: { current: boolean } = { current: true }) => {
    notificationService
      .list()
      .then((res) => {
        if (!active.current) return;
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const active = { current: true };
    fetchNotifications(active);
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleOpenNotif = (n: Notification) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationService.markAsRead(n._id).catch(() => fetchNotifications());
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    notificationService.markAllAsRead().catch(() => fetchNotifications());
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-sm">
      <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
        <FiMenu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <FiBell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-100 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <span className="text-sm font-semibold text-slate-800">સૂચનાઓ (Notifications)</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs font-medium text-indigo-600 hover:underline">
                    બધું વાંચેલું ગણો (Mark all read)
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length ? (
                  notifications.map((n) => (
                    <button
                      key={n._id}
                      onClick={() => handleOpenNotif(n)}
                      className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50 ${
                        n.isRead ? "" : "bg-indigo-50/50"
                      }`}
                    >
                      <span className="flex w-full items-center gap-2">
                        {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
                        <span className={`text-sm ${n.isRead ? "font-medium text-slate-700" : "font-semibold text-slate-900"}`}>
                          {n.title}
                        </span>
                      </span>
                      <span className="pl-3.5 text-xs text-slate-500">{n.message}</span>
                      <span className="pl-3.5 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</span>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                    <FiInbox className="h-6 w-6 text-slate-300" />
                    <p className="text-xs text-slate-400">કોઈ સૂચના નથી (No notifications)</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs capitalize text-slate-400">{user?.roleTitle || user?.role?.replace("_", " ")}</p>
            </div>
            <FiChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FiUser className="h-4 w-4 shrink-0" /> {user?.loginId}
                </div>
                {user?.email && <p className="mt-0.5 truncate pl-6 text-xs text-slate-400">{user.email}</p>}
              </div>
              <button
                onClick={() => {
                  setProfileOpen(true);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <FiUser className="h-4 w-4" /> મારી પ્રોફાઇલ (My Profile)
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <FiLogOut className="h-4 w-4" /> બહાર નીકળો (Logout)
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}
