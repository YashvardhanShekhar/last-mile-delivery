import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const schema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!requireRole(user, Role.AGENT)) return jsonError("Forbidden", 403);

    const body = schema.parse(await request.json());
    const updated = await prisma.user.update({
      where: { id: user!.id },
      data: {
        latitude: body.latitude,
        longitude: body.longitude,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        available: true,
      },
    });

    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
