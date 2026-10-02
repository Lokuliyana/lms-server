export interface CheckoutParams {
  classId?: string;
  monthKey?: string;
  productId?: string;
  userId: string;
  amount: number;
  currency: string;
}

export interface WebhookResult {
  success: boolean;
  transactionId: string;
  monthKey?: string;
  userId: string;
  classId?: string;
  productId?: string;
}

export interface PaymentProvider {
  createCheckout(params: CheckoutParams): Promise<{ redirectUrl: string }>;
  verifyWebhook(rawBody: any, headers: any): Promise<WebhookResult>;
}
