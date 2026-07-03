import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  zoneId: z.string(),
});

export async function GET(request: NextRequest) {
  const zoneId = request.nextUrl.searchParams.get("zoneId");
  const areas = await prisma.area.findMany({
    where: zoneId ? { zoneId } : undefined,
    include: { zone: { select: { id: true, name: true } } },
    orderBy: { pincode: "asc" },
  });
  return jsonOk(areas);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);

    const body = schema.parse(await request.json());
    const area = await prisma.area.create({ data: body });
    return jsonOk(area, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
