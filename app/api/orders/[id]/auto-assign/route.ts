import { NextRequest } from "next/server";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { autoAssignAgent } from "@/lib/order-service";
import { Role } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);

    const { id } = await params;
    const { order, notification } = await autoAssignAgent(id, user!.id);
    return jsonOk({ ...order, notification });
  } catch (err) {
    return handleApiError(err);
  }
}
