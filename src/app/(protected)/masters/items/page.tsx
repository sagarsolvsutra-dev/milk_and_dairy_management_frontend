"use client";

import { useEffect, useRef, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { RowActions, EditAction, ToggleStatusAction, DeleteAction } from "@/components/ui/RowActions";
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
import { itemService } from "@/services/item.service";
import { mastersDropdownService } from "@/services/masters.service";
import { formatCurrency } from "@/lib/utils";
import { validateMinLength, validateRequired, validateNonNegativeNumber, runValidation } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import type { Item, Unit, GstSlab } from "@/types";

const emptyForm = {
  name: "",
  category: "",
  unit: "",
  milkQtyPerUnit: "",
  defaultSellingPrice: "",
  gstSlab: "",
  minStockAlert: "0",
};

export default function ItemsPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("item", "add");
  const canEdit = hasPermission("item", "edit");
  const canDelete = hasPermission("item", "delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { items, total, pages, loading, refetch } = usePaginatedList<Item>("/items", { search, page });

  const [units, setUnits] = useState<Unit[]>([]);
  const [gstSlabs, setGstSlabs] = useState<GstSlab[]>([]);
  useEffect(() => {
    mastersDropdownService.listUnits().then((res) => setUnits(res.data.data.items)).catch(() => {});
    mastersDropdownService.listGstSlabs().then((res) => setGstSlabs(res.data.data.items)).catch(() => {});
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
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

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category || "",
      unit: typeof item.unit === "object" ? item.unit._id : item.unit,
      milkQtyPerUnit: String(item.recipe?.milkQtyPerUnit ?? ""),
      defaultSellingPrice: String(item.defaultSellingPrice ?? ""),
      gstSlab: typeof item.gstSlab === "object" && item.gstSlab ? item.gstSlab._id : (item.gstSlab as string) || "",
      minStockAlert: String(item.minStockAlert ?? "0"),
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () =>
    runValidation({
      name: () => validateMinLength(form.name.trim(), 2, "Item name"),
      unit: () => validateRequired(form.unit, "Unit"),
      milkQtyPerUnit: () => validateNonNegativeNumber(form.milkQtyPerUnit, "Recipe milk quantity"),
      defaultSellingPrice: () => validateNonNegativeNumber(form.defaultSellingPrice, "Selling price"),
      minStockAlert: () => validateNonNegativeNumber(form.minStockAlert, "Minimum stock alert"),
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
        category: form.category,
        unit: form.unit,
        recipe: { milkQtyPerUnit: Number(form.milkQtyPerUnit) || 0, milkUnit: "KG" },
        defaultSellingPrice: Number(form.defaultSellingPrice) || 0,
        gstSlab: form.gstSlab || null,
        minStockAlert: Number(form.minStockAlert) || 0,
      };
      if (editing) {
        await itemService.update(editing._id, payload);
        toast.success("Item updated successfully");
      } else {
        await itemService.create(payload);
        toast.success("Item added successfully");
      }
      setDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: Item) => {
    if (togglingRef.current) return;
    togglingRef.current = item._id;
    setTogglingId(item._id);
    try {
      await itemService.toggleStatus(item._id);
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
      await itemService.remove(deleteTarget._id);
      toast.success("Item deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const columns: Column<Item>[] = [
    { header: "Code", accessor: (i) => <span className="font-mono text-xs text-slate-500">{i.code}</span> },
    { header: "Name", accessor: (i) => <span className="font-medium text-slate-900">{i.name}</span> },
    { header: "Category", accessor: (i) => i.category || "-" },
    { header: "Unit", accessor: (i) => (typeof i.unit === "object" ? i.unit.shortCode : "-") },
    { header: "Recipe (Milk/Unit)", accessor: (i) => `${i.recipe?.milkQtyPerUnit ?? 0} KG` },
    { header: "Selling Price", accessor: (i) => formatCurrency(i.defaultSellingPrice) },
    { header: "Min. Stock", accessor: (i) => i.minStockAlert },
    {
      header: "Status",
      accessor: (i) => <Badge tone={i.isActive ? "success" : "neutral"}>{i.isActive ? "Active" : "Inactive"}</Badge>,
    },
    ...(canEdit || canDelete
      ? [
          {
            header: "Actions",
            accessor: (i: Item) => (
              <RowActions>
                {canEdit && <EditAction onClick={() => openEdit(i)} />}
                {canEdit && (
                  <ToggleStatusAction active={i.isActive} disabled={togglingId === i._id} onClick={() => handleToggleStatus(i)} />
                )}
                {canDelete && <DeleteAction onClick={() => setDeleteTarget(i)} />}
              </RowActions>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Items & Recipe"
        description="Manage items and their milk-to-item production recipe"
        actions={
          canAdd ? (
            <Button icon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
              Add Item
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or code..." />
      </div>

      <Table columns={columns} data={items} keyField={(i) => i._id} loading={loading} emptyMessage="No items added yet" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Item" : "Add Item"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save Changes" : "Add Item"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Item Name"
            required
            error={errors.name}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Select
            label="Unit"
            required
            error={errors.unit}
            options={units.map((u) => ({ label: `${u.name} (${u.shortCode})`, value: u._id }))}
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="Recipe — Milk (KG) per 1 Unit"
            type="number"
            step="0.01"
            min="0"
            required
            error={errors.milkQtyPerUnit}
            hint="e.g. 1 KG milk = 6 KG item → enter 0.166"
            value={form.milkQtyPerUnit}
            onChange={(e) => setForm({ ...form, milkQtyPerUnit: e.target.value })}
          />
          <Input
            label="Default Selling Price"
            type="number"
            step="0.01"
            min="0"
            error={errors.defaultSellingPrice}
            value={form.defaultSellingPrice}
            onChange={(e) => setForm({ ...form, defaultSellingPrice: e.target.value })}
          />
          <Select
            label="GST Slab"
            options={gstSlabs.map((g) => ({ label: g.label || `${g.percent}%`, value: g._id }))}
            value={form.gstSlab}
            onChange={(e) => setForm({ ...form, gstSlab: e.target.value })}
          />
          <Input
            label="Minimum Stock Alert"
            type="number"
            min="0"
            error={errors.minStockAlert}
            value={form.minStockAlert}
            onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })}
          />
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
      />
    </div>
  );
}
