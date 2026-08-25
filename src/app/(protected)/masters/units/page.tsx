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
      ]}
      displayColumns={[
        { header: "Name", render: (row) => <span className="font-medium text-slate-900">{String(row.name)}</span> },
        { header: "Short Code", render: (row) => String(row.shortCode) },
      ]}
    />
  );
}
