import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreOrderItem {
  product_id: mongoose.Types.ObjectId;
  title: string;
  price: number;
  quantity: number;
}

export interface IStoreOrder extends Document {
  order_id: string;
  user_id: mongoose.Types.ObjectId;
  items: IStoreOrderItem[];
  total_amount: number;
  shipping_address: string;
  contact_phone: string;
  payment_status: 'pending' | 'paid' | 'failed';
  fulfillment_status: 'unfulfilled' | 'processing' | 'dispatched' | 'delivered';
  transaction_id?: mongoose.Types.ObjectId;
  delivery_order_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const storeOrderSchema = new Schema<IStoreOrder>({
  order_id: { type: String, required: true, unique: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [
    {
      product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
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
  transaction_id: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  delivery_order_id: { type: Schema.Types.ObjectId, ref: 'DeliveryOrder' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

export const StoreOrder = (mongoose.models.StoreOrder as mongoose.Model<IStoreOrder>) || mongoose.model<IStoreOrder>('StoreOrder', storeOrderSchema);
