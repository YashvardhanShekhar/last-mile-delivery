import { toast } from "sonner";
import type { NotificationResult } from "./notifications";

export function showNotificationToast(notification: NotificationResult) {
  if (notification.emailSent) {
    const message = notification.emailDiverted
      ? `Update email sent to ${notification.emailTo} (dev redirect from ${notification.intendedEmail})`
      : `Update email sent to ${notification.emailTo}`;

    toast.success(message, {
      description: notification.smsSent
        ? "SMS notification also sent."
        : "Customer notified about the order update.",
    });
    return;
  }

  if (notification.emailError) {
    toast.error("Email could not be sent", {
      description: notification.emailError,
    });
    return;
  }

  toast.info("Status updated", {
    description: "Email logged to server console (Gmail not configured).",
  });
}
