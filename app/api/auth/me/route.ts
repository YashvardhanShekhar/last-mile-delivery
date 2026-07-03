import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk({ user });
}
