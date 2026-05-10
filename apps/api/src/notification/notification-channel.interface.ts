export interface NotificationPayload {
  recipientEmail: string;
  recipientName: string;
  eventType: string;
  data: Record<string, unknown>;
}

export interface NotificationChannelAdapter {
  readonly channel: string;
  send(deliveryId: string, payload: NotificationPayload): Promise<void>;
}
