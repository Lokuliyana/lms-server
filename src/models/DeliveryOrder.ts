import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryOrderItem {
  product_id?: mongoose.Types.ObjectId;
  title: string;
  quantity: number;
  price?: number;
}

export interface IDeliveryOrder extends Document {
  order_id: string;
  student_id: mongoose.Types.ObjectId;
  class_id?: mongoose.Types.ObjectId;
  store_order_id?: mongoose.Types.ObjectId;
  month_key?: string;
  delivery_method: string;
  shipping_address: string;
  recipient_phone?: string;
  recipient_name?: string;
  status: string;
  tracking_number?: string;
  courier_service?: string;
  dispatched_at?: Date;
  delivered_at?: Date;
  items?: IDeliveryOrderItem[];
  created_at: Date;
  updated_at: Date;
}

const deliveryOrderSchema = new Schema<IDeliveryOrder>({
  order_id: { type: String, required: true, unique: true, index: true },
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  class_id: { type: Schema.Types.ObjectId, ref: 'Class', required: false, index: true },
  store_order_id: { type: Schema.Types.ObjectId, ref: 'StoreOrder', required: false, index: true },
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
      product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
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

export const DeliveryOrder = (mongoose.models.DeliveryOrder as mongoose.Model<IDeliveryOrder>) || mongoose.model<IDeliveryOrder>('DeliveryOrder', deliveryOrderSchema);
