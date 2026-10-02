"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentProvider = void 0;
const stripeProvider_1 = require("./stripeProvider");
const payhereProvider_1 = require("./payhereProvider");
const getPaymentProvider = () => {
    // In a multi-tenant setup, this would check the client's active gateway from DB/env
    const activeGateway = process.env.ACTIVE_PAYMENT_GATEWAY || "stripe";
    switch (activeGateway) {
        case "payhere":
            return new payhereProvider_1.PayHereProvider();
        case "stripe":
        default:
            return new stripeProvider_1.StripeProvider();
    }
};
exports.getPaymentProvider = getPaymentProvider;
