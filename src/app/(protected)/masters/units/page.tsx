"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validateMinLength } from "@/lib/validators";

export default function UnitsPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_UNITS}
      module="unit"
      title="Units"
      singularLabel="Unit"
      description="Manage measurement units (KG, Litre, Nos, Packet)"
      addLabel="Add Unit"
      searchPlaceholder="Search units..."
      fields={[
        {
          name: "name",
          label: "Unit Name",
          required: true,
          placeholder: "e.g. Kilogram",
          validate: (v) => validateMinLength(v.trim(), 2, "Unit name"),
        },
        { name: "shortCode", label: "Short Code", required: true, placeholder: "e.g. KG" },
        {
          name: "sizeUnit",
          label: "Size Measurement",
          type: "select",
          options: [
            { label: "None (no sizes)", value: "" },
            { label: "Millilitres (ml)", value: "ml" },
            { label: "Litres (L)", value: "L" },
            { label: "Grams (g)", value: "g" },
            { label: "Kilograms (kg)", value: "kg" },
          ],
          hint: "Set this for a packaging unit like Bottle or Packet — it's what lets an Item pick a size below.",
        },
        {
          name: "sizes",
          label: "Available Sizes",
          span: 2,
          placeholder: "e.g. 100ml, 200ml, 500ml",
          hint: "Comma-separated. Only used when a Size Measurement is set above.",
        },
      ]}
      displayColumns={[
        { header: "Name", render: (row) => <span className="font-medium text-slate-900">{String(row.name)}</span> },
        { header: "Short Code", render: (row) => String(row.shortCode) },
        { header: "Sizes", render: (row) => (row.sizes ? String(row.sizes) : "-") },
      ]}
    />
  );
}
