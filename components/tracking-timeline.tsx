import { OrderStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";

interface HistoryEntry {
  id: string;
  status: OrderStatus;
  createdAt: string;
  changedBy: { name: string; role: string };
}

export function TrackingTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6">
      {history.map((entry, i) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-slate-900 ring-4 ring-white" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} />
            <span className="text-xs text-slate-500">
              {format(new Date(entry.createdAt), "PPp")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Updated by {entry.changedBy.name} ({entry.changedBy.role})
          </p>
          {i === history.length - 1 && (
            <p className="mt-1 text-xs font-medium text-emerald-600">
              Current status
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
