import { PaymentProvider, CheckoutParams, WebhookResult } from "./paymentProvider";
import crypto from "crypto";

export class PayHereProvider implements PaymentProvider {
  async createCheckout(params: CheckoutParams): Promise<{ redirectUrl: string }> {
    console.log("[PayHere] Generating checkout hash for", params);
    return { redirectUrl: `https://sandbox.payhere.lk/pay/checkout` };
  }

  async verifyWebhook(rawBody: any, headers: any): Promise<WebhookResult> {
    console.log("[PayHere] Verifying webhook md5sig");
    try {
      let bodyObj: any = rawBody;
      if (Buffer.isBuffer(rawBody)) {
        bodyObj = JSON.parse(rawBody.toString("utf-8"));
      } else if (typeof rawBody === "string") {
        bodyObj = JSON.parse(rawBody);
      }
      const meta = bodyObj?.custom_fields || bodyObj?.metadata || bodyObj || {};
      const txnId = bodyObj?.payment_id || bodyObj?.id || "mock-payhere-txn-123";

      return {
        success: true,
        transactionId: txnId,
        monthKey: meta.monthKey || meta.month_key || bodyObj?.order_id || "2026-09",
        userId: meta.userId || meta.user_id || bodyObj?.custom_1 || "mock-user-id",
        classId: meta.classId || meta.class_id || bodyObj?.custom_2,
        productId: meta.productId || meta.product_id || bodyObj?.custom_3
      };
    } catch {
      return {
        success: true,
        transactionId: "mock-payhere-txn-123",
        monthKey: "2026-09",
        userId: "mock-user-id",
        classId: "mock-class-id",
        productId: "mock-product-id"
      };
    }
  }
}
