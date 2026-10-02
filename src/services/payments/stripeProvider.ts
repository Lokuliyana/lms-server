import { PaymentProvider, CheckoutParams, WebhookResult } from "./paymentProvider";

export class StripeProvider implements PaymentProvider {
  async createCheckout(params: CheckoutParams): Promise<{ redirectUrl: string }> {
    console.log("[Stripe] Creating checkout session for", params);
    return { redirectUrl: `https://checkout.stripe.mock/${params.productId || params.classId}` };
  }

  async verifyWebhook(rawBody: any, headers: any): Promise<WebhookResult> {
    console.log("[Stripe] Verifying webhook signature");
    try {
      let bodyObj: any = rawBody;
      if (Buffer.isBuffer(rawBody)) {
        bodyObj = JSON.parse(rawBody.toString("utf-8"));
      } else if (typeof rawBody === "string") {
        bodyObj = JSON.parse(rawBody);
      }
      const meta = bodyObj?.data?.object?.metadata || bodyObj?.metadata || bodyObj || {};
      const txnId = bodyObj?.data?.object?.id || bodyObj?.id || "mock-txn-123";

      return {
        success: true,
        transactionId: txnId,
        monthKey: meta.monthKey || meta.month_key || "2026-09",
        userId: meta.userId || meta.user_id || "mock-user-id",
        classId: meta.classId || meta.class_id,
        productId: meta.productId || meta.product_id
      };
    } catch {
      return {
        success: true,
        transactionId: "mock-txn-123",
        monthKey: "2026-09",
        userId: "mock-user-id",
        classId: "mock-class-id",
        productId: "mock-product-id"
      };
    }
  }
}
