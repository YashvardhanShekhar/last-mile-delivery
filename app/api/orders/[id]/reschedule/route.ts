import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { rescheduleFailedOrder } from "@/lib/order-service";
import { Role } from "@prisma/client";

const schema = z.object({
  rescheduleDate: z.string().datetime(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.CUSTOMER)) return jsonError("Forbidden", 403);

    const { id } = await params;
    const body = schema.parse(await request.json());

    const order = await rescheduleFailedOrder(
      id,
      new Date(body.rescheduleDate),
      user!.id
    );

    return jsonOk(order);
  } catch (err) {
    return handleApiError(err);
  }
}
