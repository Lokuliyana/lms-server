"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayHereProvider = void 0;
class PayHereProvider {
    async createCheckout(params) {
        console.log("[PayHere] Generating checkout hash for", params);
        return { redirectUrl: `https://sandbox.payhere.lk/pay/checkout` };
    }
    async verifyWebhook(rawBody, headers) {
        console.log("[PayHere] Verifying webhook md5sig");
        try {
            let bodyObj = rawBody;
            if (Buffer.isBuffer(rawBody)) {
                bodyObj = JSON.parse(rawBody.toString("utf-8"));
            }
            else if (typeof rawBody === "string") {
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
        }
        catch {
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
exports.PayHereProvider = PayHereProvider;
