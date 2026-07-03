import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const schema = z.object({ name: z.string().min(2) });

export async function GET() {
  const zones = await prisma.zone.findMany({
    include: { areas: true, _count: { select: { pickupOrders: true } } },
    orderBy: { name: "asc" },
  });
  return jsonOk(zones);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);

    const body = schema.parse(await request.json());
    const zone = await prisma.zone.create({ data: { name: body.name } });
    return jsonOk(zone, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
