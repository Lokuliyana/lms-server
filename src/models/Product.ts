import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  description: string;
  price: number;
  category: 'study_pack' | 'tute' | 'book' | 'merchandise';
  inventory_count: number;
  thumbnail_url: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const productSchema = new Schema<IProduct>({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: ['study_pack', 'tute', 'book', 'merchandise'],
    default: 'study_pack',
    required: true,
  },
  inventory_count: { type: Number, required: true, default: 0, min: 0 },
  thumbnail_url: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

productSchema.index({ is_active: 1, category: 1 });
productSchema.index({ title: 'text', description: 'text' });

export const Product = (mongoose.models.Product as mongoose.Model<IProduct>) || mongoose.model<IProduct>('Product', productSchema);
