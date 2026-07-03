import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import {
  AGENT_STATUSES,
  updateOrderStatus,
} from "@/lib/order-service";
import { prisma } from "@/lib/prisma";
import { OrderStatus, Role } from "@prisma/client";

const schema = z.object({
  status: z.nativeEnum(OrderStatus),
  message: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const body = schema.parse(await request.json());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return jsonError("Order not found", 404);

    if (user.role === Role.AGENT) {
      if (order.agentId !== user.id) return jsonError("Forbidden", 403);
      if (!AGENT_STATUSES.includes(body.status)) {
        return jsonError("Agents cannot set this status", 400);
      }
    } else if (user.role === Role.ADMIN) {
      // Admin can override any status
    } else {
      return jsonError("Forbidden", 403);
    }

    const updated = await updateOrderStatus(
      id,
      body.status,
      user.id,
      { message: body.message }
    );

    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
