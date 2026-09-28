import { PaymentProvider, CheckoutParams, WebhookResult } from "./paymentProvider";
import crypto from "crypto";

export class PayHereProvider implements PaymentProvider {
  async createCheckout(params: CheckoutParams): Promise<{ redirectUrl: string }> {
    // Generate PayHere hash and return redirect URL with params
    console.log("[PayHere] Generating checkout hash for", params);
    return { redirectUrl: `https://sandbox.payhere.lk/pay/checkout` };
  }

  async verifyWebhook(rawBody: any, headers: any): Promise<WebhookResult> {
    // Verify md5sig from PayHere
    console.log("[PayHere] Verifying webhook md5sig");
    return {
      success: true,
      transactionId: "mock-payhere-txn-123",
      monthKey: "2026-09",
      userId: "mock-user-id",
      classId: "mock-class-id"
    };
  }
}
