"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatus } from "@prisma/client";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/zones", label: "Zones & Areas" },
  { href: "/admin/rate-cards", label: "Rate Cards" },
  { href: "/admin/orders/new", label: "Create Order" },
];

interface Order {
  id: string;
  status: OrderStatus;
  customer: { name: string };
  agent: { id: string; name: string } | null;
  pickupZone: { id: string; name: string };
  dropZone: { name: string };
  deliveryCharge: number;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
}

interface Zone {
  id: string;
  name: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [zoneId, setZoneId] = useState<string>("all");
  const [agentId, setAgentId] = useState<string>("all");
  const [overrideStatus, setOverrideStatus] = useState<Record<string, string>>(
    {}
  );

  function load() {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (zoneId !== "all") params.set("zoneId", zoneId);
    if (agentId !== "all") params.set("agentId", agentId);
    const qs = params.toString();
    api<Order[]>(`/api/orders${qs ? `?${qs}` : ""}`).then(setOrders);
  }

  useEffect(() => {
    load();
    api<Agent[]>("/api/agents").then(setAgents);
    api<Zone[]>("/api/zones").then(setZones);
  }, [status, zoneId, agentId]);

  async function assign(orderId: string, selectedAgentId: string) {
    await api(`/api/orders/${orderId}/assign`, {
      method: "POST",
      body: JSON.stringify({ agentId: selectedAgentId }),
    });
    load();
  }

  async function autoAssign(orderId: string) {
    await api(`/api/orders/${orderId}/auto-assign`, { method: "POST" });
    load();
  }

  async function applyStatusOverride(orderId: string) {
    const s = overrideStatus[orderId];
    if (!s) return;
    await api(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: s }),
    });
    load();
  }

  return (
    <AuthGuard roles={["ADMIN"]}>
      <AppShell title="Order Management" nav={nav}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {[
                  "CREATED",
                  "ASSIGNED",
                  "PICKED_UP",
                  "IN_TRANSIT",
                  "OUT_FOR_DELIVERY",
                  "DELIVERED",
                  "FAILED",
                ].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Override</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/customer/orders/${o.id}`}
                        className="font-mono text-xs underline"
                      >
                        {o.id.slice(-8).toUpperCase()}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {format(new Date(o.createdAt), "PP")}
                      </p>
                    </TableCell>
                    <TableCell>{o.customer.name}</TableCell>
                    <TableCell>
                      {o.pickupZone.name} → {o.dropZone.name}
                    </TableCell>
                    <TableCell>₹{o.deliveryCharge.toFixed(2)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Select
                          onValueChange={(v) => assign(o.id, v)}
                          defaultValue={o.agent?.id}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Assign agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => autoAssign(o.id)}
                        >
                          Auto-assign
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Select
                          value={overrideStatus[o.id] || o.status}
                          onValueChange={(v) =>
                            setOverrideStatus({ ...overrideStatus, [o.id]: v })
                          }
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "CREATED",
                              "ASSIGNED",
                              "PICKED_UP",
                              "IN_TRANSIT",
                              "OUT_FOR_DELIVERY",
                              "DELIVERED",
                              "FAILED",
                            ].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => applyStatusOverride(o.id)}>
                          Set
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
