import { OrderStatus, Prisma } from "@prisma/client";
import { findNearestAvailableAgent } from "./agent-assignment";
import { notifyOrderStatusChange } from "./notifications";
import { calculateRateQuote, RateQuoteInput } from "./rate-calculator";
import { prisma } from "./prisma";

const AGENT_STATUSES: OrderStatus[] = [
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
  OrderStatus.FAILED,
];

export async function createOrderWithHistory(
  data: RateQuoteInput & {
    customerId: string;
    pickupAddress: string;
    dropAddress: string;
    createdById: string;
  }
) {
  const quote = await calculateRateQuote(data);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId: data.customerId,
        pickupZoneId: quote.pickupZone.id,
        dropZoneId: quote.dropZone.id,
        pickupAddress: data.pickupAddress,
        pickupPincode: data.pickupPincode,
        dropAddress: data.dropAddress,
        dropPincode: data.dropPincode,
        length: data.length,
        breadth: data.breadth,
        height: data.height,
        actualWeight: data.actualWeight,
        volumetricWeight: quote.volumetricWeight,
        billableWeight: quote.billableWeight,
        baseCharge: quote.baseCharge,
        codSurcharge: quote.codSurcharge,
        deliveryCharge: quote.totalCharge,
        orderType: data.orderType,
        paymentType: data.paymentType,
        status: OrderStatus.CREATED,
      },
      include: orderInclude,
    });

    await tx.orderHistory.create({
      data: {
        orderId: created.id,
        status: OrderStatus.CREATED,
        changedById: data.createdById,
      },
    });

    return created;
  });

  const notification = await notifyCustomer(order, OrderStatus.CREATED);

  const fixedAgent = await prisma.user.findUnique({
    where: { email: "agent@lmd.com" },
  });

  if (fixedAgent) {
    const assignment = await assignAgent(order.id, fixedAgent.id, data.createdById);
    return {
      order: assignment.order,
      notification: assignment.notification ?? notification,
    };
  }

  return { order, notification };
}

export async function assignAgent(
  orderId: string,
  agentId: string,
  changedById: string
) {
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        agentId,
        status: OrderStatus.ASSIGNED,
      },
      include: orderInclude,
    });

    await tx.orderHistory.create({
      data: {
        orderId,
        status: OrderStatus.ASSIGNED,
        changedById,
      },
    });

    return updated;
  });

  const notification = await notifyCustomer(order, OrderStatus.ASSIGNED);
  return { order, notification };
}

export async function autoAssignAgent(orderId: string, changedById: string) {
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new Error("Order not found");

  const match = await findNearestAvailableAgent(
    existing.pickupZoneId,
    existing.pickupPincode
  );
  if (!match) throw new Error("No available agents found");

  return assignAgent(orderId, match.agentId, changedById);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  changedById: string,
  options?: { message?: string }
) {
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status },
      include: orderInclude,
    });

    await tx.orderHistory.create({
      data: { orderId, status, changedById },
    });

    return updated;
  });

  const notification = await notifyCustomer(order, status, options?.message);
  return { order, notification };
}

export async function rescheduleFailedOrder(
  orderId: string,
  rescheduleDate: Date,
  customerId: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) throw new Error("Order not found");
  if (order.customerId !== customerId) throw new Error("Forbidden");
  if (order.status !== OrderStatus.FAILED) {
    throw new Error("Only failed orders can be rescheduled");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: orderId },
      data: {
        rescheduleDate,
        agentId: null,
        status: OrderStatus.CREATED,
      },
      include: orderInclude,
    });

    await tx.orderHistory.create({
      data: {
        orderId,
        status: OrderStatus.CREATED,
        changedById: customerId,
      },
    });

    return o;
  });

  const notification = await notifyCustomer(updated, OrderStatus.CREATED, "Delivery rescheduled");

  // Re-auto-assign for the new attempt
  try {
    await autoAssignAgent(orderId, customerId);
  } catch {
    // Agent pool may be empty; admin can assign manually
  }

  return prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
}

async function notifyCustomer(
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
  status: OrderStatus,
  message?: string
) {
  return notifyOrderStatusChange({
    orderId: order.id,
    customerEmail: order.customer.email,
    customerPhone: order.customer.phone,
    customerName: order.customer.name,
    status,
    message,
    rescheduleDate: order.rescheduleDate,
  });
}

export const orderInclude = {
  customer: {
    select: { id: true, name: true, email: true, phone: true },
  },
  agent: { select: { id: true, name: true, email: true, phone: true } },
  pickupZone: { select: { id: true, name: true } },
  dropZone: { select: { id: true, name: true } },
  history: {
    orderBy: { createdAt: "asc" as const },
    include: {
      changedBy: { select: { id: true, name: true, role: true } },
    },
  },
};

export { AGENT_STATUSES };
