import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} style={style} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 4, cols = 4 }: { count?: number; cols?: 3 | 4 }) {
  const gridClass = cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={cn("mb-6 grid grid-cols-1 gap-4", gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

const LINE_WIDTHS = ["w-full", "w-5/6", "w-2/3", "w-3/4", "w-1/2"];

export function CardSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4", className)}>
      <Skeleton className="mb-3 h-4 w-1/3" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", LINE_WIDTHS[i % LINE_WIDTHS.length])} />
        ))}
      </div>
    </div>
  );
}

export function CardsGridSkeleton({ count = 3, lines = 4 }: { count?: number; lines?: number }) {
  const gridClass = count === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
  return (
    <div className={cn("grid grid-cols-1 gap-6", gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}

// Mimics Table.tsx's own busy-state skeleton rows, for pages that need the
// same look before a <Table> has even mounted (e.g. behind a full-page
// loading gate that also blocks the header/stat cards around it).
export function TableBlockSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="h-11 bg-indigo-600/20" />
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex h-14 items-center gap-4 px-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" style={{ animationDelay: `${(r * cols + c) * 30}ms` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// For a plain list-style block (rows of label/value pairs) rather than a
// full <Table> — e.g. a movement-history feed inside a Card.
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100 border-t border-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3.5 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ heightClass = "h-64" }: { heightClass?: string }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4", heightClass)}>
      <Skeleton className="mb-4 h-3.5 w-1/3" />
      <div className="flex h-[calc(100%-1.75rem)] items-end gap-2">
        {[40, 65, 50, 80, 55, 70, 45, 60].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ChartsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <ChartSkeleton key={i} heightClass="h-56" />
      ))}
    </div>
  );
}

// The whole app shell (sidebar + topbar + content) — used while auth state
// is still hydrating, before we even know which role's layout to show.
export function AppShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      <div className="hidden w-72 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <PageHeaderSkeleton />
          <StatCardsSkeleton count={4} />
          <CardsGridSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}

// A detail page's full shape (back-link + header + stat cards + a table) —
// used behind the loading gate on pages like the vendor ledger or dairy
// inventory detail, before the record they're about has loaded at all.
export function DetailPageSkeleton({
  statCount = 3,
  statCols = 3,
  tableRows = 6,
  tableCols = 4,
}: {
  statCount?: number;
  statCols?: 3 | 4;
  tableRows?: number;
  tableCols?: number;
}) {
  return (
    <div>
      <Skeleton className="mb-3 h-4 w-32" />
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={statCount} cols={statCols} />
      <TableBlockSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}
