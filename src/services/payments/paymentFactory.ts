import { PaymentProvider } from "./paymentProvider";
import { StripeProvider } from "./stripeProvider";
import { PayHereProvider } from "./payhereProvider";
import { config } from "../../config/env";

export const getPaymentProvider = (): PaymentProvider => {
  // In a multi-tenant setup, this would check the client's active gateway from DB/env
  const activeGateway = process.env.ACTIVE_PAYMENT_GATEWAY || "stripe";
  
  switch (activeGateway) {
    case "payhere":
      return new PayHereProvider();
    case "stripe":
    default:
      return new StripeProvider();
  }
};
