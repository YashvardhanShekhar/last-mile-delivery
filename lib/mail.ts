import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER?.trim();
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD,
        },
      })
    : null;

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  sent: boolean;
  to: string;
  intendedTo: string;
  diverted: boolean;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailInput): Promise<SendEmailResult> {
  const intendedTo = to;

  if (!transporter || !GMAIL_USER) {
    console.log("[email:dev]", { to: intendedTo, subject, text });
    return {
      sent: false,
      to: intendedTo,
      intendedTo,
      diverted: false,
      error: "Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env",
    };
  }

  try {
    await transporter.sendMail({
      from: `"Last Mile Delivery" <${GMAIL_USER}>`,
      to: intendedTo,
      subject,
      text,
      html: html ?? text.replace(/\n/g, "<br>"),
    });

    return {
      sent: true,
      to: intendedTo,
      intendedTo,
      diverted: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("[email:error]", err);
    return {
      sent: false,
      to: intendedTo,
      intendedTo,
      diverted: false,
      error: message,
    };
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
