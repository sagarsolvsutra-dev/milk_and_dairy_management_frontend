"use client";

import { useEffect, useRef, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { RowActions, EditAction, ResetPasswordAction, ToggleStatusAction } from "@/components/ui/RowActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api";
import { userService } from "@/services/user.service";
import { metaService } from "@/services/meta.service";
import { formatDateTime } from "@/lib/utils";
import { validateMobile, validateEmail, validateLoginId, validateMinLength, runValidation } from "@/lib/validators";
import type { TeamUser, Permission } from "@/types";
import { PermissionMatrix, buildEmptyPermissions, mergePermissions, type ModuleDef } from "@/components/team/PermissionMatrix";

const emptyForm = { name: "", mobile: "", email: "", loginId: "", password: "", roleTitle: "" };

export default function TeamPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { items, total, pages, loading, refetch } = usePaginatedList<TeamUser>("/users", { search, page });

  const [modules, setModules] = useState<ModuleDef[]>([]);
  useEffect(() => {
    metaService
      .getPermissionModules()
      .then((res) => setModules(res.data.data))
      .catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<TeamUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const togglingRef = useRef<string | null>(null);
  const resettingRef = useRef(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setPermissions(buildEmptyPermissions(modules));
    setDialogOpen(true);
  };

  const openEdit = (user: TeamUser) => {
    setEditing(user);
    setForm({
      name: user.name,
      mobile: user.mobile,
      email: user.email || "",
      loginId: user.loginId,
      password: "",
      roleTitle: user.roleTitle || "",
    });
    setErrors({});
    setPermissions(mergePermissions(modules, user.permissions));
    setDialogOpen(true);
  };

  const validate = () =>
    runValidation({
      name: () => validateMinLength(form.name.trim(), 2, "Name"),
      mobile: () => validateMobile(form.mobile),
      email: () => validateEmail(form.email),
      loginId: () => validateLoginId(form.loginId),
      password: () =>
        !editing
          ? !form.password
            ? "પાસવર્ડ જરૂરી છે (Password is required)"
            : validateMinLength(form.password, 4, "Password")
          : undefined,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: fieldErrors, isValid } = validate();
    setErrors(fieldErrors);
    if (!isValid) {
      toast.error("લાલ બતાવેલ ખાનાં સુધારો (Please fix the highlighted fields)");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await userService.update(editing._id, {
          name: form.name,
          mobile: form.mobile,
          email: form.email,
          loginId: form.loginId,
          roleTitle: form.roleTitle,
          permissions,
        });
        toast.success("ટીમ મેમ્બર સફળતાપૂર્વક અપડેટ થયું (Team member updated successfully)");
      } else {
        await userService.create({
          name: form.name,
          mobile: form.mobile,
          email: form.email,
          loginId: form.loginId,
          password: form.password,
          roleTitle: form.roleTitle,
          role: "staff",
          permissions,
        });
        toast.success("ટીમ મેમ્બર સફળતાપૂર્વક બનાવવામાં આવ્યું (Team member created successfully)");
      }
      setDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: TeamUser) => {
    if (togglingRef.current) return;
    togglingRef.current = user._id;
    setTogglingId(user._id);
    try {
      await userService.toggleStatus(user._id);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      togglingRef.current = null;
      setTogglingId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || resettingRef.current) return;
    resettingRef.current = true;
    setResetting(true);
    try {
      await userService.resetPassword(resetTarget._id, resetPassword);
      toast.success("પાસવર્ડ સફળતાપૂર્વક રીસેટ થયો (Password reset successfully)");
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      resettingRef.current = false;
      setResetting(false);
    }
  };

  const columns: Column<TeamUser>[] = [
    { header: "નામ (Name)", accessor: (u) => <span className="font-medium text-slate-900">{u.name}</span> },
    { header: "હોદ્દાનું નામ (Role Title)", accessor: (u) => u.roleTitle || "-" },
    { header: "લોગિન ID (Login ID)", accessor: (u) => u.loginId },
    { header: "ઈમેલ (Email)", accessor: (u) => u.email },
    { header: "મોબાઇલ નંબર (Mobile)", accessor: (u) => u.mobile },
    { header: "છેલ્લો લોગિન (Last Login)", accessor: (u) => (u.lastLogin ? formatDateTime(u.lastLogin) : "ક્યારેય નહીં (Never)") },
    {
      header: "સ્થિતિ (Status)",
      accessor: (u) => <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "ચાલુ (Active)" : "બંધ (Inactive)"}</Badge>,
    },
    {
      header: "ક્રિયા (Actions)",
      accessor: (u) => (
        <RowActions>
          <EditAction onClick={() => openEdit(u)} />
          <ResetPasswordAction onClick={() => setResetTarget(u)} />
          <ToggleStatusAction active={u.isActive} disabled={togglingId === u._id} onClick={() => handleToggleStatus(u)} />
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="ટીમ અને હોદ્દા વ્યવસ્થાપન (Team & Role Management)"
        description="સ્ટાફ લોગિન બનાવો અને મોડ્યુલ પ્રમાણે પરવાનગી નિયંત્રિત કરો (Create staff logins and control module-wise permissions)"
        actions={
          <Button icon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
            ટીમ મેમ્બર ઉમેરો (Add Team Member)
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="નામ, લોગિન, મોબાઇલ, હોદ્દો, ઈમેલથી શોધો... (Search by name, login, mobile, role, email...)" />
      </div>

      <Table columns={columns} data={items} keyField={(u) => u._id} loading={loading} emptyMessage="હજુ કોઈ ટીમ મેમ્બર ઉમેર્યું નથી (No team members added yet)" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "ટીમ મેમ્બર ફેરફાર કરો (Edit Team Member)" : "ટીમ મેમ્બર ઉમેરો (Add Team Member)"}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              રદ કરો (Cancel)
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "ફેરફાર સેવ કરો (Save Changes)" : "મેમ્બર બનાવો (Create Member)"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="પૂરું નામ (Full Name)"
              required
              error={errors.name}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="મોબાઇલ નંબર (Mobile Number)"
              required
              inputMode="numeric"
              maxLength={10}
              hint="10 અંકનો મોબાઇલ નંબર (10-digit mobile number)"
              error={errors.mobile}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
            <Input
              label="ઈમેલ (Email)"
              type="email"
              required
              error={errors.email}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="હોદ્દાનું નામ (Role Title)"
              placeholder="દા.ત. પરચેઝ મેનેજર (e.g. Purchase Manager)"
              value={form.roleTitle}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
            />
            <Input
              label="લોગિન ID (Login ID)"
              required
              error={errors.loginId}
              value={form.loginId}
              onChange={(e) => setForm({ ...form, loginId: e.target.value })}
            />
            {!editing && (
              <PasswordInput
                label="પાસવર્ડ (Password)"
                required
                error={errors.password}
                hint="ઓછામાં ઓછા 4 અક્ષર (At least 4 characters)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">મોડ્યુલ પરવાનગી (Module Permissions)</p>
            <p className="mb-2 text-xs text-slate-400">
              સંપૂર્ણ ઍક્સેસ માટે મોડ્યુલની રો ચેકબોક્સ ટિક કરો, અથવા જુઓ/ઉમેરો/ફેરફાર/કાઢી નાખો અલગ-અલગ સેટ કરો. કોલમ હેડર એકસાથે બધા મોડ્યુલ
              માટે તે ક્રિયા ટૉગલ કરે છે. (Tick a module&apos;s row checkbox for full access, or set View/Add/Edit/Delete
              individually. Column headers toggle that action for every module at once.)
            </p>
            <PermissionMatrix modules={modules} value={permissions} onChange={setPermissions} />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title={`પાસવર્ડ રીસેટ કરો (Reset Password) — ${resetTarget?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              રદ કરો (Cancel)
            </Button>
            <Button onClick={handleResetPassword} loading={resetting}>
              પાસવર્ડ રીસેટ કરો (Reset Password)
            </Button>
          </>
        }
      >
        <form onSubmit={handleResetPassword}>
          <PasswordInput label="નવો પાસવર્ડ (New Password)" required value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
        </form>
      </Dialog>
    </div>
  );
}
