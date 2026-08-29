"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiTrash2, FiPackage, FiDroplet } from "react-icons/fi";
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
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api";
import { productionService } from "@/services/production.service";
import { itemService } from "@/services/item.service";
import { inventoryService } from "@/services/inventory.service";
import { formatDate, toDateInputValue } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { ProductionEntry, Item } from "@/types";

type Row = { item: string; quantity: string };

export default function ProductionPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("production", "add");
  const canEdit = hasPermission("production", "edit");
  const canDelete = hasPermission("production", "delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  type ProductionSummary = { count: number; totalMilkConsumed: number };
  const {
    items: productions,
    total,
    pages,
    summary,
    loading,
    refetch,
  } = usePaginatedList<ProductionEntry, ProductionSummary>("/production", { search, page, extraParams: { from, to } });

  const [items, setItems] = useState<Item[]>([]);
  const [availableMilk, setAvailableMilk] = useState<number | null>(null);
  const refreshMilkStock = () => {
    inventoryService
      .getMilkStock()
      .then((res) => setAvailableMilk(res.data.data.currentQty))
      .catch(() => {});
  };
  useEffect(() => {
    itemService.listActive().then((res) => setItems(res.data.data.items)).catch(() => {});
    refreshMilkStock();
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductionEntry | null>(null);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [remark, setRemark] = useState("");
  const [rows, setRows] = useState<Row[]>([{ item: "", quantity: "" }]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ProductionEntry | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [viewing, setViewing] = useState<ProductionEntry | null>(null);
  const savingRef = useRef(false);
  const cancellingRef = useRef(false);

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i._id, i])), [items]);

  const totalMilk = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const item = itemMap[r.item];
        const qty = Number(r.quantity) || 0;
        return sum + qty * (item?.recipe.milkQtyPerUnit || 0);
      }, 0),
    [rows, itemMap]
  );

  const openCreate = () => {
    refreshMilkStock();
    setEditTarget(null);
    setDate(toDateInputValue(new Date()));
    setRemark("");
    setRows([{ item: "", quantity: "" }]);
    setRowErrors({});
    setDialogOpen(true);
  };

  const openEdit = (p: ProductionEntry) => {
    refreshMilkStock();
    setEditTarget(p);
    setDate(toDateInputValue(p.date));
    setRemark(p.remark || "");
    setRows(
      p.items.map((row) => ({
        item: typeof row.item === "object" && row.item ? row.item._id : (row.item as string) || "",
        quantity: String(row.quantity),
      }))
    );
    setRowErrors({});
    setDialogOpen(true);
  };

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, { item: "", quantity: "" }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const validateRows = () => {
    const nextErrors: Record<number, string> = {};
    const filledRows = rows.filter((r) => r.item || r.quantity);
    if (!filledRows.length) {
      return { errors: nextErrors, isValid: false, blank: true };
    }
    rows.forEach((r, i) => {
      if (!r.item && !r.quantity) return;
      if (!r.item) nextErrors[i] = "આઇટમ પસંદ કરો (Select an item)";
      else if (!r.quantity || Number(r.quantity) <= 0) nextErrors[i] = "જથ્થો 0 કરતાં વધારે હોવો જોઈએ (Quantity must be greater than 0)";
    });
    return { errors: nextErrors, isValid: Object.keys(nextErrors).length === 0, blank: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const { errors: fieldErrors, isValid, blank } = validateRows();
    setRowErrors(fieldErrors);
    if (blank) {
      toast.warning("ઓછામાં ઓછી એક આઇટમ જથ્થા સાથે ઉમેરો (Add at least one item with quantity)");
      return;
    }
    if (!isValid) {
      toast.error("લાલ બતાવેલ પંક્તિઓ સુધારો (Please fix the highlighted rows)");
      return;
    }
    // Only enforced on create — editing an existing batch changes what
    // "available" means (some milk is already committed to it).
    if (!editTarget && availableMilk !== null && totalMilk > availableMilk) {
      toast.error(`ફક્ત ${availableMilk.toFixed(2)} KG દૂધ ઉપલબ્ધ છે — આ બેચ માટે ${totalMilk.toFixed(2)} KG જોઈએ (Only ${availableMilk.toFixed(2)} KG milk is available — this batch needs ${totalMilk.toFixed(2)} KG)`);
      return;
    }
    const validRows = rows.filter((r) => r.item && Number(r.quantity) > 0);
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        date,
        items: validRows.map((r) => ({ item: r.item, quantity: Number(r.quantity) })),
        remark,
      };
      if (editTarget) {
        await productionService.update(editTarget._id, payload);
        toast.success("ઉત્પાદન એન્ટ્રી અપડેટ થઈ (Production entry updated)");
      } else {
        await productionService.create(payload);
        toast.success("ઉત્પાદન એન્ટ્રી સફળતાપૂર્વક સેવ થઈ (Production entry saved successfully)");
      }
      setDialogOpen(false);
      refetch();
      refreshMilkStock();
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
      await productionService.cancel(cancelTarget._id);
      toast.success("ઉત્પાદન એન્ટ્રી રદ થઈ (Production entry cancelled)");
      setCancelTarget(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  };

  const columns: Column<ProductionEntry>[] = [
    { header: "તારીખ (Date)", accessor: (p) => formatDate(p.date) },
    { header: "બેચ નંબર (Batch No.)", accessor: (p) => <span className="font-mono text-xs">{p.batchNo}</span> },
    {
      header: "આઇટમ (Items)",
      primary: true,
      accessor: (p) => (
        <span className="whitespace-normal">
          {p.items.map((row) => (typeof row.item === "object" && row.item ? row.item.name : "-") + ` (${row.quantity})`).join(", ")}
        </span>
      ),
    },
    { header: "વપરાયેલું દૂધ (Milk Consumed)", accessor: (p) => `${p.totalMilkConsumed.toFixed(2)} KG` },
    {
      header: "સ્થિતિ (Status)",
      accessor: (p) => <Badge tone={p.status === "active" ? "success" : "danger"}>{p.status === "active" ? "ચાલુ (Active)" : "રદ (Cancelled)"}</Badge>,
    },
    {
      header: "ક્રિયા (Actions)",
      accessor: (p) => (
        <RowActions>
          <ViewAction onClick={() => setViewing(p)} />
          {p.status === "active" && canEdit && <EditAction onClick={() => openEdit(p)} />}
          {p.status === "active" && canDelete && <CancelAction onClick={() => setCancelTarget(p)} />}
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="ઉત્પાદન એન્ટ્રી (Production Entry)"
        description="રેસિપી પ્રમાણે દૂધ સ્ટોકને તૈયાર આઇટમમાં રૂપાંતરિત કરો (Convert milk stock into finished items using item recipes)"
        actions={
          canAdd ? (
            <Button icon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
              નવી ઉત્પાદન એન્ટ્રી (New Production Entry)
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="કુલ બેચ (Total Batches)" value={summary?.count ?? 0} icon={<FiPackage className="h-5 w-5" />} tone="indigo" />
        <StatCard label="કુલ વપરાયેલું દૂધ (Total Milk Consumed)" value={`${(summary?.totalMilkConsumed ?? 0).toFixed(2)} KG`} icon={<FiDroplet className="h-5 w-5" />} tone="sky" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="બેચ નંબર, આઇટમ, સ્થિતિ, નોંધથી શોધો... (Search by batch no, item, status, remark...)" />
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onClear={() => { setFrom(""); setTo(""); setPage(1); }}
        />
      </div>

      <Table columns={columns} data={productions} keyField={(p) => p._id} loading={loading} emptyMessage="હજુ કોઈ ઉત્પાદન એન્ટ્રી નથી (No production entries yet)" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editTarget ? `બેચ ફેરફાર (Edit Batch) ${editTarget.batchNo}` : "નવી ઉત્પાદન એન્ટ્રી (New Production Entry)"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              રદ કરો (Cancel)
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editTarget ? "ફેરફાર સેવ કરો (Save Changes)" : "એન્ટ્રી સેવ કરો (Save Entry)"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <Input
              label="ઉત્પાદનની તારીખ (Production Date)"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              wrapperClassName="flex-1"
            />
            <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-sky-500">દૂધ ઉપલબ્ધ (Milk Available)</p>
              <p className="text-xl font-bold text-sky-700">
                {availableMilk === null ? "…" : `${availableMilk.toFixed(2)} KG`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">ઉત્પાદિત આઇટમ (Items Produced)</p>
            <div className="flex items-start gap-2">
              <p className="flex-[2] text-xs font-medium text-slate-500">આઇટમ (Item)</p>
              <p className="flex-1 text-xs font-medium text-slate-500">જથ્થો (Quantity)</p>
              <p className="w-24 shrink-0 text-xs font-medium text-slate-500">વપરાયેલું દૂધ (Milk Used)</p>
              <span className="w-9 shrink-0" aria-hidden="true" />
            </div>
            {rows.map((row, i) => {
              const item = itemMap[row.item];
              const consumed = item ? (Number(row.quantity) || 0) * item.recipe.milkQtyPerUnit : 0;
              return (
                <div key={i} className="flex items-start gap-2">
                  <Select
                    wrapperClassName="flex-[2]"
                    options={items.map((it) => ({ label: `${it.name} (${it.code})`, value: it._id }))}
                    value={row.item}
                    onChange={(e) => updateRow(i, { item: e.target.value })}
                    placeholder="આઇટમ પસંદ કરો (Select item)"
                    error={rowErrors[i]}
                  />
                  <Input
                    wrapperClassName="flex-1"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="જથ્થો (Quantity)"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, { quantity: e.target.value })}
                  />
                  <div className="mt-2.5 w-24 shrink-0 text-xs text-slate-400">{consumed.toFixed(2)} KG દૂધ (milk)</div>
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
              આઇટમ ઉમેરો (Add Item)
            </Button>
          </div>

          <Textarea label="નોંધ (Remark)" value={remark} onChange={(e) => setRemark(e.target.value)} />

          {(() => {
            const overLimit = !editTarget && availableMilk !== null && totalMilk > availableMilk;
            return (
              <div className={`rounded-lg p-3 ${overLimit ? "bg-red-50" : "bg-slate-50"}`}>
                <p className={`text-xs ${overLimit ? "text-red-500" : "text-slate-400"}`}>કુલ વપરાનારું દૂધ (Total Milk to be Consumed)</p>
                <p className={`text-lg font-semibold ${overLimit ? "text-red-600" : "text-slate-800"}`}>{totalMilk.toFixed(2)} KG</p>
                {overLimit && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    ઉપલબ્ધ દૂધ કરતાં {(totalMilk - (availableMilk ?? 0)).toFixed(2)} KG વધારે (Exceeds available milk by {(totalMilk - (availableMilk ?? 0)).toFixed(2)} KG)
                  </p>
                )}
              </div>
            );
          })()}
        </form>
      </Dialog>

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={`બેચ (Batch) ${viewing?.batchNo || ""}`} size="md">
        {viewing && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-500">તારીખ (Date): {formatDate(viewing.date)}</p>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {viewing.items.map((row, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span>{typeof row.item === "object" && row.item ? row.item.name : "કાઢી નાખેલ આઇટમ (Deleted item)"}</span>
                  <span className="text-slate-500">
                    {row.quantity} યુનિટ — {row.milkConsumed.toFixed(2)} KG દૂધ (units — KG milk)
                  </span>
                </div>
              ))}
            </div>
            <p className="font-semibold">કુલ વપરાયેલું દૂધ (Total Milk Consumed): {viewing.totalMilkConsumed.toFixed(2)} KG</p>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="ઉત્પાદન એન્ટ્રી રદ કરો (Cancel Production Entry)"
        description={`આ બેચ "${cancelTarget?.batchNo}" માટે દૂધ અને આઇટમ સ્ટોકની હિલચાલ પાછી આવશે. ચાલુ રાખવું છે? (This will reverse the milk and item stock movements for batch "${cancelTarget?.batchNo}". Continue?)`}
        confirmLabel="એન્ટ્રી રદ કરો (Cancel Entry)"
      />
    </div>
  );
}
