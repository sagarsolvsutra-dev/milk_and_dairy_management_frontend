"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import { RowActions, LedgerAction, EditAction, ToggleStatusAction, DeleteAction } from "@/components/ui/RowActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api";
import { vendorService } from "@/services/vendor.service";
import { mastersDropdownService } from "@/services/masters.service";
import { formatCurrency } from "@/lib/utils";
import { validateMobile, validateIfsc, validateMinLength, runValidation } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import type { Vendor, City } from "@/types";

const emptyForm = {
  name: "",
  mobile: "",
  address: "",
  city: "",
  openingBalance: "0",
  accountNo: "",
  ifsc: "",
  bankName: "",
};

export default function VendorsPage() {
  const toast = useToast();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("vendor", "add");
  const canEdit = hasPermission("vendor", "edit");
  const canDelete = hasPermission("vendor", "delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { items, total, pages, loading, refetch } = usePaginatedList<Vendor>("/vendors", { search, page });

  const [cities, setCities] = useState<City[]>([]);
  useEffect(() => {
    mastersDropdownService
      .listCities()
      .then((res) => setCities(res.data.data.items))
      .catch(() => {});
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const togglingRef = useRef<string | null>(null);
  const deletingRef = useRef(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditing(vendor);
    setForm({
      name: vendor.name,
      mobile: vendor.mobile,
      address: vendor.address || "",
      city: typeof vendor.city === "object" && vendor.city ? vendor.city._id : (vendor.city as string) || "",
      openingBalance: String(vendor.openingBalance),
      accountNo: vendor.bankDetail?.accountNo || "",
      ifsc: vendor.bankDetail?.ifsc || "",
      bankName: vendor.bankDetail?.bankName || "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () =>
    runValidation({
      name: () => validateMinLength(form.name.trim(), 2, "Vendor name"),
      mobile: () => validateMobile(form.mobile),
      ifsc: () => (form.ifsc ? validateIfsc(form.ifsc) : undefined),
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
      const payload = {
        name: form.name,
        mobile: form.mobile,
        address: form.address,
        city: form.city || null,
        openingBalance: Number(form.openingBalance) || 0,
        bankDetail: { accountNo: form.accountNo, ifsc: form.ifsc, bankName: form.bankName },
      };
      if (editing) {
        await vendorService.update(editing._id, payload);
        toast.success("Vendor updated successfully");
      } else {
        await vendorService.create(payload);
        toast.success("Vendor added successfully");
      }
      setDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (vendor: Vendor) => {
    if (togglingRef.current) return;
    togglingRef.current = vendor._id;
    setTogglingId(vendor._id);
    try {
      await vendorService.toggleStatus(vendor._id);
      toast.success(
        `Vendor ${vendor.isActive ? "deactivated" : "activated"}`
      );
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      togglingRef.current = null;
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await vendorService.remove(deleteTarget._id);
      toast.success("Vendor deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const columns: Column<Vendor>[] = [
    { header: "Name", accessor: (v) => <span className="font-medium text-slate-900">{v.name}</span> },
    { header: "Mobile", accessor: (v) => v.mobile },
    {
      header: "City",
      accessor: (v) => (typeof v.city === "object" && v.city ? v.city.name : "-"),
    },
    { header: "Opening Bal.", accessor: (v) => formatCurrency(v.openingBalance) },
    {
      header: "Current Balance",
      accessor: (v) => (
        <span className={v.currentBalance > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
          {formatCurrency(v.currentBalance)}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (v) => <Badge tone={v.isActive ? "success" : "neutral"}>{v.isActive ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "Actions",
      accessor: (v) => (
        <RowActions>
          <LedgerAction onClick={() => router.push(`/masters/vendors/${v._id}/ledger`)} />
          {canEdit && <EditAction onClick={() => openEdit(v)} />}
          {canEdit && (
            <ToggleStatusAction active={v.isActive} disabled={togglingId === v._id} onClick={() => handleToggleStatus(v)} />
          )}
          {canDelete && <DeleteAction onClick={() => setDeleteTarget(v)} />}
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Manage milk suppliers and their balances"
        actions={
          canAdd ? (
            <Button icon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
              Add Vendor
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, mobile, address..." />
      </div>

      <Table columns={columns} data={items} keyField={(v) => v._id} loading={loading} emptyMessage="No vendors added yet" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Vendor" : "Add Vendor"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save Changes" : "Add Vendor"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Vendor Name"
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
            error={errors.mobile}
            hint="10-digit mobile number"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
          <Input
            label="Address"
            wrapperClassName="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Select
            label="City"
            options={cities.map((c) => ({ label: c.name, value: c._id }))}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Opening Balance"
            type="number"
            step="0.01"
            disabled={Boolean(editing)}
            hint={editing ? "Opening balance can't be changed after creation" : undefined}
            value={form.openingBalance}
            onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
          />
          <Input label="Bank Account No." value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} />
          <Input
            label="IFSC Code"
            error={errors.ifsc}
            value={form.ifsc}
            onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
          />
          <Input label="Bank Name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Vendor"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
