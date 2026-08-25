import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = "indigo",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "indigo" | "emerald" | "amber" | "sky" | "red";
}) {
  const toneStyles = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
    red: "bg-red-50 text-red-600",
  }[tone];

  return (
    <Card className="flex items-center gap-4">
      {icon && <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", toneStyles)}>{icon}</div>}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </Card>
  );
}
