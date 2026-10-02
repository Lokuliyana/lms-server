import mongoose, { Schema, Document } from 'mongoose';

export interface ITenantSettings extends Document {
  platformName: string;
  instructorName: string;
  slogan: string;
  contactPhone: string;
  contactEmail: string;
  supportWhatsApp: string;
  assets: {
    logoUrl: string;
    faviconUrl: string;
    heroBannerUrl: string;
    loginIllustrationUrl: string;
    defaultAvatarUrl: string;
  };
  themeTokens: {
    primaryColor: string;
    accentColor: string;
  };
  updated_at: Date;
  created_at: Date;
}

const tenantSettingsSchema = new Schema<ITenantSettings>({
  platformName: { type: String, default: 'NexvoLearn' },
  instructorName: { type: String, default: 'Danidu' },
  slogan: { type: String, default: 'Empowering Minds Through Modern Education' },
  contactPhone: { type: String, default: '+94 77 123 4567' },
  contactEmail: { type: String, default: 'support@nexvolearn.com' },
  supportWhatsApp: { type: String, default: '+94771234567' },
  assets: {
    logoUrl: { type: String, default: '/assets/logo.png' },
    faviconUrl: { type: String, default: '/favicon.ico' },
    heroBannerUrl: { type: String, default: '/assets/hero.png' },
    loginIllustrationUrl: { type: String, default: '/assets/login-illustration.png' },
    defaultAvatarUrl: { type: String, default: '/assets/default-avatar.png' }
  },
  themeTokens: {
    primaryColor: { type: String, default: '#4f46e5' },
    accentColor: { type: String, default: '#06b6d4' }
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const TenantSettings = mongoose.model<ITenantSettings>('TenantSettings', tenantSettingsSchema);
