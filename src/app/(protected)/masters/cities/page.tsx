"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validateMinLength } from "@/lib/validators";

export default function CitiesPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_CITIES}
      module="city"
      title="Cities"
      singularLabel="City"
      description="Manage cities and villages used for vendor addresses"
      addLabel="Add City"
      searchPlaceholder="Search cities..."
      fields={[
        {
          name: "name",
          label: "City / Village Name",
          required: true,
          validate: (v) => validateMinLength(v.trim(), 2, "City name"),
        },
        { name: "state", label: "State" },
      ]}
      displayColumns={[
        { header: "Name", render: (row) => <span className="font-medium text-slate-900">{String(row.name)}</span> },
        { header: "State", render: (row) => String(row.state || "-") },
      ]}
    />
  );
}
