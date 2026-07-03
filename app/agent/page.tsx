"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatus } from "@prisma/client";

const nav = [{ href: "/agent", label: "My Deliveries" }];

interface Order {
  id: string;
  status: OrderStatus;
  pickupAddress: string;
  dropAddress: string;
  customer: { name: string; phone: string | null };
  createdAt: string;
}

export default function AgentDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [available, setAvailable] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );

  function load() {
    api<Order[]>("/api/orders").then(setOrders);
    api<{ user: { available?: boolean } }>("/api/auth/me").then((r) =>
      setAvailable(r.user.available ?? false)
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAvailability() {
    const next = !available;
    await api("/api/agents/me/availability", {
      method: "PATCH",
      body: JSON.stringify({ available: next }),
    });
    setAvailable(next);
  }

  function updateLocation() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setLocation({ lat: latitude, lng: longitude });
      await api("/api/agents/me/location", {
        method: "PATCH",
        body: JSON.stringify({ latitude, longitude }),
      });
    });
  }

  return (
    <AuthGuard roles={["AGENT"]}>
      <AppShell title="Agent Dashboard" nav={nav}>
        <div className="mb-6 flex flex-wrap gap-3">
          <Button
            variant={available ? "default" : "outline"}
            onClick={toggleAvailability}
          >
            {available ? "Available for assignments" : "Mark as available"}
          </Button>
          <Button variant="outline" onClick={updateLocation}>
            Update GPS location
          </Button>
          {location && (
            <span className="self-center text-sm text-slate-500">
              Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assigned orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-500">No assigned orders.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Pickup → Drop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        {o.id.slice(-8).toUpperCase()}
                        <p className="text-slate-500">
                          {format(new Date(o.createdAt), "PP")}
                        </p>
                      </TableCell>
                      <TableCell>
                        {o.customer.name}
                        {o.customer.phone && (
                          <p className="text-xs">{o.customer.phone}</p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {o.pickupAddress} → {o.dropAddress}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" asChild>
                          <Link href={`/agent/orders/${o.id}`}>Update</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
