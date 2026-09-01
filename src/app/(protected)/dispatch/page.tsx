"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiPlus, FiTrash2, FiTruck, FiBox } from "react-icons/fi";
import { RowActions, ViewAction, EditAction, CancelAction } from "@/components/ui/RowActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api";
import { dispatchService } from "@/services/dispatch.service";
import { itemService } from "@/services/item.service";
import { dairyService } from "@/services/dairy.service";
import { inventoryService } from "@/services/inventory.service";
import { formatDate, toDateInputValue } from "@/lib/utils";
import { validateRequired } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import type { DispatchEntry, Item, Dairy } from "@/types";

type Row = { item: string; quantity: string };

export default function DispatchPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("dispatch", "add");
  const canEdit = hasPermission("dispatch", "edit");
  const canDelete = hasPermission("dispatch", "delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  type DispatchSummary = { count: number; totalItemsDispatched: number };
  const {
    items: dispatches,
    total,
    pages,
    summary,
    loading,
    refetch,
  } = usePaginatedList<DispatchEntry, DispatchSummary>("/dispatch", { search, page, extraParams: { from, to } });

  const [items, setItems] = useState<Item[]>([]);
  const [dairies, setDairies] = useState<Dairy[]>([]);
  const [centralStock, setCentralStock] = useState<Record<string, number>>({});
  const refreshCentralStock = () => {
    // This builds a lookup map for every item, not a paginated view — pass a
    // high limit to get everything in one call rather than one page's worth.
    inventoryService
      .getCentralItemStock({ limit: 1000 })
      .then((res) => {
        const map: Record<string, number> = {};
        for (const s of res.data.data.items) map[s.item?._id || s.item] = s.currentQty;
        setCentralStock(map);
      })
      .catch(() => {});
  };
  useEffect(() => {
    itemService.listActive().then((res) => setItems(res.data.data.items)).catch(() => {});
    dairyService.listActive().then((res) => setDairies(res.data.data.items)).catch(() => {});
    refreshCentralStock();
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DispatchEntry | null>(null);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [dairy, setDairy] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [remark, setRemark] = useState("");
  const [rows, setRows] = useState<Row[]>([{ item: "", quantity: "" }]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [dairyError, setDairyError] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<DispatchEntry | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DispatchEntry | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const savingRef = useRef(false);
  const cancellingRef = useRef(false);

  const openCreate = () => {
    refreshCentralStock();
    setEditTarget(null);
    setDate(toDateInputValue(new Date()));
    setDairy("");
    setVehicleNo("");
    setDriverName("");
    setRemark("");
    setRows([{ item: "", quantity: "" }]);
    setRowErrors({});
    setDairyError("");
    setDialogOpen(true);
  };

  const openEdit = (d: DispatchEntry) => {
    refreshCentralStock();
    setEditTarget(d);
    setDate(toDateInputValue(d.date));
    setDairy(typeof d.dairy === "object" && d.dairy ? d.dairy._id : (d.dairy as string) || "");
    setVehicleNo(d.vehicleNo || "");
    setDriverName(d.driverName || "");
    setRemark(d.remark || "");
    setRows(
      d.items.map((row) => ({
        item: typeof row.item === "object" && row.item ? row.item._id : (row.item as string) || "",
        quantity: String(row.quantity),
      }))
    );
    setRowErrors({});
    setDairyError("");
    setDialogOpen(true);
  };

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, { item: "", quantity: "" }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  // Same item can appear on more than one row — combine what's actually
  // being requested per item so the live "In Stock" hint (and the red
  // over-limit state) reflects the real total, not just one row in isolation.
  const requestedByItem = useMemo(() => {
    const totals: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.item && Number(r.quantity) > 0) totals[r.item] = (totals[r.item] || 0) + Number(r.quantity);
    });
    return totals;
  }, [rows]);

  const validateRows = () => {
    const nextErrors: Record<number, string> = {};
    const filledRows = rows.filter((r) => r.item || r.quantity);
    if (!filledRows.length) return { errors: nextErrors, isValid: false, blank: true };

    rows.forEach((r, i) => {
      if (!r.item && !r.quantity) return;
      if (!r.item) nextErrors[i] = "Select an item";
      else if (!r.quantity || Number(r.quantity) <= 0) nextErrors[i] = "Quantity must be greater than 0";
      // Only enforced on create — editing an existing dispatch changes what
      // "available" means (some of this item is already committed to it),
      // so the hint below still shows but doesn't hard-block here.
      else if (!editTarget && requestedByItem[r.item] > (centralStock[r.item] ?? 0)) {
        nextErrors[i] = `Only ${centralStock[r.item] ?? 0} available in central stock`;
      }
    });
    return { errors: nextErrors, isValid: Object.keys(nextErrors).length === 0, blank: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const dairyErr = validateRequired(dairy, "Dairy");
    setDairyError(dairyErr || "");
    const { errors: fieldErrors, isValid, blank } = validateRows();
    setRowErrors(fieldErrors);

    if (dairyErr) {
      toast.error(dairyErr);
      return;
    }
    if (blank) {
      toast.warning("Add at least one item with quantity");
      return;
    }
    if (!isValid) {
      toast.error("Please fix the highlighted rows");
      return;
    }
    const validRows = rows.filter((r) => r.item && Number(r.quantity) > 0);
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        date,
        dairy,
        items: validRows.map((r) => ({ item: r.item, quantity: Number(r.quantity) })),
        vehicleNo,
        driverName,
        remark,
      };
      if (editTarget) {
        await dispatchService.update(editTarget._id, payload);
        toast.success("Dispatch entry updated");
      } else {
        await dispatchService.create(payload);
        toast.success("Dispatch entry saved successfully");
      }
      setDialogOpen(false);
      refetch();
      refreshCentralStock();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget || cancellingRef.current) return;
    cancellingRef.current = true;
    setCancelling(true);
    try {
      await dispatchService.cancel(cancelTarget._id);
      toast.success("Dispatch entry cancelled");
      setCancelTarget(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  };

  const columns: Column<DispatchEntry>[] = [
    { header: "Date", accessor: (d) => formatDate(d.date) },
    { header: "Dispatch No.", accessor: (d) => <span className="font-mono text-xs">{d.dispatchNo}</span> },
    {
      header: "Dairy",
      primary: true,
      accessor: (d) =>
        typeof d.dairy === "object" && d.dairy ? (
          <Link
            href={`/inventory/dairy/${d.dairy._id}`}
            className="font-medium text-indigo-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
            title="View this dairy's full stock, dispatch and bill history"
          >
            {d.dairy.name}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      header: "Items",
      accessor: (d) => (
        <span className="whitespace-normal">
          {d.items.map((row) => (typeof row.item === "object" && row.item ? row.item.name : "-") + ` (${row.quantity})`).join(", ")}
        </span>
      ),
    },
    { header: "Vehicle No.", accessor: (d) => d.vehicleNo || "-" },
    {
      header: "Status",
      accessor: (d) => <Badge tone={d.status === "active" ? "success" : "danger"}>{d.status === "active" ? "Active" : "Cancelled"}</Badge>,
    },
    {
      header: "Actions",
      accessor: (d) => (
        <RowActions>
          <ViewAction onClick={() => setViewing(d)} />
          {d.status === "active" && canEdit && <EditAction onClick={() => openEdit(d)} />}
          {d.status === "active" && canDelete && <CancelAction onClick={() => setCancelTarget(d)} />}
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dairy-wise Dispatch"
        description="Allocate items from central stock to dairy branches"
        actions={
          canAdd ? (
            <Button icon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
              New Dispatch
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Dispatches" value={summary?.count ?? 0} icon={<FiTruck className="h-5 w-5" />} tone="indigo" />
        <StatCard label="Total Items Dispatched" value={summary?.totalItemsDispatched ?? 0} icon={<FiBox className="h-5 w-5" />} tone="sky" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by dispatch no, dairy, item, vehicle, driver, status, remark..." />
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onClear={() => { setFrom(""); setTo(""); setPage(1); }}
        />
      </div>

      <Table columns={columns} data={dispatches} keyField={(d) => d._id} loading={loading} emptyMessage="No dispatch entries yet" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editTarget ? `Edit Dispatch ${editTarget.dispatchNo}` : "New Dispatch Entry"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editTarget ? "Save Changes" : "Save Dispatch"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker label="Dispatch Date" required value={date} onChange={(v) => setDate(v)} />
            <Select
              label="Dairy"
              required
              error={dairyError}
              options={dairies.map((d) => ({ label: `${d.name} (${d.code})`, value: d._id }))}
              value={dairy}
              onChange={(e) => setDairy(e.target.value)}
            />
            <Input label="Vehicle No., optional" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
            <Input label="Driver Name, optional" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Items to Dispatch</p>
            <div className="flex items-start gap-2">
              <p className="flex-[2] text-xs font-medium text-slate-500">Item</p>
              <p className="w-28 shrink-0 text-xs font-medium text-slate-500">Quantity</p>
              <p className="w-28 shrink-0 text-xs font-medium text-slate-500">In Stock</p>
              <span className="w-9 shrink-0" aria-hidden="true" />
            </div>
            {rows.map((row, i) => {
              const available = row.item ? centralStock[row.item] ?? 0 : null;
              // Live, not just on submit — and only enforced as "over" on create,
              // same reasoning as the submit-time check (edit's true ceiling differs).
              const requested = row.item ? requestedByItem[row.item] ?? 0 : 0;
              const overLimit = !editTarget && available !== null && requested > available;
              return (
                <div key={i} className="flex items-start gap-2">
                  <Select
                    wrapperClassName="flex-[2]"
                    options={items.map((it) => ({ label: `${it.name} (${it.code})`, value: it._id }))}
                    value={row.item}
                    onChange={(e) => updateRow(i, { item: e.target.value })}
                    placeholder="Select item"
                    error={rowErrors[i]}
                  />
                  <Input
                    wrapperClassName="w-28 shrink-0"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Quantity"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, { quantity: e.target.value })}
                  />
                  <div
                    className={`mt-1 flex h-9.5 w-28 shrink-0 flex-col items-center justify-center rounded-lg border px-1 text-center leading-tight ${
                      available === null
                        ? "border-slate-100 text-slate-300"
                        : overLimit || available <= 0
                          ? "border-red-200 bg-red-50 text-red-600"
                          : "border-emerald-100 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {available === null ? (
                      <span className="text-xs">—</span>
                    ) : (
                      <>
                        <span className="text-base font-bold">{available}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wide">
                          {available <= 0 ? "Out of stock" : overLimit ? "Not enough" : "In stock"}
                        </span>
                      </>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                  >
                    <FiTrash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" icon={<FiPlus className="h-3.5 w-3.5" />} onClick={addRow}>
              Add Item
            </Button>
          </div>

          <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </form>
      </Dialog>

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={`Dispatch ${viewing?.dispatchNo || ""}`} size="md">
        {viewing && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-500">
              To: {typeof viewing.dairy === "object" && viewing.dairy ? viewing.dairy.name : "-"} — {formatDate(viewing.date)}
            </p>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {viewing.items.map((row, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span>{typeof row.item === "object" && row.item ? row.item.name : "Deleted item"}</span>
                  <span className="text-slate-500">{row.quantity} units</span>
                </div>
              ))}
            </div>
            {viewing.vehicleNo && <p className="text-slate-500">Vehicle: {viewing.vehicleNo}</p>}
            {viewing.driverName && <p className="text-slate-500">Driver: {viewing.driverName}</p>}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Cancel Dispatch Entry"
        description={`This will reverse the central and dairy stock movements for dispatch "${cancelTarget?.dispatchNo}". Continue?`}
        confirmLabel="Cancel Entry"
      />
    </div>
  );
}
