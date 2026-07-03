import { NextRequest } from "next/server";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { orderInclude } from "@/lib/order-service";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) return jsonError("Order not found", 404);

    const allowed =
      user.role === Role.ADMIN ||
      order.customerId === user.id ||
      order.agentId === user.id;

    if (!allowed) return jsonError("Forbidden", 403);

    return jsonOk(order);
  } catch (err) {
    return handleApiError(err);
  }
}
