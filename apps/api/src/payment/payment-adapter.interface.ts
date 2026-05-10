export interface PaymentAdapter {
  createIntent(
    registrationId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{
    paymentIntentId: string;
    paymentUrl: string;
  }>;

  refund(
    paymentIntentId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{
    refundId: string;
    status: string;
  }>;
}
