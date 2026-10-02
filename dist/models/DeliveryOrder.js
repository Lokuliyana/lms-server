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
exports.DeliveryOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const deliveryOrderSchema = new mongoose_1.Schema({
    order_id: { type: String, required: true, unique: true, index: true },
    student_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    class_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Class', required: false, index: true },
    store_order_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StoreOrder', required: false, index: true },
    month_key: { type: String, required: false },
    delivery_method: { type: String, default: 'Courier' },
    shipping_address: { type: String, default: 'Profile Address' },
    recipient_phone: { type: String, default: '' },
    recipient_name: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending_processing', 'processing', 'dispatched', 'shipped', 'delivered', 'cancelled'],
        default: 'pending_processing',
        index: true,
    },
    tracking_number: { type: String, default: '' },
    courier_service: { type: String, default: '' },
    dispatched_at: { type: Date },
    delivered_at: { type: Date },
    items: [
        {
            product_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
            title: { type: String, required: true },
            quantity: { type: Number, required: true, default: 1 },
            price: { type: Number },
        }
    ],
    created_at: { type: Date, default: Date.now },
}, {
    collection: 'deliveryOrders',
    timestamps: true,
});
exports.DeliveryOrder = mongoose_1.default.models.DeliveryOrder || mongoose_1.default.model('DeliveryOrder', deliveryOrderSchema);
