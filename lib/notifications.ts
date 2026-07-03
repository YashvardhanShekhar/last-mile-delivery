import { OrderStatus } from "@prisma/client";
import { buildOrderStatusEmailHtml, sendEmail } from "./mail";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Order Created",
  ASSIGNED: "Agent Assigned",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery Failed",
};

export interface NotificationPayload {
  orderId: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerName: string;
  status: OrderStatus;
  message?: string;
  rescheduleDate?: Date | null;
}

export interface NotificationResult {
  emailSent: boolean;
  emailTo: string;
  intendedEmail: string;
  emailDiverted: boolean;
  emailError?: string;
  smsSent: boolean;
}

export async function notifyOrderStatusChange(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const label = STATUS_LABELS[payload.status];
  const orderRef = payload.orderId.slice(-8).toUpperCase();
  const subject = `Order ${orderRef} — ${label}`;
  const trackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/customer/orders/${payload.orderId}`;

  let text = `Hi ${payload.customerName},\n\nYour order #${orderRef} status is now: ${label}.`;
  if (payload.message) text += `\n\n${payload.message}`;
  if (payload.rescheduleDate) {
    text += `\n\nRescheduled delivery date: ${payload.rescheduleDate.toLocaleDateString()}`;
  }
  if (payload.status === "FAILED") {
    text += "\n\nYou can log in to reschedule your delivery for a new date.";
  }
  text += `\n\nTrack your order: ${trackUrl}`;

  const html = buildOrderStatusEmailHtml({
    customerName: payload.customerName,
    orderRef,
    statusLabel: label,
    message: payload.message,
    rescheduleDate: payload.rescheduleDate,
    trackUrl,
    status: payload.status,
  });

  const [emailResult, smsSent] = await Promise.all([
    sendEmail({
      to: payload.customerEmail,
      subject,
      text,
      html,
    }),
    sendSms(payload.customerPhone, `${label}: Order ${orderRef}`),
  ]);

  return {
    emailSent: emailResult.sent,
    emailTo: emailResult.to,
    intendedEmail: emailResult.intendedTo,
    emailDiverted: emailResult.diverted,
    emailError: emailResult.error,
    smsSent,
  };
}

async function sendSms(phone: string | null | undefined, message: string): Promise<boolean> {
  if (!phone) return false;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.log("[sms:dev]", { phone, message });
    return false;
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      To: phone,
      From: from,
      Body: message,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    return res.ok;
  } catch (err) {
    console.error("[sms:error]", err);
    return false;
  }
}
