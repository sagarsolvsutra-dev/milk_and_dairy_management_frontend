"use client";

import { useRef, useState } from "react";
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
import { dairyService } from "@/services/dairy.service";
import { formatDate } from "@/lib/utils";
import { validateMobile, validateLoginId, validateMinLength, runValidation } from "@/lib/validators";
import type { Dairy } from "@/types";

const emptyForm = { name: "", mobile: "", address: "", loginId: "", password: "" };

export default function DairiesPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { items, total, pages, loading, refetch } = usePaginatedList<Dairy>("/dairies", { search, page });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dairy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<Dairy | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const togglingRef = useRef<string | null>(null);
  const resettingRef = useRef(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (dairy: Dairy) => {
    setEditing(dairy);
    setForm({ name: dairy.name, mobile: dairy.mobile, address: dairy.address || "", loginId: dairy.loginId, password: "" });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () =>
    runValidation({
      name: () => validateMinLength(form.name.trim(), 2, "Dairy name"),
      mobile: () => validateMobile(form.mobile),
      loginId: () => validateLoginId(form.loginId),
      password: () =>
        !editing ? (!form.password ? "Password is required" : validateMinLength(form.password, 4, "Password")) : undefined,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: fieldErrors, isValid } = validate();
    setErrors(fieldErrors);
    if (!isValid) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await dairyService.update(editing._id, {
          name: form.name,
          mobile: form.mobile,
          address: form.address,
          loginId: form.loginId,
        });
        toast.success("Dairy updated successfully");
      } else {
        await dairyService.create(form);
        toast.success("Dairy created successfully");
      }
      setDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dairy: Dairy) => {
    if (togglingRef.current) return;
    togglingRef.current = dairy._id;
    setTogglingId(dairy._id);
    try {
      await dairyService.toggleStatus(dairy._id);
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
      await dairyService.resetPassword(resetTarget._id, resetPassword);
      toast.success("Dairy password reset successfully");
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      resettingRef.current = false;
      setResetting(false);
    }
  };

  const columns: Column<Dairy>[] = [
    { header: "Code", accessor: (d) => <span className="font-mono text-xs text-slate-500">{d.code}</span> },
    { header: "Dairy Name", accessor: (d) => <span className="font-medium text-slate-900">{d.name}</span> },
    { header: "Mobile", accessor: (d) => d.mobile },
    { header: "Login ID", accessor: (d) => d.loginId },
    { header: "Created", accessor: (d) => formatDate(d.createdAt) },
    {
      header: "Status",
      accessor: (d) => <Badge tone={d.status === "active" ? "success" : "neutral"}>{d.status}</Badge>,
    },
    {
      header: "Actions",
      accessor: (d) => (
        <RowActions>
          <EditAction onClick={() => openEdit(d)} />
          <ResetPasswordAction onClick={() => setResetTarget(d)} />
          <ToggleStatusAction active={d.status === "active"} disabled={togglingId === d._id} onClick={() => handleToggleStatus(d)} />
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dairies (Branch)"
        description="Manage unlimited dairy branches and their login access"
        actions={
          <Button icon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
            Add Dairy
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, code, mobile, address, login..." />
      </div>

      <Table columns={columns} data={items} keyField={(d) => d._id} loading={loading} emptyMessage="No dairies added yet" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Dairy" : "Add Dairy"}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save Changes" : "Create Dairy"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Dairy Name"
            required
            error={errors.name}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Mobile Number"
            required
            inputMode="numeric"
            maxLength={10}
            hint="10-digit mobile number"
            error={errors.mobile}
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
          <Input
            label="Address"
            wrapperClassName="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="Login ID"
            required
            error={errors.loginId}
            value={form.loginId}
            onChange={(e) => setForm({ ...form, loginId: e.target.value })}
          />
          {!editing && (
            <PasswordInput
              label="Password"
              required
              error={errors.password}
              hint="At least 4 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
        </form>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title={`Reset Password — ${resetTarget?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} loading={resetting}>
              Reset Password
            </Button>
          </>
        }
      >
        <form onSubmit={handleResetPassword}>
          <PasswordInput
            label="New Password"
            required
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
        </form>
      </Dialog>
    </div>
  );
}
