import { PaymentProvider, CheckoutParams, WebhookResult } from "./paymentProvider";

export class StripeProvider implements PaymentProvider {
  async createCheckout(params: CheckoutParams): Promise<{ redirectUrl: string }> {
    // In real implementation, call stripe.checkout.sessions.create
    console.log("[Stripe] Creating checkout session for", params);
    return { redirectUrl: `https://checkout.stripe.mock/${params.classId}` };
  }

  async verifyWebhook(rawBody: any, headers: any): Promise<WebhookResult> {
    // In real implementation, call stripe.webhooks.constructEvent
    console.log("[Stripe] Verifying webhook signature");
    return {
      success: true,
      transactionId: "mock-txn-123",
      monthKey: "2026-09",
      userId: "mock-user-id",
      classId: "mock-class-id"
    };
  }
}
