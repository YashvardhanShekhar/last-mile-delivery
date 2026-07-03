import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import {
  getAuthUser,
  hashPassword,
  requireRole,
  signToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  }, z.string().regex(/^\d{10}$/).optional()),
  role: z.enum(["CUSTOMER", "AGENT"]).default("CUSTOMER"),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) return jsonError("Email already registered", 409);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: await hashPassword(body.password),
        phone: body.phone,
        role: body.role as Role,
        available: body.role === "AGENT" ? false : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
      },
    });

    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return jsonOk({ user, token }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
