import { NextRequest } from "next/server";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-utils";
import { getAuthUser } from "@/lib/auth";
import { calculateRateQuote } from "@/lib/rate-calculator";
import { quoteFormSchema } from "@/lib/validations";
import { OrderType, PaymentType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return jsonError("Unauthorized", 401);

    const body = quoteFormSchema.parse(await request.json());
    const quote = await calculateRateQuote({
      ...body,
      orderType: body.orderType as OrderType,
      paymentType: body.paymentType as PaymentType,
    });
    return jsonOk(quote);
  } catch (err) {
    return handleApiError(err);
  }
}
