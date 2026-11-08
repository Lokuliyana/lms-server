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
exports.StudyPackOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const studyPackOrderSchema = new mongoose_1.Schema({
    order_id: { type: String, required: true, unique: true, index: true },
    student_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_pack_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudyPack', required: true, index: true },
    include_physical_delivery: { type: Boolean, default: false },
    shipping_address: { type: String, default: '' },
    recipient_phone: { type: String, default: '' },
    recipient_name: { type: String, default: '' },
    delivery_order_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'DeliveryOrder' },
    digital_access_granted: { type: Boolean, default: true },
    digital_access_granted_at: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active',
        index: true,
    },
    payment_status: {
        type: String,
        enum: ['paid', 'pending', 'free', 'failed'],
        default: 'paid',
        index: true,
    },
    amount_paid: { type: Number, required: true, default: 0, min: 0 },
    transaction_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Transaction' },
    payment_proof: { type: String, default: '' },
    payment_slip_name: { type: String, default: '' },
    notes: { type: String, default: '' },
}, {
    collection: 'studyPackOrders',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// Compound indexes for fast entitlement lookups
studyPackOrderSchema.index({ student_id: 1, study_pack_id: 1 });
studyPackOrderSchema.index({ user_id: 1, study_pack_id: 1 });
exports.StudyPackOrder = mongoose_1.default.models.StudyPackOrder ||
    mongoose_1.default.model('StudyPackOrder', studyPackOrderSchema);
