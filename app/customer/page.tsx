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

interface Order {
  id: string;
  status: OrderStatus;
  pickupAddress: string;
  dropAddress: string;
  deliveryCharge: number;
  createdAt: string;
  pickupZone: { name: string };
  dropZone: { name: string };
}

const nav = [
  { href: "/customer", label: "My Orders" },
  { href: "/customer/orders/new", label: "New Order" },
];

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Order[]>("/api/orders")
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard roles={["CUSTOMER"]}>
      <AppShell title="Customer Dashboard" nav={nav}>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-slate-600">Track and manage your deliveries</p>
          <Button asChild>
            <Link href="/customer/orders/new">Place Order</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-slate-500">No orders yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Charge</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        {o.id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        {o.pickupZone.name} → {o.dropZone.name}
                      </TableCell>
                      <TableCell>₹{o.deliveryCharge.toFixed(2)}</TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(o.createdAt), "PP")}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/customer/orders/${o.id}`}>Track</Link>
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
