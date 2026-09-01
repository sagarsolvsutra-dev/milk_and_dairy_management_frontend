"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { authService } from "@/services/auth.service";
import { validateRequired, validateMinLength, runValidation } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/types";

const emptyForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    // This component doesn't unmount while the dialog is closed (Dialog just
    // returns null), so a rapid close-then-reopen can leave two getMe() calls
    // in flight — guard against the older one overwriting the newer result.
    let active = true;
    setForm(emptyForm);
    setErrors({});
    setLoadingMe(true);
    // Fetched fresh on every open rather than trusting the cached login-time
    // store — a staff member's role/permissions can change without them
    // logging back in, so this dialog should reflect the live account state.
    authService
      .getMe()
      .then((res) => {
        if (active) setMe(res.data.data);
      })
      .catch(() => {
        if (active) setMe(null);
      })
      .finally(() => {
        if (active) setLoadingMe(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;

    const { errors: fieldErrors, isValid } = runValidation({
      currentPassword: () => validateRequired(form.currentPassword, "Current password"),
      newPassword: () =>
        validateRequired(form.newPassword.trim(), "New password") || validateMinLength(form.newPassword.trim(), 4, "New password"),
      confirmPassword: () =>
        form.confirmPassword !== form.newPassword ? "New password and confirmation don't match" : undefined,
    });
    setErrors(fieldErrors);
    if (!isValid) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await authService.changePassword(form.currentPassword, form.newPassword);
      toast.success("Password changed successfully");
      setForm(emptyForm);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const display = me || user;

  return (
    <Dialog open={open} onClose={onClose} title="My Profile" size="sm">
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
          {loadingMe ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            <div className="space-y-1">
              <Row label="Name" value={display?.name} />
              <Row label="Login ID" value={display?.loginId} />
              {display?.email && <Row label="Email" value={display.email} />}
              <Row label="Role" value={me?.roleTitle || display?.role?.replace("_", " ")} />
            </div>
          )}
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Change Password</h3>
          <PasswordInput
            label="Current Password"
            required
            error={errors.currentPassword}
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
          <PasswordInput
            label="New Password"
            required
            error={errors.newPassword}
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
          <PasswordInput
            label="Confirm New Password"
            required
            error={errors.confirmPassword}
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          <Button type="submit" className="w-full" loading={saving}>
            Change Password
          </Button>
        </form>
      </div>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium capitalize text-slate-800">{value}</span>
    </div>
  );
}
