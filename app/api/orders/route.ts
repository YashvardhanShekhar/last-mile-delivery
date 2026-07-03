import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import {
  createOrderWithHistory,
  orderInclude,
} from "@/lib/order-service";
import { calculateRateQuote } from "@/lib/rate-calculator";
import { prisma } from "@/lib/prisma";
import { OrderType, PaymentType, Role, OrderStatus } from "@prisma/client";

const orderSchema = z.object({
  pickupAddress: z.string().min(5),
  pickupPincode: z.string().regex(/^\d{6}$/),
  dropAddress: z.string().min(5),
  dropPincode: z.string().regex(/^\d{6}$/),
  length: z.number().positive(),
  breadth: z.number().positive(),
  height: z.number().positive(),
  actualWeight: z.number().positive(),
  orderType: z.nativeEnum(OrderType),
  paymentType: z.nativeEnum(PaymentType),
  customerId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") as OrderStatus | null;
    const zoneId = searchParams.get("zoneId");
    const agentId = searchParams.get("agentId");

    const where: Record<string, unknown> = {};

    if (user.role === Role.CUSTOMER) {
      where.customerId = user.id;
    } else if (user.role === Role.AGENT) {
      where.agentId = user.id;
    } else if (user.role === Role.ADMIN) {
      if (status) where.status = status;
      if (agentId) where.agentId = agentId;
      if (zoneId) {
        where.OR = [{ pickupZoneId: zoneId }, { dropZoneId: zoneId }];
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });

    return jsonOk(orders);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError("Unauthorized", 401);
    if (!requireRole(user, Role.CUSTOMER, Role.ADMIN)) {
      return jsonError("Forbidden", 403);
    }

    const body = orderSchema.parse(await request.json());
    const customerId =
      user.role === Role.ADMIN && body.customerId
        ? body.customerId
        : user.id;

    if (user.role === Role.ADMIN && body.customerId) {
      const customer = await prisma.user.findFirst({
        where: { id: body.customerId, role: Role.CUSTOMER },
      });
      if (!customer) return jsonError("Customer not found", 404);
    }

    const { order } = await createOrderWithHistory({
      ...body,
      customerId,
      createdById: user.id,
    });

    return jsonOk(order, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
