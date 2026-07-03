import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { assignAgent } from "@/lib/order-service";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const schema = z.object({ agentId: z.string() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);

    const { id } = await params;
    const body = schema.parse(await request.json());

    const agent = await prisma.user.findFirst({
      where: { id: body.agentId, role: Role.AGENT },
    });
    if (!agent) return jsonError("Agent not found", 404);

    const { order, notification } = await assignAgent(id, body.agentId, user!.id);
    return jsonOk({ ...order, notification });
  } catch (err) {
    return handleApiError(err);
  }
}
