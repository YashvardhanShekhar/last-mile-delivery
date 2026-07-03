"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { api } from "@/lib/api-client";
import { parseQuoteForm } from "@/lib/validations";
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

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/zones", label: "Zones & Areas" },
  { href: "/admin/rate-cards", label: "Rate Cards" },
  { href: "/admin/orders/new", label: "Create Order" },
];

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Quote {
  totalCharge: number;
  pickupZone: { name: string };
  dropZone: { name: string };
}

export default function AdminCreateOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState({
    pickupAddress: "",
    pickupPincode: "",
    dropAddress: "",
    dropPincode: "",
    length: "",
    breadth: "",
    height: "",
    actualWeight: "",
    orderType: "B2C",
    paymentType: "PREPAID",
  });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Customer[]>("/api/customers").then(setCustomers);
  }, []);

  async function fetchQuote() {
    setError("");
    setQuote(null);
    try {
      const payload = parseQuoteForm(form);
      const q = await api<Quote>("/api/orders/quote", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setQuote(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
    }
  }

  async function submit() {
    if (!customerId || !quote) return;
    setError("");
    try {
      const payload = parseQuoteForm(form);
      await api<{ id: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          pickupAddress: form.pickupAddress,
          dropAddress: form.dropAddress,
          ...payload,
        }),
      });
      router.push(`/admin/orders`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <AuthGuard roles={["ADMIN"]}>
      <AppShell title="Create order for customer" nav={nav}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Order on behalf of customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Pickup address"
              value={form.pickupAddress}
              onChange={(e) =>
                setForm({ ...form, pickupAddress: e.target.value })
              }
            />
            <Input
              placeholder="Pickup pincode (6 digits, e.g. 110054)"
              inputMode="numeric"
              maxLength={6}
              value={form.pickupPincode}
              onChange={(e) =>
                setForm({ ...form, pickupPincode: e.target.value })
              }
            />
            <Input
              placeholder="Drop address"
              value={form.dropAddress}
              onChange={(e) =>
                setForm({ ...form, dropAddress: e.target.value })
              }
            />
            <Input
              placeholder="Drop pincode (6 digits, e.g. 110016)"
              inputMode="numeric"
              maxLength={6}
              value={form.dropPincode}
              onChange={(e) =>
                setForm({ ...form, dropPincode: e.target.value })
              }
            />
            <div className="grid grid-cols-4 gap-2">
              <Input
                placeholder="L (cm)"
                type="number"
                min="0"
                step="0.1"
                value={form.length}
                onChange={(e) => setForm({ ...form, length: e.target.value })}
              />
              <Input
                placeholder="B (cm)"
                type="number"
                min="0"
                step="0.1"
                value={form.breadth}
                onChange={(e) => setForm({ ...form, breadth: e.target.value })}
              />
              <Input
                placeholder="H (cm)"
                type="number"
                min="0"
                step="0.1"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
              <Input
                placeholder="Weight (kg)"
                type="number"
                min="0"
                step="0.1"
                value={form.actualWeight}
                onChange={(e) =>
                  setForm({ ...form, actualWeight: e.target.value })
                }
              />
            </div>
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
            <Select
              value={form.paymentType}
              onValueChange={(v) => setForm({ ...form, paymentType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PREPAID">Prepaid</SelectItem>
                <SelectItem value="COD">COD</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Sample pincodes: 110054 (North), 110016 (South), 110092 (East)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchQuote}>
                Get quote
              </Button>
              <Button onClick={submit} disabled={!quote || !customerId}>
                Create order
              </Button>
            </div>
            {quote && (
              <p className="text-sm">
                {quote.pickupZone.name} → {quote.dropZone.name}: ₹
                {quote.totalCharge.toFixed(2)}
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
