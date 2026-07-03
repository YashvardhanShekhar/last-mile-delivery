import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderType, Role } from "@prisma/client";

const schema = z.object({
  pickupZoneId: z.string(),
  dropZoneId: z.string(),
  orderType: z.nativeEnum(OrderType),
  pricePerKg: z.number().positive(),
  codCharge: z.number().min(0),
});

export async function GET(request: NextRequest) {
  const orderType = request.nextUrl.searchParams.get("orderType") as
    | OrderType
    | null;

  const rateCards = await prisma.rateCard.findMany({
    where: orderType ? { orderType } : undefined,
    include: {
      pickupZone: { select: { id: true, name: true } },
      dropZone: { select: { id: true, name: true } },
    },
    orderBy: [{ pickupZoneId: "asc" }, { dropZoneId: "asc" }],
  });
  return jsonOk(rateCards);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);

    const body = schema.parse(await request.json());
    const rateCard = await prisma.rateCard.create({ data: body });
    return jsonOk(rateCard, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
