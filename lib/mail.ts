import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailInput): Promise<boolean> {
  if (!resend) {
    console.log("[email:dev]", { to, subject, text });
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      html: html ?? text.replace(/\n/g, "<br>"),
    });

    if (error) {
      console.error("[email:error]", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email:error]", err);
    return false;
  }
}

export function buildOrderStatusEmailHtml(input: {
  customerName: string;
  orderRef: string;
  statusLabel: string;
  message?: string;
  rescheduleDate?: Date | null;
  trackUrl: string;
  status: string;
}): string {
  const statusColor =
    input.status === "DELIVERED"
      ? "#16a34a"
      : input.status === "FAILED"
        ? "#dc2626"
        : "#0f172a";

  const extraLines = [
    input.message ? `<p style="margin:0 0 12px;color:#475569;">${escapeHtml(input.message)}</p>` : "",
    input.rescheduleDate
      ? `<p style="margin:0 0 12px;color:#475569;">Rescheduled delivery: <strong>${escapeHtml(input.rescheduleDate.toLocaleDateString())}</strong></p>`
      : "",
    input.status === "FAILED"
      ? `<p style="margin:0 0 12px;color:#475569;">Log in to pick a new delivery date.</p>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Last Mile Delivery</p>
      <h1 style="margin:0 0 16px;font-size:22px;">Order update</h1>
      <p style="margin:0 0 12px;color:#475569;">Hi ${escapeHtml(input.customerName)},</p>
      <p style="margin:0 0 12px;color:#475569;">Your order <strong>#${escapeHtml(input.orderRef)}</strong> status changed to:</p>
      <p style="margin:0 0 16px;padding:12px 16px;border-radius:8px;background:#f8fafc;color:${statusColor};font-weight:700;">${escapeHtml(input.statusLabel)}</p>
      ${extraLines}
      <a href="${escapeHtml(input.trackUrl)}" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Track order</a>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
