import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderType, Role } from "@prisma/client";

const schema = z.object({
  pricePerKg: z.number().positive().optional(),
  codCharge: z.number().min(0).optional(),
  orderType: z.nativeEnum(OrderType).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);

    const { id } = await params;
    const body = schema.parse(await request.json());
    const rateCard = await prisma.rateCard.update({
      where: { id },
      data: body,
    });
    return jsonOk(rateCard);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);

    const { id } = await params;
    await prisma.rateCard.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
