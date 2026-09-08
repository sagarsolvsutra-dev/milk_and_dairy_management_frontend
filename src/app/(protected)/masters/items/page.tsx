"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import { RowActions, ViewAction, EditAction, ToggleStatusAction, DeleteAction } from "@/components/ui/RowActions";
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
  unitSize: "",
  milkQtyPerUnit: "",
  defaultSellingPrice: "",
  gstSlab: "",
  minStockAlert: "0",
};

/** Splits a Unit's comma-separated `sizes` string ("100ml, 200ml, 500ml") into a clean, deduplicated list. */
function parseSizes(sizes?: string): string[] {
  const list = (sizes || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(list)];
}

export default function ItemsPage() {
  const toast = useToast();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("item", "add");
  const canEdit = hasPermission("item", "edit");
  const canDelete = hasPermission("item", "delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { items, total, pages, loading, refetch } = usePaginatedList<Item>("/items", { search, page });

  const [units, setUnits] = useState<Unit[]>([]);
  const [gstSlabs, setGstSlabs] = useState<GstSlab[]>([]);
  const refreshUnits = () => {
    mastersDropdownService.listUnits().then((res) => setUnits(res.data.data.items)).catch(() => {});
  };
  useEffect(() => {
    refreshUnits();
    mastersDropdownService.listGstSlabs().then((res) => setGstSlabs(res.data.data.items)).catch(() => {});
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // The chosen Unit drives two things: what sizes (if any) can be picked for
  // this item, and what measurement the recipe's milk-quantity input uses —
  // ml for a Bottle, g/kg for a Packet, or "KG" for a plain unit with no
  // sizes configured (matches every item created before this feature).
  const selectedUnit = useMemo(() => units.find((u) => u._id === form.unit), [units, form.unit]);
  const sizeOptions = useMemo(() => parseSizes(selectedUnit?.sizes), [selectedUnit]);
  // Only trust sizeUnit when the Unit actually has sizes to go with it —
  // otherwise (e.g. an admin set a Size Measurement but never filled in
  // Available Sizes) fall back to "KG" the same way a plain unit would,
  // matching the Size picker's own visibility condition above.
  const resolvedMilkUnit = sizeOptions.length > 0 ? selectedUnit?.sizeUnit || "KG" : "KG";
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const togglingRef = useRef<string | null>(null);
  const deletingRef = useRef(false);

  const openCreate = () => {
    refreshUnits();
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    refreshUnits();
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category || "",
      unit: typeof item.unit === "object" && item.unit ? item.unit._id : (item.unit as string) || "",
      unitSize: item.unitSize || "",
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
      unitSize: () => (sizeOptions.length > 0 ? validateRequired(form.unitSize, "Size") : undefined),
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
        unitSize: sizeOptions.length > 0 ? form.unitSize : "",
        recipe: { milkQtyPerUnit: Number(form.milkQtyPerUnit) || 0, milkUnit: resolvedMilkUnit },
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
    { header: "Name", primary: true, accessor: (i) => <span className="font-medium text-slate-900">{i.name}</span> },
    { header: "Category", accessor: (i) => i.category || "-" },
    {
      header: "Unit",
      accessor: (i) =>
        typeof i.unit === "object" && i.unit ? `${i.unit.shortCode}${i.unitSize ? ` (${i.unitSize})` : ""}` : "-",
    },
    { header: "Recipe (Milk/Unit)", accessor: (i) => `${i.recipe?.milkQtyPerUnit ?? 0} ${i.recipe?.milkUnit || "KG"}` },
    { header: "Selling Price", accessor: (i) => formatCurrency(i.defaultSellingPrice) },
    { header: "Min. Stock", accessor: (i) => i.minStockAlert },
    {
      header: "Status",
      accessor: (i) => (
        <Badge tone={i.isActive ? "success" : "neutral"}>{i.isActive ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      header: "Actions",
      accessor: (i: Item) => (
        <RowActions>
          <ViewAction title="Stock & history" onClick={() => router.push(`/masters/items/${i._id}`)} />
          {canEdit && <EditAction onClick={() => openEdit(i)} />}
          {canEdit && (
            <ToggleStatusAction active={i.isActive} disabled={togglingId === i._id} onClick={() => handleToggleStatus(i)} />
          )}
          {canDelete && <DeleteAction onClick={() => setDeleteTarget(i)} />}
        </RowActions>
      ),
    },
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
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name or code..."
        />
      </div>

      <Table
        columns={columns}
        data={items}
        keyField={(i) => i._id}
        loading={loading}
        emptyMessage="No items added yet"
        onRowClick={(i) => router.push(`/masters/items/${i._id}`)}
      />
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
            onChange={(e) => {
              const nextUnit = units.find((u) => u._id === e.target.value);
              const nextSizes = parseSizes(nextUnit?.sizes);
              // A size chosen for the old unit rarely makes sense for the new
              // one (e.g. switching from Bottle to Packet) — drop it rather
              // than silently carry over a mismatched size label.
              setForm({ ...form, unit: e.target.value, unitSize: nextSizes.includes(form.unitSize) ? form.unitSize : "" });
            }}
          />
          {sizeOptions.length > 0 && (
            <Select
              label="Size"
              required
              error={errors.unitSize}
              options={sizeOptions.map((s) => ({ label: s, value: s }))}
              value={form.unitSize}
              onChange={(e) => setForm({ ...form, unitSize: e.target.value })}
            />
          )}
          <Input
            label={`Recipe — Milk (${resolvedMilkUnit}) per 1 Unit`}
            type="number"
            step="0.01"
            min="0"
            required
            error={errors.milkQtyPerUnit}
            hint={
              resolvedMilkUnit === "ml"
                ? "e.g. a 100ml bottle uses 95ml milk → enter 95"
                : resolvedMilkUnit === "g"
                ? "e.g. a 200g packet uses 180g milk → enter 180"
                : resolvedMilkUnit === "L"
                ? "e.g. a 1L item uses 0.95L milk → enter 0.95"
                : resolvedMilkUnit === "kg"
                ? "e.g. a 1kg item uses 0.9kg milk → enter 0.9"
                : "e.g. 1 KG milk = 6 KG item → enter 0.166"
            }
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
        description={`Are you sure you want to delete this item?`}
        confirmLabel="Delete"
      />

    </div>
  );
}
