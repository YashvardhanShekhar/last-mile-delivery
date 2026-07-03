"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { TrackingTimeline } from "@/components/tracking-timeline";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatus } from "@prisma/client";

const nav = [{ href: "/agent", label: "My Deliveries" }];

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
};

interface OrderDetail {
  id: string;
  status: OrderStatus;
  pickupAddress: string;
  dropAddress: string;
  customer: { name: string; phone: string | null };
  history: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    changedBy: { name: string; role: string };
  }[];
}

export default function AgentOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);

  function load() {
    api<OrderDetail>(`/api/orders/${id}`).then(setOrder);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus(status: OrderStatus) {
    await api(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (!order) {
    return (
      <AuthGuard roles={["AGENT"]}>
        <AppShell title="Order" nav={nav}>
          <p>Loading...</p>
        </AppShell>
      </AuthGuard>
    );
  }

  const actions = NEXT_STATUSES[order.status] || [];

  return (
    <AuthGuard roles={["AGENT"]}>
      <AppShell title={`Delivery ${order.id.slice(-8).toUpperCase()}`} nav={nav}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Shipment</CardTitle>
              <StatusBadge status={order.status} />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>Customer:</strong> {order.customer.name}
                {order.customer.phone && ` · ${order.customer.phone}`}
              </p>
              <p>
                <strong>Pickup:</strong> {order.pickupAddress}
              </p>
              <p>
                <strong>Drop:</strong> {order.dropAddress}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {actions.map((s) => (
                  <Button
                    key={s}
                    variant={s === "FAILED" ? "outline" : "default"}
                    onClick={() => updateStatus(s)}
                  >
                    Mark {s.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <TrackingTimeline history={order.history} />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
