import { jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
  const agents = await prisma.user.findMany({
    where: { role: Role.AGENT },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      available: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { name: "asc" },
  });
  return jsonOk(agents);
}
