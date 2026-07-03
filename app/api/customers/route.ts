import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { getAuthUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireRole(user, Role.ADMIN)) return jsonError("Forbidden", 403);
  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  });
  return jsonOk(customers);
}
