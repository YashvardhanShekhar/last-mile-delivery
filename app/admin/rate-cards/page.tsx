"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
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

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/zones", label: "Zones & Areas" },
  { href: "/admin/rate-cards", label: "Rate Cards" },
  { href: "/admin/orders/new", label: "Create Order" },
];

interface Zone {
  id: string;
  name: string;
}

interface RateCard {
  id: string;
  orderType: string;
  pricePerKg: number;
  codCharge: number;
  pickupZone: { name: string };
  dropZone: { name: string };
}

export default function AdminRateCardsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [cards, setCards] = useState<RateCard[]>([]);
  const [form, setForm] = useState({
    pickupZoneId: "",
    dropZoneId: "",
    orderType: "B2C",
    pricePerKg: "",
    codCharge: "",
  });

  function load() {
    api<Zone[]>("/api/zones").then(setZones);
    api<RateCard[]>("/api/rate-cards").then(setCards);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    await api("/api/rate-cards", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        pricePerKg: parseFloat(form.pricePerKg),
        codCharge: parseFloat(form.codCharge),
      }),
    });
    setForm({
      pickupZoneId: form.pickupZoneId,
      dropZoneId: form.dropZoneId,
      orderType: form.orderType,
      pricePerKg: "",
      codCharge: "",
    });
    load();
  }

  return (
    <AuthGuard roles={["ADMIN"]}>
      <AppShell title="Rate Cards" nav={nav}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configure rate (intra / inter-zone, B2B / B2C)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Select
              value={form.pickupZoneId}
              onValueChange={(v) => setForm({ ...form, pickupZoneId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pickup zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.dropZoneId}
              onValueChange={(v) => setForm({ ...form, dropZoneId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Drop zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.orderType}
              onValueChange={(v) => setForm({ ...form, orderType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B2C">B2C</SelectItem>
                <SelectItem value="B2B">B2B</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Price per kg (₹)"
              type="number"
              value={form.pricePerKg}
              onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })}
            />
            <Input
              placeholder="COD surcharge (₹)"
              type="number"
              value={form.codCharge}
              onChange={(e) => setForm({ ...form, codCharge: e.target.value })}
            />
            <Button onClick={create}>Save rate card</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Drop</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>₹/kg</TableHead>
                  <TableHead>COD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.pickupZone.name}</TableCell>
                    <TableCell>{c.dropZone.name}</TableCell>
                    <TableCell>{c.orderType}</TableCell>
                    <TableCell>{c.pricePerKg}</TableCell>
                    <TableCell>{c.codCharge}</TableCell>
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
