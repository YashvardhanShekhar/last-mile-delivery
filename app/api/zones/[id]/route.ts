import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const schema = z.object({ name: z.string().min(2) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);

    const { id } = await params;
    const body = schema.parse(await request.json());
    const zone = await prisma.zone.update({
      where: { id },
      data: { name: body.name },
    });
    return jsonOk(zone);
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
    await prisma.zone.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
