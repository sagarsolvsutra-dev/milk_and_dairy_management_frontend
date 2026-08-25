"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validatePercent } from "@/lib/validators";

export default function GstSlabsPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_GST_SLABS}
      module="gst_slab"
      title="GST Slabs"
      description="Manage GST percentage slabs used on items and bills"
      addLabel="Add GST Slab"
      searchPlaceholder="Search GST slabs..."
      fields={[
        {
          name: "percent",
          label: "GST %",
          type: "number",
          required: true,
          placeholder: "e.g. 18",
          min: 0,
          max: 100,
          validate: (v) => validatePercent(v, "GST %"),
        },
        { name: "label", label: "Label", placeholder: "e.g. 18% GST" },
      ]}
      displayColumns={[
        { header: "Percent", render: (row) => <span className="font-medium text-slate-900">{String(row.percent)}%</span> },
        { header: "Label", render: (row) => String(row.label || "-") },
      ]}
    />
  );
}
