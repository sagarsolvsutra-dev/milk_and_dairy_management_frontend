"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validatePercent } from "@/lib/validators";

export default function GstSlabsPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_GST_SLABS}
      module="gst_slab"
      title="GST સ્લેબ (GST Slabs)"
      singularLabel="GST સ્લેબ (GST Slab)"
      description="વસ્તુઓ અને બિલ પર વપરાતા GST ટકાવારી સ્લેબ સંભાળો (Manage GST percentage slabs used on items and bills)"
      addLabel="GST સ્લેબ ઉમેરો (Add GST Slab)"
      searchPlaceholder="GST સ્લેબ શોધો... (Search GST slabs...)"
      fields={[
        {
          name: "percent",
          label: "ટકા (%) (GST %)",
          type: "number",
          required: true,
          placeholder: "દા.ત. 18 (e.g. 18)",
          min: 0,
          max: 100,
          validate: (v) => validatePercent(v, "GST %"),
        },
        { name: "label", label: "લેબલ (Label)", placeholder: "દા.ત. 18% GST (e.g. 18% GST)" },
      ]}
      displayColumns={[
        { header: "ટકા (%) (Percent)", render: (row) => <span className="font-medium text-slate-900">{String(row.percent)}%</span> },
        { header: "લેબલ (Label)", render: (row) => String(row.label || "-") },
      ]}
    />
  );
}
