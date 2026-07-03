"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { TrackingTimeline } from "@/components/tracking-timeline";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatus } from "@prisma/client";

interface OrderDetail {
  id: string;
  status: OrderStatus;
  pickupAddress: string;
  dropAddress: string;
  pickupPincode: string;
  dropPincode: string;
  billableWeight: number;
  volumetricWeight: number;
  actualWeight: number;
  baseCharge: number;
  codSurcharge: number;
  deliveryCharge: number;
  orderType: string;
  paymentType: string;
  rescheduleDate: string | null;
  agent: { name: string } | null;
  pickupZone: { name: string };
  dropZone: { name: string };
  history: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    changedBy: { name: string; role: string };
  }[];
}

const nav = [
  { href: "/customer", label: "My Orders" },
  { href: "/customer/orders/new", label: "New Order" },
];

export default function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    api<OrderDetail>(`/api/orders/${id}`).then(setOrder);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function reschedule() {
    if (!rescheduleDate) return;
    setLoading(true);
    setError("");
    try {
      await api(`/api/orders/${id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          rescheduleDate: new Date(rescheduleDate).toISOString(),
        }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed");
    } finally {
      setLoading(false);
    }
  }

  if (!order) {
    return (
      <AuthGuard roles={["CUSTOMER"]}>
        <AppShell title="Order tracking" nav={nav}>
          <p className="text-slate-500">Loading...</p>
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard roles={["CUSTOMER"]}>
      <AppShell title={`Order ${order.id.slice(-8).toUpperCase()}`} nav={nav}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Live status</CardTitle>
              <StatusBadge status={order.status} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>From:</strong> {order.pickupAddress} (
                {order.pickupPincode}) · {order.pickupZone.name}
              </p>
              <p>
                <strong>To:</strong> {order.dropAddress} ({order.dropPincode}) ·{" "}
                {order.dropZone.name}
              </p>
              <p>
                Weight: {order.actualWeight} kg actual / {order.volumetricWeight}{" "}
                kg volumetric → {order.billableWeight} kg billed
              </p>
              <p>
                Charge: ₹{order.baseCharge.toFixed(2)} + ₹
                {order.codSurcharge.toFixed(2)} COD = ₹
                {order.deliveryCharge.toFixed(2)}
              </p>
              <p>
                {order.orderType} · {order.paymentType}
              </p>
              {order.agent && <p>Agent: {order.agent.name}</p>}
              {order.rescheduleDate && (
                <p>
                  Rescheduled for:{" "}
                  {format(new Date(order.rescheduleDate), "PPP")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracking timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <TrackingTimeline history={order.history} />
            </CardContent>
          </Card>
        </div>

        {order.status === "FAILED" && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Reschedule delivery</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={reschedule} disabled={loading}>
                {loading ? "Saving..." : "Reschedule & reassign agent"}
              </Button>
              {error && <p className="w-full text-sm text-red-600">{error}</p>}
            </CardContent>
          </Card>
        )}
      </AppShell>
    </AuthGuard>
  );
}
