import { z } from "zod";

const pincodeField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Must be exactly 6 digits (e.g. 110054)");

const positiveNumberField = z.coerce
  .number({ error: "Must be a positive number" })
  .positive("Must be greater than 0");

export const quoteFormSchema = z.object({
  pickupPincode: pincodeField,
  dropPincode: pincodeField,
  length: positiveNumberField,
  breadth: positiveNumberField,
  height: positiveNumberField,
  actualWeight: positiveNumberField,
  orderType: z.enum(["B2B", "B2C"]),
  paymentType: z.enum(["PREPAID", "COD"]),
});

export type QuoteFormInput = z.infer<typeof quoteFormSchema>;

const fieldLabels: Record<string, string> = {
  pickupPincode: "Pickup pincode",
  dropPincode: "Drop pincode",
  length: "Length (cm)",
  breadth: "Breadth (cm)",
  height: "Height (cm)",
  actualWeight: "Weight (kg)",
  orderType: "Order type",
  paymentType: "Payment type",
};

export function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((issue) => {
      const field = issue.path.join(".");
      const label = fieldLabels[field] ?? field;
      if (issue.message && !issue.message.startsWith("Invalid")) {
        return `${label}: ${issue.message}`;
      }
      if (field.includes("pincode")) {
        return `${label} must be exactly 6 digits (try 110054, 110016, or 110092)`;
      }
      if (
        issue.code === "invalid_type" ||
        issue.code === "invalid_value"
      ) {
        return `${label} is required`;
      }
      return `${label} is invalid`;
    })
    .join(". ");
}

export function parseQuoteForm(form: {
  pickupPincode: string;
  dropPincode: string;
  length: string;
  breadth: string;
  height: string;
  actualWeight: string;
  orderType: string;
  paymentType: string;
}): QuoteFormInput {
  const result = quoteFormSchema.safeParse({
    pickupPincode: form.pickupPincode,
    dropPincode: form.dropPincode,
    length: form.length === "" ? undefined : form.length,
    breadth: form.breadth === "" ? undefined : form.breadth,
    height: form.height === "" ? undefined : form.height,
    actualWeight: form.actualWeight === "" ? undefined : form.actualWeight,
    orderType: form.orderType,
    paymentType: form.paymentType,
  });

  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }

  return result.data;
}
