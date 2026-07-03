import { Role } from "@prisma/client";
import { prisma } from "./prisma";

/** Haversine distance in kilometers between two lat/lng points */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Approximate zone center from area pincodes (demo: use first area pincode as anchor) */
async function getZoneAnchor(zoneId: string): Promise<{ lat: number; lng: number } | null> {
  const area = await prisma.area.findFirst({
    where: { zoneId },
    orderBy: { pincode: "asc" },
  });
  if (!area) return null;
  // Derive pseudo-coordinates from pincode for demo assignment when agents lack GPS
  const pin = parseInt(area.pincode, 10);
  return {
    lat: 28 + (pin % 1000) / 10000,
    lng: 77 + Math.floor(pin / 1000) / 100,
  };
}

export interface AssignmentResult {
  agentId: string;
  agentName: string;
  distanceKm: number;
  method: "nearest_gps" | "zone_match" | "fallback";
}

/**
 * Auto-assign the nearest available delivery agent.
 * Priority: available agents with GPS near pickup anchor → agents in same pickup zone → any available agent.
 */
export async function findNearestAvailableAgent(
  pickupZoneId: string,
  pickupPincode: string
): Promise<AssignmentResult | null> {
  const agents = await prisma.user.findMany({
    where: { role: Role.AGENT, available: true },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
    },
  });

  if (agents.length === 0) return null;

  const pickupAnchor = await getZoneAnchor(pickupZoneId);
  const pin = parseInt(pickupPincode, 10);
  const targetLat = pickupAnchor?.lat ?? 28 + (pin % 1000) / 10000;
  const targetLng = pickupAnchor?.lng ?? 77 + Math.floor(pin / 1000) / 100;

  const withGps = agents.filter((a) => a.latitude != null && a.longitude != null);
  if (withGps.length > 0) {
    let best = withGps[0];
    let bestDist = haversineKm(
      targetLat,
      targetLng,
      best.latitude!,
      best.longitude!
    );

    for (const agent of withGps.slice(1)) {
      const dist = haversineKm(
        targetLat,
        targetLng,
        agent.latitude!,
        agent.longitude!
      );
      if (dist < bestDist) {
        best = agent;
        bestDist = dist;
      }
    }

    return {
      agentId: best.id,
      agentName: best.name,
      distanceKm: round2(bestDist),
      method: "nearest_gps",
    };
  }

  // Agents assigned to orders in pickup zone recently — proxy for zone familiarity
  const zoneAgentIds = await prisma.order.findMany({
    where: { pickupZoneId, agentId: { not: null } },
    select: { agentId: true },
    distinct: ["agentId"],
    take: 20,
  });

  const zoneSet = new Set(zoneAgentIds.map((o) => o.agentId!));
  const zoneAgent = agents.find((a) => zoneSet.has(a.id));
  if (zoneAgent) {
    return {
      agentId: zoneAgent.id,
      agentName: zoneAgent.name,
      distanceKm: 0,
      method: "zone_match",
    };
  }

  return {
    agentId: agents[0].id,
    agentName: agents[0].name,
    distanceKm: 0,
    method: "fallback",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
