import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { formatZodError } from "@/lib/validations";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeErrorMessage(message: string): string {
  if (
    message.includes("Authentication failed against the database") ||
    message.includes("Can't reach database server") ||
    message.includes("DATABASE_URL is not set")
  ) {
    return "Database connection failed. Check DATABASE_URL in .env and run npm run db:setup";
  }
  if (message.includes("Invalid `") && message.includes("invocation")) {
    return "Database connection failed. Check DATABASE_URL in .env and run npm run db:setup";
  }
  return message;
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError(formatZodError(err), 400);
  }

  const raw = err instanceof Error ? err.message : "Internal server error";
  const message = sanitizeErrorMessage(raw);
  const status =
    message === "Forbidden"
      ? 403
      : message === "Order not found"
        ? 404
        : message.includes("Database connection failed")
          ? 503
          : 400;
  if (status === 400 && message === "Internal server error") {
    console.error(err);
    return jsonError(message, 500);
  }
  if (message !== raw) {
    console.error(err);
  }
  return jsonError(message, status);
}
