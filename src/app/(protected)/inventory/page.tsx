"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiDroplet, FiPackage, FiCheckCircle, FiAlertTriangle, FiChevronRight, FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { inventoryService } from "@/services/inventory.service";
import { itemService } from "@/services/item.service";
import { dairyService } from "@/services/dairy.service";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { formatNumber, formatDate } from "@/lib/utils";
import { validateRequired, runValidation } from "@/lib/validators";
import type { StockItem, Item, Dairy } from "@/types";

type AdjustmentRow = {
  _id: string;
  date: string;
  stockType: "central_item" | "dairy_item";
  item: { _id: string; name: string; code: string } | null;
  dairy: { _id: string; name: string; code: string } | null;
  quantity: number;
  reason: string;
  adjustedBy: { name: string } | null;
};

const emptyAdjustment = { stockType: "central_item" as "central_item" | "dairy_item", dairy: "", item: "", quantity: "", reason: "" };

type ReconciliationRow = {
  item: { _id: string; name: string; code: string };
  totalProduced: number;
  totalDispatched: number;
  centralStock: number;
  dairyStock: number;
  totalSold: number;
  accountedFor: number;
  balanced: boolean;
};

export default function InventoryPage() {
  const toast = useToast();
  const [milkStock, setMilkStock] = useState(0);
  const [comparison, setComparison] = useState<{ dairy: { _id: string; name: string; code: string }; totalStock: number; itemCount: number }[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    Promise.all([inventoryService.getMilkStock(), inventoryService.getDairyComparison()])
      .then(([milk, comp]) => {
        setMilkStock(milk.data.data.currentQty);
        setComparison(comp.data.data);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setSummaryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [stockSearch, setStockSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  type StockSummary = { lowStockCount: number };
  const {
    items: centralStock,
    total: stockTotal,
    pages: stockPages,
    summary: stockSummary,
    loading: stockLoading,
    refetch: refetchCentralStock,
  } = usePaginatedList<StockItem, StockSummary>("/inventory/central-item-stock", { search: stockSearch, page: stockPage });

  const [reconPage, setReconPage] = useState(1);
  const {
    items: reconciliation,
    total: reconTotal,
    pages: reconPages,
    loading: reconLoading,
  } = usePaginatedList<ReconciliationRow>("/inventory/reconciliation", { page: reconPage });

  const [adjPage, setAdjPage] = useState(1);
  const {
    items: adjustments,
    total: adjTotal,
    pages: adjPages,
    loading: adjLoading,
    refetch: refetchAdjustments,
  } = usePaginatedList<AdjustmentRow>("/inventory/adjustments", { page: adjPage });

  const [activeItems, setActiveItems] = useState<Item[]>([]);
  const [activeDairies, setActiveDairies] = useState<Dairy[]>([]);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState(emptyAdjustment);
  const [adjustErrors, setAdjustErrors] = useState<Record<string, string>>({});
  const [adjustSaving, setAdjustSaving] = useState(false);
  const adjustSavingRef = useRef(false);

  const openAdjustDialog = () => {
    setAdjustForm(emptyAdjustment);
    setAdjustErrors({});
    setAdjustDialogOpen(true);
    if (!activeItems.length) itemService.listActive().then((res) => setActiveItems(res.data.data.items)).catch(() => {});
    if (!activeDairies.length) dairyService.listActive().then((res) => setActiveDairies(res.data.data.items)).catch(() => {});
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustSavingRef.current) return;

    const { errors: fieldErrors, isValid } = runValidation({
      item: () => validateRequired(adjustForm.item, "Item"),
      dairy: () => (adjustForm.stockType === "dairy_item" ? validateRequired(adjustForm.dairy, "Dairy") : undefined),
      quantity: () => {
        if (!adjustForm.quantity) return "Quantity is required";
        if (Number.isNaN(Number(adjustForm.quantity))) return "Quantity must be a number";
        if (Number(adjustForm.quantity) === 0) return "Quantity must not be zero";
        return undefined;
      },
      reason: () => validateRequired(adjustForm.reason, "Reason"),
    });
    setAdjustErrors(fieldErrors);
    if (!isValid) {
      toast.error("લાલ બતાવેલ ખાનાં સુધારો (Please fix the highlighted fields)");
      return;
    }

    adjustSavingRef.current = true;
    setAdjustSaving(true);
    try {
      await inventoryService.createAdjustment({
        stockType: adjustForm.stockType,
        dairy: adjustForm.stockType === "dairy_item" ? adjustForm.dairy : undefined,
        item: adjustForm.item,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason,
      });
      toast.success("સ્ટોક ગોઠવણ સેવ થઈ (Stock adjustment recorded)");
      setAdjustDialogOpen(false);
      refetchAdjustments();
      refetchCentralStock();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      adjustSavingRef.current = false;
      setAdjustSaving(false);
    }
  };

  const adjustmentColumns: Column<AdjustmentRow>[] = [
    { header: "તારીખ (Date)", accessor: (r) => formatDate(r.date) },
    {
      header: "આઇટમ (Item)",
      primary: true,
      accessor: (r) => (r.item ? r.item.name : "કાઢી નાખેલ આઇટમ (Deleted item)"),
    },
    {
      header: "પ્રકાર (Type)",
      accessor: (r) => (r.stockType === "central_item" ? "મુખ્ય (Central)" : "ડેરી (Dairy)"),
    },
    { header: "ડેરી (Dairy)", accessor: (r) => r.dairy?.name || "-" },
    {
      header: "જથ્થો (Quantity)",
      accessor: (r) => (
        <span className={r.quantity > 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
          {r.quantity > 0 ? "+" : ""}
          {r.quantity}
        </span>
      ),
    },
    { header: "કારણ (Reason)", accessor: (r) => r.reason },
    { header: "કોણે ગોઠવ્યું (Adjusted By)", accessor: (r) => r.adjustedBy?.name || "-" },
  ];

  const columns: Column<StockItem>[] = [
    { header: "આઇટમ (Item)", accessor: (s) => <span className="font-medium text-slate-900">{s.item?.name}</span> },
    { header: "કોડ (Code)", accessor: (s) => <span className="font-mono text-xs text-slate-500">{s.item?.code}</span> },
    { header: "હાલનો સ્ટોક (Current Stock)", accessor: (s) => formatNumber(s.currentQty) },
    { header: "ઓછામાં ઓછો સ્ટોક (Min. Alert)", accessor: (s) => s.item?.minStockAlert ?? 0 },
    {
      header: "સ્થિતિ (Status)",
      accessor: (s) =>
        s.currentQty <= (s.item?.minStockAlert ?? 0) ? (
          <Badge tone="danger">ઓછો સ્ટોક (Low Stock)</Badge>
        ) : (
          <Badge tone="success">પૂરતો (Healthy)</Badge>
        ),
    },
  ];

  const reconciliationColumns: Column<ReconciliationRow>[] = [
    { header: "આઇટમ (Item)", accessor: (r) => <span className="font-medium text-slate-900">{r.item.name}</span> },
    { header: "કુલ ઉત્પાદન (Total Produced)", accessor: (r) => formatNumber(r.totalProduced) },
    { header: "કુલ ડિસ્પેચ (Total Dispatched)", accessor: (r) => formatNumber(r.totalDispatched) },
    { header: "મુખ્ય સ્ટોક (Central Stock)", accessor: (r) => formatNumber(r.centralStock) },
    { header: "ડેરીઓનો સ્ટોક (Dairies' Stock)", accessor: (r) => formatNumber(r.dairyStock) },
    { header: "કુલ વેચેલ (Total Sold)", accessor: (r) => formatNumber(r.totalSold) },
    {
      header: "ગણતરીમાં લેવાયેલ (Accounted For)",
      accessor: (r) => (
        <span className="font-medium">
          {formatNumber(r.centralStock)} + {formatNumber(r.dairyStock)} + {formatNumber(r.totalSold)} ={" "}
          {formatNumber(r.accountedFor)}
        </span>
      ),
    },
    {
      header: "બેલેન્સ ચકાસણી (Balance Check)",
      accessor: (r) =>
        r.balanced ? (
          <Badge tone="success">
            <span className="flex items-center gap-1">
              <FiCheckCircle className="h-3 w-3" /> મેળ ખાય છે (Matched)
            </span>
          </Badge>
        ) : (
          <Badge tone="danger">
            <span className="flex items-center gap-1">
              <FiAlertTriangle className="h-3 w-3" /> મેળ ખાતું નથી (Mismatch)
            </span>
          </Badge>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="મુખ્ય સ્ટોક નિયંત્રણ (Central Inventory Control)"
        description="એડમિન-સાઇડ સ્ટોક — દૂધ, આઇટમ અને ડેરી ફાળવણી (Admin-side stock across milk, items, and dairy allocations)"
        actions={
          <Button icon={<FiPlus className="h-4 w-4" />} onClick={openAdjustDialog}>
            સ્ટોક ગોઠવો (Adjust Stock)
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="હાલનો દૂધનો સ્ટોક (Current Milk Stock)" value={`${formatNumber(milkStock)} KG`} icon={<FiDroplet className="h-5 w-5" />} tone="sky" />
        <StatCard label="સ્ટોકમાં આઇટમ SKU (Item SKUs in Stock)" value={stockTotal} icon={<FiPackage className="h-5 w-5" />} tone="indigo" />
        <StatCard label="ઓછો સ્ટોક ધરાવતી આઇટમ (Low Stock Items)" value={stockSummary?.lowStockCount ?? 0} tone="red" />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">મુખ્ય આઇટમ સ્ટોક (Central Item Stock)</h2>
      <div className="mb-4">
        <SearchInput
          value={stockSearch}
          onChange={(v) => {
            setStockSearch(v);
            setStockPage(1);
          }}
          placeholder="આઇટમના નામ કે કોડથી શોધો... (Search by item name or code...)"
        />
      </div>
      <Card className="mb-2 p-0">
        <Table columns={columns} data={centralStock} keyField={(s) => s._id} loading={stockLoading} emptyMessage="હજુ કોઈ આઇટમ સ્ટોક નથી (No item stock yet)" />
      </Card>
      <div className="mb-8">
        <Pagination page={stockPage} pages={stockPages} total={stockTotal} onPageChange={setStockPage} />
      </div>

      <h2 className="mb-1 text-sm font-semibold text-slate-700">ડેરી પ્રમાણે સરખામણી (Dairy-wise Comparison)</h2>
      <p className="mb-3 text-xs text-slate-400">
        ડેરી પર ક્લિક કરીને તેનો સંપૂર્ણ ઇતિહાસ જુઓ — સ્ટોક, મળેલ ડિસ્પેચ અને વેચેલા બિલ. (Click a dairy to see its full history —
        stock, dispatches received, and bills sold.)
      </p>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comparison.map((c) => (
          <Link key={c.dairy._id} href={`/inventory/dairy/${c.dairy._id}`}>
            <Card className="cursor-pointer transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.dairy.name}</p>
                  <p className="text-xs text-slate-400">{c.dairy.code}</p>
                </div>
                <FiChevronRight className="h-4 w-4 text-slate-300" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">કુલ સ્ટોક (Total Stock)</span>
                <span className="font-semibold text-slate-800">{formatNumber(c.totalStock)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-500">આઇટમ પ્રકાર (Item Types)</span>
                <span className="font-semibold text-slate-800">{c.itemCount}</span>
              </div>
            </Card>
          </Link>
        ))}
        {!summaryLoading && !comparison.length && (
          <p className="col-span-full text-sm text-slate-400">હજુ સ્ટોક ધરાવતી કોઈ ચાલુ ડેરી નથી (No active dairies with stock yet)</p>
        )}
      </div>

      <h2 className="mb-1 text-sm font-semibold text-slate-700">સ્ટોક રિકન્સિલિએશન (Stock Reconciliation)</h2>
      <p className="mb-3 text-xs text-slate-400">
        દરેક ઉત્પાદિત યુનિટ ક્યાંક તો હોવું જ જોઈએ — મુખ્ય સ્ટોક, કોઈ ડેરીનો સ્ટોક, અથવા વેચાઈ ગયેલું. આ ટેબલ સાબિત કરે છે કે
        કંઈ ગુમ થયું નથી. (Every unit ever produced must end up somewhere — Central stock, a dairy&apos;s stock, or
        already sold. This table proves nothing has gone missing.)
      </p>
      <Card className="mb-2 p-0">
        <Table
          columns={reconciliationColumns}
          data={reconciliation}
          keyField={(r) => r.item._id}
          loading={reconLoading}
          emptyMessage="હજુ કોઈ ઉત્પાદન ઇતિહાસ નથી (No production history yet)"
        />
      </Card>
      <Pagination page={reconPage} pages={reconPages} total={reconTotal} onPageChange={setReconPage} />

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-700">સ્ટોક ગોઠવણ ઇતિહાસ (Stock Adjustment History)</h2>
      <Card className="mb-2 p-0">
        <Table
          columns={adjustmentColumns}
          data={adjustments}
          keyField={(r) => r._id}
          loading={adjLoading}
          emptyMessage="હજુ કોઈ સ્ટોક ગોઠવણ નથી (No stock adjustments yet)"
        />
      </Card>
      <Pagination page={adjPage} pages={adjPages} total={adjTotal} onPageChange={setAdjPage} />

      <Dialog
        open={adjustDialogOpen}
        onClose={() => setAdjustDialogOpen(false)}
        title="સ્ટોક ગોઠવો (Adjust Stock)"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              રદ કરો (Cancel)
            </Button>
            <Button onClick={handleAdjustSubmit} loading={adjustSaving}>
              સેવ કરો (Save)
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdjustSubmit} className="grid grid-cols-1 gap-4">
          <Select
            label="પ્રકાર (Stock Type)"
            options={[
              { label: "મુખ્ય સ્ટોક (Central Stock)", value: "central_item" },
              { label: "ડેરી સ્ટોક (Dairy Stock)", value: "dairy_item" },
            ]}
            value={adjustForm.stockType}
            onChange={(e) =>
              setAdjustForm({ ...adjustForm, stockType: e.target.value as "central_item" | "dairy_item", dairy: "" })
            }
          />
          {adjustForm.stockType === "dairy_item" && (
            <Select
              label="ડેરી (Dairy)"
              required
              error={adjustErrors.dairy}
              options={activeDairies.map((d) => ({ label: d.name, value: d._id }))}
              value={adjustForm.dairy}
              onChange={(e) => setAdjustForm({ ...adjustForm, dairy: e.target.value })}
            />
          )}
          <Select
            label="આઇટમ (Item)"
            required
            error={adjustErrors.item}
            options={activeItems.map((i) => ({ label: i.name, value: i._id }))}
            value={adjustForm.item}
            onChange={(e) => setAdjustForm({ ...adjustForm, item: e.target.value })}
          />
          <Input
            label="જથ્થો (Quantity)"
            type="number"
            step="0.01"
            required
            hint="ઉમેરવા માટે ધન અંક, ઘટાડવા માટે ઋણ અંક લખો (Positive to add stock, negative to remove — e.g. -5 for spoilage/wastage)"
            error={adjustErrors.quantity}
            value={adjustForm.quantity}
            onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
          />
          <Textarea
            label="કારણ (Reason)"
            required
            placeholder="દા.ત. બગડી ગયું, ગણતરીમાં ફરક (e.g. spoilage, physical count mismatch)"
            error={adjustErrors.reason}
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
          />
        </form>
      </Dialog>
    </div>
  );
}
