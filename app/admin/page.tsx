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
  agent: { name: string } | null;
  pickupZone: { name: string };
  dropZone: { name: string };
  deliveryCharge: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api<Order[]>("/api/orders").then(setOrders);
  }, []);

  const stats = {
    total: orders.length,
    active: orders.filter((o) =>
      ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(
        o.status
      )
    ).length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    failed: orders.filter((o) => o.status === "FAILED").length,
  };

  return (
    <AuthGuard roles={["ADMIN"]}>
      <AppShell title="Admin Dashboard" nav={nav}>
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {[
            ["Total orders", stats.total],
            ["Active", stats.active],
            ["Delivered", stats.delivered],
            ["Failed", stats.failed],
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 10).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      {o.id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell>{o.customer.name}</TableCell>
                    <TableCell>
                      {o.pickupZone.name} → {o.dropZone.name}
                    </TableCell>
                    <TableCell>{o.agent?.name || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell>
                      {format(new Date(o.createdAt), "PP")}
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
