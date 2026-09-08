import { prisma } from "@/lib/prisma";
import type { NotificationChannel, NotificationRecipientType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Notifications abstraction (see docs/ARCHITECTURE.md §6 and product spec §14).
// MVP ships a console/no-op sender that still writes a `Notification` row, so
// the data model, event points, and outbox pattern are all exercised end to
// end. Real channels (WhatsApp/Telegram/SMS/email/push) become new
// `Notifier` implementations later without touching call sites.
// ---------------------------------------------------------------------------

export type NotificationEvent =
  | { type: "OFFER_RECEIVED"; recipientType: "CLIENT"; recipientId: string; requestId: string; offerId: string; companyName: string }
  | { type: "NEW_REQUEST"; recipientType: "COMPANY"; recipientId: string; requestId: string; carBrand: string; carModel: string };

export interface Notifier {
  send(event: NotificationEvent): Promise<void>;
}

class ConsoleNotifier implements Notifier {
  async send(event: NotificationEvent): Promise<void> {
    const channel: NotificationChannel = "CONSOLE";
    const recipientType: NotificationRecipientType = event.recipientType;

    const payload =
      event.type === "OFFER_RECEIVED"
        ? { message: `По вашей заявке поступило новое предложение от ${event.companyName}.`, requestId: event.requestId, offerId: event.offerId }
        : { message: `Появилась новая заявка ${event.carBrand} ${event.carModel}.`, requestId: event.requestId };

    console.log(`[notify:${channel}] -> ${recipientType} ${event.recipientId}:`, payload.message);

    await prisma.notification.create({
      data: {
        channel,
        recipientType,
        recipientId: event.recipientId,
        type: event.type,
        payload,
        status: "SENT",
        sentAt: new Date(),
      },
    });
  }
}

export const notifier: Notifier = new ConsoleNotifier();
