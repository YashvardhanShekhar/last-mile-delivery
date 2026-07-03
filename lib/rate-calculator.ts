import { OrderType, PaymentType } from "@prisma/client";
import { prisma } from "./prisma";

export const VOLUMETRIC_DIVISOR = 5000;

export interface RateQuoteInput {
  pickupPincode: string;
  dropPincode: string;
  length: number;
  breadth: number;
  height: number;
  actualWeight: number;
  orderType: OrderType;
  paymentType: PaymentType;
}

export interface RateQuoteResult {
  pickupZone: { id: string; name: string };
  dropZone: { id: string; name: string };
  volumetricWeight: number;
  billableWeight: number;
  pricePerKg: number;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  isIntraZone: boolean;
}

export function calculateVolumetricWeight(
  length: number,
  breadth: number,
  height: number
): number {
  return (length * breadth * height) / VOLUMETRIC_DIVISOR;
}

export function calculateBillableWeight(
  actualWeight: number,
  volumetricWeight: number
): number {
  return Math.max(actualWeight, volumetricWeight);
}

export async function getZoneByPincode(pincode: string) {
  const area = await prisma.area.findUnique({
    where: { pincode },
    include: { zone: true },
  });
  return area?.zone ?? null;
}

export async function calculateRateQuote(
  input: RateQuoteInput
): Promise<RateQuoteResult> {
  const pickupZone = await getZoneByPincode(input.pickupPincode);
  const dropZone = await getZoneByPincode(input.dropPincode);

  if (!pickupZone) {
    throw new Error(
      `Pickup pincode ${input.pickupPincode} is not mapped to any zone`
    );
  }
  if (!dropZone) {
    throw new Error(
      `Drop pincode ${input.dropPincode} is not mapped to any zone`
    );
  }

  const rateCard = await prisma.rateCard.findUnique({
    where: {
      pickupZoneId_dropZoneId_orderType: {
        pickupZoneId: pickupZone.id,
        dropZoneId: dropZone.id,
        orderType: input.orderType,
      },
    },
  });

  if (!rateCard) {
    throw new Error(
      `No rate card configured for ${pickupZone.name} → ${dropZone.name} (${input.orderType})`
    );
  }

  const volumetricWeight = calculateVolumetricWeight(
    input.length,
    input.breadth,
    input.height
  );
  const billableWeight = calculateBillableWeight(
    input.actualWeight,
    volumetricWeight
  );
  const baseCharge = billableWeight * rateCard.pricePerKg;
  const codSurcharge =
    input.paymentType === PaymentType.COD ? rateCard.codCharge : 0;
  const totalCharge = baseCharge + codSurcharge;

  return {
    pickupZone: { id: pickupZone.id, name: pickupZone.name },
    dropZone: { id: dropZone.id, name: dropZone.name },
    volumetricWeight: round2(volumetricWeight),
    billableWeight: round2(billableWeight),
    pricePerKg: rateCard.pricePerKg,
    baseCharge: round2(baseCharge),
    codSurcharge: round2(codSurcharge),
    totalCharge: round2(totalCharge),
    isIntraZone: pickupZone.id === dropZone.id,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
