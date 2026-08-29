"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiShoppingBag, FiDollarSign, FiCheckCircle, FiClock } from "react-icons/fi";
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
import { RowActions, ViewAction, EditAction, CancelAction } from "@/components/ui/RowActions";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api";
import { purchaseService } from "@/services/purchase.service";
import { vendorService } from "@/services/vendor.service";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/utils";
import { validateRequired, validatePositiveNumber, validateNonNegativeNumber, runValidation } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import type { PurchaseEntry, Vendor } from "@/types";

const emptyForm = {
  date: toDateInputValue(new Date()),
  vendor: "",
  quantity: "",
  unit: "KG",
  rate: "",
  fatDegree: "",
  otherCharges: "0",
  paidAmount: "0",
  paymentMode: "Cash",
  dueDate: "",
  remark: "",
};

export default function PurchasesPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("purchase", "add");
  const canEdit = hasPermission("purchase", "edit");
  const canDelete = hasPermission("purchase", "delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  type PurchaseSummary = { count: number; totalQuantity: number; totalNetPayable: number; totalPaid: number; totalBalance: number };
  const { items, total, pages, summary, loading, refetch } = usePaginatedList<PurchaseEntry, PurchaseSummary>("/purchases", {
    search,
    page,
    extraParams: { from, to },
  });

  const [vendors, setVendors] = useState<Vendor[]>([]);
  useEffect(() => {
    vendorService.listActive().then((res) => setVendors(res.data.data.items)).catch(() => {});
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PurchaseEntry | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [viewing, setViewing] = useState<PurchaseEntry | null>(null);

  const [editTarget, setEditTarget] = useState<PurchaseEntry | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const savingRef = useRef(false);
  const editSavingRef = useRef(false);
  const cancellingRef = useRef(false);

  const editTotals = useMemo(() => {
    const qty = Number(editForm.quantity) || 0;
    const rate = Number(editForm.rate) || 0;
    const other = Number(editForm.otherCharges) || 0;
    const paid = Number(editForm.paidAmount) || 0;
    const totalAmount = qty * rate;
    const netPayable = totalAmount + other;
    const balance = netPayable - paid;
    return { totalAmount, netPayable, balance };
  }, [editForm.quantity, editForm.rate, editForm.otherCharges, editForm.paidAmount]);

  const totals = useMemo(() => {
    const qty = Number(form.quantity) || 0;
    const rate = Number(form.rate) || 0;
    const other = Number(form.otherCharges) || 0;
    const paid = Number(form.paidAmount) || 0;
    const totalAmount = qty * rate;
    const netPayable = totalAmount + other;
    const balance = netPayable - paid;
    return { totalAmount, netPayable, balance };
  }, [form.quantity, form.rate, form.otherCharges, form.paidAmount]);

  const openCreate = () => {
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () =>
    runValidation({
      vendor: () => validateRequired(form.vendor, "Vendor"),
      quantity: () => validatePositiveNumber(form.quantity, "Quantity"),
      rate: () => validatePositiveNumber(form.rate, "Rate"),
      otherCharges: () => validateNonNegativeNumber(form.otherCharges, "Other charges"),
      paidAmount: () => {
        const nonNeg = validateNonNegativeNumber(form.paidAmount, "Paid amount");
        if (nonNeg) return nonNeg;
        if (Number(form.paidAmount) > totals.netPayable) return "ચૂકવેલ રકમ ચૂકવવાપાત્ર રકમ કરતાં વધારે ન હોઈ શકે (Paid amount cannot exceed net payable)";
        return undefined;
      },
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const { errors: fieldErrors, isValid } = validate();
    setErrors(fieldErrors);
    if (!isValid) {
      toast.error("લાલ બતાવેલ ખાનાં સુધારો (Please fix the highlighted fields)");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await purchaseService.create({
        date: form.date,
        vendor: form.vendor,
        quantity: Number(form.quantity),
        unit: form.unit,
        rate: Number(form.rate),
        fatDegree: form.fatDegree ? Number(form.fatDegree) : null,
        otherCharges: Number(form.otherCharges) || 0,
        paidAmount: Number(form.paidAmount) || 0,
        paymentMode: form.paymentMode,
        dueDate: form.dueDate || null,
        remark: form.remark,
      });
      toast.success("ખરીદી એન્ટ્રી સફળતાપૂર્વક સેવ થઈ (Purchase entry saved successfully)");
      setDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const openEdit = (p: PurchaseEntry) => {
    setEditTarget(p);
    setEditErrors({});
    setEditForm({
      date: toDateInputValue(p.date),
      vendor: typeof p.vendor === "object" && p.vendor ? p.vendor._id : (p.vendor as string) || "",
      quantity: String(p.quantity),
      unit: p.unit,
      rate: String(p.rate),
      fatDegree: p.fatDegree != null ? String(p.fatDegree) : "",
      otherCharges: String(p.otherCharges),
      paidAmount: String(p.paidAmount),
      paymentMode: p.paymentMode,
      dueDate: p.dueDate ? toDateInputValue(p.dueDate) : "",
      remark: p.remark || "",
    });
  };

  const editValidate = () =>
    runValidation({
      vendor: () => validateRequired(editForm.vendor, "Vendor"),
      quantity: () => validatePositiveNumber(editForm.quantity, "Quantity"),
      rate: () => validatePositiveNumber(editForm.rate, "Rate"),
      otherCharges: () => validateNonNegativeNumber(editForm.otherCharges, "Other charges"),
      paidAmount: () => {
        const nonNeg = validateNonNegativeNumber(editForm.paidAmount, "Paid amount");
        if (nonNeg) return nonNeg;
        if (Number(editForm.paidAmount) > editTotals.netPayable) return "ચૂકવેલ રકમ ચૂકવવાપાત્ર રકમ કરતાં વધારે ન હોઈ શકે (Paid amount cannot exceed net payable)";
        return undefined;
      },
    });

  const handleEditSave = async () => {
    if (!editTarget || editSavingRef.current) return;
    const { errors: fieldErrors, isValid } = editValidate();
    setEditErrors(fieldErrors);
    if (!isValid) {
      toast.error("લાલ બતાવેલ ખાનાં સુધારો (Please fix the highlighted fields)");
      return;
    }
    editSavingRef.current = true;
    setEditSaving(true);
    try {
      await purchaseService.update(editTarget._id, {
        date: editForm.date,
        vendor: editForm.vendor,
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
        rate: Number(editForm.rate),
        fatDegree: editForm.fatDegree ? Number(editForm.fatDegree) : null,
        otherCharges: Number(editForm.otherCharges) || 0,
        paidAmount: Number(editForm.paidAmount) || 0,
        paymentMode: editForm.paymentMode,
        dueDate: editForm.dueDate || null,
        remark: editForm.remark,
      });
      toast.success("ખરીદી એન્ટ્રી અપડેટ થઈ (Purchase entry updated)");
      setEditTarget(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      editSavingRef.current = false;
      setEditSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget || cancellingRef.current) return;
    cancellingRef.current = true;
    setCancelling(true);
    try {
      await purchaseService.cancel(cancelTarget._id);
      toast.success("ખરીદી એન્ટ્રી રદ થઈ (Purchase entry cancelled)");
      setCancelTarget(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  };

  const columns: Column<PurchaseEntry>[] = [
    { header: "તારીખ (Date)", accessor: (p) => formatDate(p.date) },
    { header: "બિલ નંબર (Bill No.)", accessor: (p) => <span className="font-mono text-xs">{p.billNo}</span> },
    { header: "વેન્ડર (Vendor)", primary: true, accessor: (p) => (typeof p.vendor === "object" && p.vendor ? p.vendor.name : "-") },
    { header: "જથ્થો (Qty)", accessor: (p) => `${p.quantity} ${p.unit}` },
    { header: "ભાવ (Rate)", accessor: (p) => formatCurrency(p.rate) },
    { header: "ચૂકવવાપાત્ર (Net Payable)", accessor: (p) => formatCurrency(p.netPayable) },
    {
      header: "બાકી (Balance)",
      accessor: (p) => (
        <span className={p.balance > 0 ? "font-semibold text-red-600" : "text-emerald-600"}>{formatCurrency(p.balance)}</span>
      ),
    },
    {
      header: "સ્થિતિ (Status)",
      accessor: (p) => (
        <Badge tone={p.status === "active" ? "success" : "danger"}>{p.status === "active" ? "ચાલુ (Active)" : "રદ (Cancelled)"}</Badge>
      ),
    },
    {
      header: "ક્રિયા (Actions)",
      accessor: (p) => (
        <RowActions>
          <ViewAction onClick={() => setViewing(p)} />
          {p.status === "active" && canEdit && <EditAction onClick={() => openEdit(p)} />}
          {p.status === "active" && canDelete && <CancelAction title="એન્ટ્રી રદ કરો (Cancel entry)" onClick={() => setCancelTarget(p)} />}
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="દૂધ ખરીદી એન્ટ્રી (Milk Purchase Entry)"
        description="વેન્ડર પાસેથી રોજની દૂધ ખરીદી નોંધો (Record daily milk purchases from vendors)"
        actions={
          canAdd ? (
            <Button icon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
              નવી ખરીદી એન્ટ્રી (New Purchase Entry)
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="કુલ ખરીદી (Total Purchases)" value={summary?.count ?? 0} icon={<FiShoppingBag className="h-5 w-5" />} tone="indigo" />
        <StatCard label="કુલ રકમ (Total Amount)" value={formatCurrency(summary?.totalNetPayable)} icon={<FiDollarSign className="h-5 w-5" />} tone="sky" />
        <StatCard label="ચૂકવેલ રકમ (Paid Amount)" value={formatCurrency(summary?.totalPaid)} icon={<FiCheckCircle className="h-5 w-5" />} tone="emerald" />
        <StatCard label="બાકી રકમ (Pending Amount)" value={formatCurrency(summary?.totalBalance)} icon={<FiClock className="h-5 w-5" />} tone="red" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="બિલ નંબર, વેન્ડર, સ્થિતિથી શોધો... (Search by bill no, vendor, status...)"
        />
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onClear={() => { setFrom(""); setTo(""); setPage(1); }}
        />
      </div>

      <Table columns={columns} data={items} keyField={(p) => p._id} loading={loading} emptyMessage="હજુ કોઈ ખરીદી એન્ટ્રી નથી (No purchase entries yet)" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="નવી દૂધ ખરીદી એન્ટ્રી (New Milk Purchase Entry)"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              રદ કરો (Cancel)
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              એન્ટ્રી સેવ કરો (Save Entry)
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="ખરીદીની તારીખ (Purchase Date)" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select
            label="વેન્ડર (Vendor)"
            required
            error={errors.vendor}
            options={vendors.map((v) => ({ label: v.name, value: v._id }))}
            value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })}
          />
          <Select
            label="એકમ (Unit)"
            options={[{ label: "KG", value: "KG" }, { label: "લિટર (Litre)", value: "Litre" }]}
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="જથ્થો (Quantity)"
            type="number"
            step="0.01"
            min="0.01"
            required
            error={errors.quantity}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <Input
            label="ભાવ - પ્રતિ એકમ (Rate per unit)"
            type="number"
            step="0.01"
            min="0.01"
            required
            error={errors.rate}
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
          />
          <Input
            label="ફેટ / ડિગ્રી - વૈકલ્પિક (Fat / Degree, optional)"
            type="number"
            step="0.01"
            value={form.fatDegree}
            onChange={(e) => setForm({ ...form, fatDegree: e.target.value })}
          />
          <Input
            label="અન્ય ચાર્જ (Other Charges)"
            type="number"
            step="0.01"
            min="0"
            error={errors.otherCharges}
            value={form.otherCharges}
            onChange={(e) => setForm({ ...form, otherCharges: e.target.value })}
          />
          <Input
            label="ચૂકવેલ રકમ (Paid Amount)"
            type="number"
            step="0.01"
            min="0"
            error={errors.paidAmount}
            value={form.paidAmount}
            onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
          />
          <Select
            label="ચુકવણીની રીત (Payment Mode)"
            options={[
              { label: "રોકડ (Cash)", value: "Cash" },
              { label: "UPI", value: "UPI" },
              { label: "બેંક (Bank)", value: "Bank" },
              { label: "ચેક (Cheque)", value: "Cheque" },
            ]}
            value={form.paymentMode}
            onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
          />
          <Input label="છેલ્લી તારીખ (Due Date)" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <Textarea
            label="નોંધ (Remark)"
            className="sm:col-span-2"
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 sm:col-span-2">
            <div>
              <p className="text-xs text-slate-400">કુલ રકમ (Total Amount)</p>
              <p className="text-sm font-semibold text-slate-800">{formatCurrency(totals.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">ચૂકવવાપાત્ર (Net Payable)</p>
              <p className="text-sm font-semibold text-slate-800">{formatCurrency(totals.netPayable)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">બાકી (Balance)</p>
              <p className={`text-sm font-semibold ${totals.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={`ખરીદી બિલ (Purchase Bill) ${viewing?.billNo || ""}`} size="sm">
        {viewing && (
          <div className="space-y-2 text-sm">
            <Row label="વેન્ડર (Vendor)" value={typeof viewing.vendor === "object" && viewing.vendor ? viewing.vendor.name : "-"} />
            <Row label="તારીખ (Date)" value={formatDate(viewing.date)} />
            <Row label="જથ્થો (Quantity)" value={`${viewing.quantity} ${viewing.unit}`} />
            <Row label="ભાવ (Rate)" value={formatCurrency(viewing.rate)} />
            <Row label="કુલ રકમ (Total Amount)" value={formatCurrency(viewing.totalAmount)} />
            <Row label="અન્ય ચાર્જ (Other Charges)" value={formatCurrency(viewing.otherCharges)} />
            <Row label="ચૂકવવાપાત્ર (Net Payable)" value={formatCurrency(viewing.netPayable)} />
            <Row label="ચૂકવેલ (Paid)" value={formatCurrency(viewing.paidAmount)} />
            <Row label="બાકી (Balance)" value={formatCurrency(viewing.balance)} />
            <Row label="ચુકવણીની રીત (Payment Mode)" value={viewing.paymentMode} />
            {viewing.remark && <Row label="નોંધ (Remark)" value={viewing.remark} />}
          </div>
        )}
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={`ખરીદી બિલ ફેરફાર (Edit Purchase Bill) ${editTarget?.billNo || ""}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              રદ કરો (Cancel)
            </Button>
            <Button onClick={handleEditSave} loading={editSaving}>
              ફેરફાર સેવ કરો (Save Changes)
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="ખરીદીની તારીખ (Purchase Date)"
            type="date"
            required
            value={editForm.date}
            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
          />
          <Select
            label="વેન્ડર (Vendor)"
            required
            error={editErrors.vendor}
            options={vendors.map((v) => ({ label: v.name, value: v._id }))}
            value={editForm.vendor}
            onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
          />
          <Select
            label="એકમ (Unit)"
            options={[{ label: "KG", value: "KG" }, { label: "લિટર (Litre)", value: "Litre" }]}
            value={editForm.unit}
            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
          />
          <Input
            label="જથ્થો (Quantity)"
            type="number"
            step="0.01"
            min="0.01"
            required
            error={editErrors.quantity}
            value={editForm.quantity}
            onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
          />
          <Input
            label="ભાવ - પ્રતિ એકમ (Rate per unit)"
            type="number"
            step="0.01"
            min="0.01"
            required
            error={editErrors.rate}
            value={editForm.rate}
            onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
          />
          <Input
            label="ફેટ / ડિગ્રી - વૈકલ્પિક (Fat / Degree, optional)"
            type="number"
            step="0.01"
            value={editForm.fatDegree}
            onChange={(e) => setEditForm({ ...editForm, fatDegree: e.target.value })}
          />
          <Input
            label="અન્ય ચાર્જ (Other Charges)"
            type="number"
            step="0.01"
            min="0"
            error={editErrors.otherCharges}
            value={editForm.otherCharges}
            onChange={(e) => setEditForm({ ...editForm, otherCharges: e.target.value })}
          />
          <Input
            label="ચૂકવેલ રકમ (Paid Amount)"
            type="number"
            step="0.01"
            min="0"
            error={editErrors.paidAmount}
            value={editForm.paidAmount}
            onChange={(e) => setEditForm({ ...editForm, paidAmount: e.target.value })}
          />
          <Select
            label="ચુકવણીની રીત (Payment Mode)"
            options={[
              { label: "રોકડ (Cash)", value: "Cash" },
              { label: "UPI", value: "UPI" },
              { label: "બેંક (Bank)", value: "Bank" },
              { label: "ચેક (Cheque)", value: "Cheque" },
            ]}
            value={editForm.paymentMode}
            onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
          />
          <Input
            label="છેલ્લી તારીખ (Due Date)"
            type="date"
            value={editForm.dueDate}
            onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
          />
          <Textarea
            label="નોંધ (Remark)"
            className="sm:col-span-2"
            value={editForm.remark}
            onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 sm:col-span-2">
            <div>
              <p className="text-xs text-slate-400">કુલ રકમ (Total Amount)</p>
              <p className="text-sm font-semibold text-slate-800">{formatCurrency(editTotals.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">ચૂકવવાપાત્ર (Net Payable)</p>
              <p className="text-sm font-semibold text-slate-800">{formatCurrency(editTotals.netPayable)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">બાકી (Balance)</p>
              <p className={`text-sm font-semibold ${editTotals.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatCurrency(editTotals.balance)}
              </p>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="ખરીદી એન્ટ્રી રદ કરો (Cancel Purchase Entry)"
        description={`આ બિલ "${cancelTarget?.billNo}" માટે દૂધ સ્ટોક અને વેન્ડર બાકી પાછું આવશે. ચાલુ રાખવું છે? (This will reverse the milk stock and vendor balance for bill "${cancelTarget?.billNo}". Continue?)`}
        confirmLabel="એન્ટ્રી રદ કરો (Cancel Entry)"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
