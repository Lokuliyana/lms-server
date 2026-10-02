"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const storeOrderSchema = new mongoose_1.Schema({
    order_id: { type: String, required: true, unique: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
        {
            product_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
            title: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true, min: 1 },
        }
    ],
    total_amount: { type: Number, required: true, min: 0 },
    shipping_address: { type: String, required: true },
    contact_phone: { type: String, default: '' },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
        index: true,
    },
    fulfillment_status: {
        type: String,
        enum: ['unfulfilled', 'processing', 'dispatched', 'delivered'],
        default: 'unfulfilled',
        index: true,
    },
    transaction_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Transaction' },
    delivery_order_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'DeliveryOrder' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
exports.StoreOrder = mongoose_1.default.models.StoreOrder || mongoose_1.default.model('StoreOrder', storeOrderSchema);
