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
  areas: { id: string; name: string; pincode: string }[];
}

export default function AdminZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [areaForm, setAreaForm] = useState({
    zoneId: "",
    name: "",
    pincode: "",
  });

  function load() {
    api<Zone[]>("/api/zones").then(setZones);
  }

  useEffect(() => {
    load();
  }, []);

  async function addZone() {
    await api("/api/zones", {
      method: "POST",
      body: JSON.stringify({ name: zoneName }),
    });
    setZoneName("");
    load();
  }

  async function addArea() {
    await api("/api/areas", { method: "POST", body: JSON.stringify(areaForm) });
    setAreaForm({ zoneId: areaForm.zoneId, name: "", pincode: "" });
    load();
  }

  async function removeArea(id: string) {
    await api(`/api/areas/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AuthGuard roles={["ADMIN"]}>
      <AppShell title="Zones & Areas" nav={nav}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create zone</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Zone name"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
              <Button onClick={addZone}>Add</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assign area to zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select
                value={areaForm.zoneId}
                onValueChange={(v) =>
                  setAreaForm({ ...areaForm, zoneId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Area name"
                value={areaForm.name}
                onChange={(e) =>
                  setAreaForm({ ...areaForm, name: e.target.value })
                }
              />
              <Input
                placeholder="Pincode"
                value={areaForm.pincode}
                onChange={(e) =>
                  setAreaForm({ ...areaForm, pincode: e.target.value })
                }
              />
              <Button onClick={addArea}>Add area</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 space-y-4">
          {zones.map((z) => (
            <Card key={z.id}>
              <CardHeader>
                <CardTitle>{z.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {z.areas.length === 0 ? (
                  <p className="text-sm text-slate-500">No areas mapped.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {z.areas.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded border px-3 py-2"
                      >
                        <span>
                          {a.name} · {a.pincode}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeArea(a.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
