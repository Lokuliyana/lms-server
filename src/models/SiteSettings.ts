import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
  site: any;
  pages: any;
  updated_at: Date;
}

const siteSettingsSchema = new Schema<ISiteSettings>({
  site: { type: Schema.Types.Mixed, required: true },
  pages: { type: Schema.Types.Mixed, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Enforce single document
siteSettingsSchema.pre('save', async function () {
  if (this.isNew) {
    const count = await mongoose.model('SiteSettings').countDocuments();
    if (count > 0) {
      throw new Error('Only one SiteSettings document can exist');
    }
  }
});

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', siteSettingsSchema);
