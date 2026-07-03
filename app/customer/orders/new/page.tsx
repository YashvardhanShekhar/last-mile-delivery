"use client";

import { useState } from "react";
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

interface Quote {
  pickupZone: { name: string };
  dropZone: { name: string };
  volumetricWeight: number;
  billableWeight: number;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  isIntraZone: boolean;
}

const nav = [
  { href: "/customer", label: "My Orders" },
  { href: "/customer/orders/new", label: "New Order" },
];

export default function NewOrderPage() {
  const router = useRouter();
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
  const [loading, setLoading] = useState(false);

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
      setQuote(null);
      setError(err instanceof Error ? err.message : "Quote failed");
    }
  }

  async function confirmOrder() {
    if (!quote) return;
    setLoading(true);
    setError("");
    try {
      const payload = parseQuoteForm(form);
      const order = await api<{ id: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          pickupAddress: form.pickupAddress,
          dropAddress: form.dropAddress,
          ...payload,
        }),
      });
      router.push(`/customer/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard roles={["CUSTOMER"]}>
      <AppShell title="New Order" nav={nav}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Shipment details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="L (cm)"
                  type="number"
                  value={form.length}
                  onChange={(e) => setForm({ ...form, length: e.target.value })}
                />
                <Input
                  placeholder="B (cm)"
                  type="number"
                  value={form.breadth}
                  onChange={(e) =>
                    setForm({ ...form, breadth: e.target.value })
                  }
                />
                <Input
                  placeholder="H (cm)"
                  type="number"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                />
              </div>
              <Input
                placeholder="Actual weight (kg)"
                type="number"
                value={form.actualWeight}
                onChange={(e) =>
                  setForm({ ...form, actualWeight: e.target.value })
                }
              />
              <Select
                value={form.orderType}
                onValueChange={(v) => setForm({ ...form, orderType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Order type" />
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
                  <SelectValue placeholder="Payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREPAID">Prepaid</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={fetchQuote}>
                Calculate charge
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Charge breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!quote ? (
                <p className="text-slate-500">
                  Enter details and calculate charge before confirming.
                </p>
              ) : (
                <>
                  <p>
                    Zones: {quote.pickupZone.name} → {quote.dropZone.name}{" "}
                    {quote.isIntraZone && "(intra-zone)"}
                  </p>
                  <p>Volumetric weight: {quote.volumetricWeight} kg</p>
                  <p>Billable weight: {quote.billableWeight} kg</p>
                  <p>Base charge: ₹{quote.baseCharge.toFixed(2)}</p>
                  <p>COD surcharge: ₹{quote.codSurcharge.toFixed(2)}</p>
                  <p className="text-lg font-semibold">
                    Total: ₹{quote.totalCharge.toFixed(2)}
                  </p>
                  <Button onClick={confirmOrder} disabled={loading}>
                    {loading ? "Creating..." : "Confirm & place order"}
                  </Button>
                </>
              )}
              {error && <p className="text-red-600">{error}</p>}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
