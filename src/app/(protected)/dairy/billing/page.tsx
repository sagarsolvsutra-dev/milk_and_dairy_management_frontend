"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiTrash2, FiPrinter, FiDownload, FiUser, FiPhone, FiShoppingCart, FiCheckCircle } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { billService } from "@/services/bill.service";
import { itemService } from "@/services/item.service";
import { inventoryService } from "@/services/inventory.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { validateMobile } from "@/lib/validators";
import type { Item, Bill } from "@/types";

type Row = { item: string; quantity: string; rate: string; discount: string };

const emptyRow: Row = { item: "", quantity: "1", rate: "", discount: "0" };

export default function BillingPage() {
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [dairyStock, setDairyStock] = useState<Record<string, number>>({});
  const refreshDairyStock = () => {
    // Backend scopes this to the logged-in dairy_user's own dairy automatically.
    // This builds a lookup map for every item, not a paginated view — pass a
    // high limit to get everything in one call rather than one page's worth.
    inventoryService
      .getDairyStock({ limit: 1000 })
      .then((res) => {
        const map: Record<string, number> = {};
        for (const s of res.data.data.items) map[s.item?._id || s.item] = s.currentQty;
        setDairyStock(map);
      })
      .catch(() => {});
  };
  useEffect(() => {
    itemService.listActive().then((res) => setItems(res.data.data.items)).catch(() => {});
    refreshDairyStock();
  }, []);

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i._id, i])), [items]);

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [roundOff, setRoundOff] = useState("0");
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [mobileError, setMobileError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState<Bill | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const savingRef = useRef(false);

  // Same item can appear on more than one row — combine what's actually
  // being requested per item so the stock indicator (and the over-limit
  // state) reflects the real total, not just one row in isolation.
  const requestedByItem = useMemo(() => {
    const totals: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.item && Number(r.quantity) > 0) totals[r.item] = (totals[r.item] || 0) + Number(r.quantity);
    });
    return totals;
  }, [rows]);

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const onSelectItem = (index: number, itemId: string) => {
    const item = itemMap[itemId];
    updateRow(index, { item: itemId, rate: item ? String(item.defaultSellingPrice) : "" });
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  // Mirrors bill.controller.js#createBill exactly: tax is derived per row from
  // that item's own GST slab percent (never a flat rate), rounded per row and
  // again after summing — a flat 5% here previously diverged from whatever
  // the backend actually charges/records the moment an item's slab isn't 5%.
  const computedRows = rows.map((r) => {
    const qty = Number(r.quantity) || 0;
    const rate = Number(r.rate) || 0;
    const discount = Number(r.discount) || 0;
    const amount = qty * rate - discount;
    const gstSlab = r.item ? itemMap[r.item]?.gstSlab : null;
    const gstPercent = (gstSlab && typeof gstSlab === "object" ? gstSlab.percent : 0) || 0;
    const tax = gstEnabled ? Math.round(((amount * gstPercent) / 100) * 100) / 100 : 0;
    return { ...r, amount, tax };
  });

  const itemCount = computedRows.filter((r) => r.item).length;
  const subtotal = computedRows.reduce((sum, r) => sum + r.amount, 0);
  const gstAmount = gstEnabled ? Math.round(computedRows.reduce((sum, r) => sum + r.tax, 0) * 100) / 100 : 0;
  const grandTotal = subtotal + gstAmount + (Number(roundOff) || 0);

  const resetForm = () => {
    setCustomerName("");
    setCustomerMobile("");
    setPaymentMode("Cash");
    setGstEnabled(false);
    setRoundOff("0");
    setRows([{ ...emptyRow }]);
    setRowErrors({});
    setMobileError("");
  };

  const validateRows = () => {
    const nextErrors: Record<number, string> = {};
    const filledRows = rows.filter((r) => r.item || Number(r.quantity) || Number(r.rate));
    if (!filledRows.length) return { errors: nextErrors, isValid: false, blank: true };
    rows.forEach((r, i) => {
      if (!r.item && !r.quantity && !r.rate) return;
      if (!r.item) nextErrors[i] = "Select an item";
      else if (!r.quantity || Number(r.quantity) <= 0) nextErrors[i] = "Quantity must be greater than 0";
      else if (r.rate === "" || Number(r.rate) < 0) nextErrors[i] = "Rate cannot be negative";
      else if (Number(r.discount) < 0) nextErrors[i] = "Discount cannot be negative";
      else if (Number(r.discount) > Number(r.quantity) * Number(r.rate)) nextErrors[i] = "Discount cannot exceed qty × rate";
      else if (requestedByItem[r.item] > (dairyStock[r.item] ?? 0)) {
        nextErrors[i] = `Only ${dairyStock[r.item] ?? 0} in stock`;
      }
    });
    return { errors: nextErrors, isValid: Object.keys(nextErrors).length === 0, blank: false };
  };

  const handleSave = async () => {
    if (savingRef.current) return;

    const mobileErr = customerMobile ? validateMobile(customerMobile, { required: false }) : "";
    setMobileError(mobileErr || "");

    const { errors: fieldErrors, isValid, blank } = validateRows();
    setRowErrors(fieldErrors);

    if (mobileErr) {
      toast.error(mobileErr);
      return;
    }
    if (blank) {
      toast.warning("Add at least one item to the bill");
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
      const res = await billService.create({
        customerName,
        customerMobile,
        items: validRows.map((r) => ({
          item: r.item,
          quantity: Number(r.quantity),
          rate: Number(r.rate),
          discount: Number(r.discount) || 0,
        })),
        gstEnabled,
        gstAmount,
        roundOff: Number(roundOff) || 0,
        paymentMode,
        paidAmount: grandTotal,
      });
      toast.success("Bill saved successfully");
      setSavedBill(res.data.data);
      resetForm();
      refreshDairyStock();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!savedBill) return;
    setDownloading(true);
    try {
      await billService.downloadPdf(savedBill._id, savedBill.billNo);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!savedBill) return;
    setPrinting(true);
    try {
      await billService.printPdf(savedBill._id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Counter Billing" description="Create a sales bill for a walk-in customer" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FiUser className="h-4 w-4 text-indigo-500" />
              Customer Details
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Customer Name" placeholder="Walk-in Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <Input
                label="Mobile Number (Optional)"
                icon={<FiPhone className="h-4 w-4" />}
                inputMode="numeric"
                maxLength={10}
                error={mobileError}
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FiShoppingCart className="h-4 w-4 text-indigo-500" />
                Bill Items
              </div>
              {itemCount > 0 && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                  {itemCount} item{itemCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="hidden bg-indigo-600 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-white sm:flex sm:items-center sm:gap-2">
                <p className="flex-[2]">Item</p>
                <p className="w-20 text-center">Stock</p>
                <p className="w-20 text-right">Qty</p>
                <p className="w-24 text-right">Rate</p>
                <p className="w-24 text-right">Discount</p>
                <p className="w-28 shrink-0 text-right">Amount</p>
                <span className="w-9 shrink-0" aria-hidden="true" />
              </div>

              <div className="divide-y divide-slate-100">
                {computedRows.map((row, i) => {
                  const available = row.item ? dairyStock[row.item] ?? 0 : null;
                  const requested = row.item ? requestedByItem[row.item] ?? 0 : 0;
                  const overLimit = available !== null && requested > available;
                  return (
                  <div key={i} className="flex flex-wrap items-start gap-2 px-3 py-3 sm:flex-nowrap sm:items-center">
                    <Select
                      wrapperClassName="w-full flex-[2] sm:w-auto"
                      options={items
                        // Only items this dairy actually has stock of — no
                        // point offering something that was never dispatched
                        // here, or has since sold out. The row's own current
                        // selection stays visible even at 0 so it doesn't
                        // vanish from the dropdown out from under the user.
                        .filter((it) => (dairyStock[it._id] ?? 0) > 0 || it._id === row.item)
                        .map((it) => ({ label: it.name, value: it._id }))}
                      value={row.item}
                      onChange={(e) => onSelectItem(i, e.target.value)}
                      placeholder="Select item"
                      error={rowErrors[i]}
                    />
                    <div
                      className={`flex h-9.5 w-20 shrink-0 flex-col items-center justify-center rounded-lg border px-1 text-center leading-tight ${
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
                          <span className="text-[9px] font-medium uppercase tracking-wide">
                            {available <= 0 ? "No Stock" : overLimit ? "Not Enough" : "In Stock"}
                          </span>
                        </>
                      )}
                    </div>
                    <Input
                      wrapperClassName="w-20"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => updateRow(i, { quantity: e.target.value })}
                    />
                    <Input
                      wrapperClassName="w-24"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Rate"
                      value={row.rate}
                      onChange={(e) => updateRow(i, { rate: e.target.value })}
                    />
                    <Input
                      wrapperClassName="w-24"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Discount"
                      value={row.discount}
                      onChange={(e) => updateRow(i, { discount: e.target.value })}
                    />
                    <div className="w-28 shrink-0 text-right text-sm font-semibold text-slate-800">{formatCurrency(row.amount)}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      title="Remove item"
                    >
                      <FiTrash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  );
                })}
              </div>
            </div>

            <Button type="button" variant="outline" size="sm" className="mt-3" icon={<FiPlus className="h-3.5 w-3.5" />} onClick={addRow}>
              Add Item
            </Button>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Bill Summary</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            <label className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                />
                Apply GST
              </span>
              <span className="font-medium text-slate-800">{formatCurrency(gstAmount)}</span>
            </label>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Round Off</span>
              <Input type="number" step="0.01" value={roundOff} onChange={(e) => setRoundOff(e.target.value)} wrapperClassName="w-24" />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-indigo-600 px-3.5 py-3 text-white">
              <span className="text-sm font-medium">Grand Total</span>
              <span className="text-lg font-bold">{formatCurrency(grandTotal)}</span>
            </div>

            <Select
              label="Payment Mode"
              options={[
                { label: "Cash", value: "Cash" },
                { label: "UPI", value: "UPI" },
                { label: "Card", value: "Card" },
                { label: "Credit", value: "Credit" },
              ]}
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            />
          </div>
          <Button className="mt-4 w-full" onClick={handleSave} loading={saving}>
            Save & Print
          </Button>
        </Card>
      </div>

      <Dialog open={Boolean(savedBill)} onClose={() => setSavedBill(null)} title="Bill Saved" size="sm">
        {savedBill && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
              <FiCheckCircle className="h-8 w-8 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm text-emerald-700">
                  Saved successfully.
                </p>
                <p className="text-xs text-emerald-600">{formatDate(savedBill.date)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm">
              {savedBill.customerName && (
                <div className="mb-1 flex justify-between text-slate-500">
                  <span>Customer</span>
                  <span className="font-medium text-slate-800">{savedBill.customerName}</span>
                </div>
              )}
              <div className="mb-1 flex justify-between text-slate-500">
                <span>Payment Mode</span>
                <span className="font-medium text-slate-800">{savedBill.paymentMode}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <span>Grand Total</span>
                <span>{formatCurrency(savedBill.grandTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" icon={<FiPrinter className="h-4 w-4" />} onClick={handlePrint} loading={printing}>
                Print
              </Button>
              <Button icon={<FiDownload className="h-4 w-4" />} onClick={handleDownloadPdf} loading={downloading}>
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
