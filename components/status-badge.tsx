import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@prisma/client";

const colors: Record<OrderStatus, string> = {
  CREATED: "bg-slate-100 text-slate-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  PICKED_UP: "bg-indigo-100 text-indigo-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  OUT_FOR_DELIVERY: "bg-amber-100 text-amber-800",
  DELIVERED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={colors[status]}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
