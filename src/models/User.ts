import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  is_verified: { type: Boolean, default: false },
  avatar: { type: String, default: null },
  role_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: true });

// Fix 2.5: Code bloat for normalizing names in aggregation pipelines
userSchema.virtual('computedName').get(function() {
  if (this.first_name && this.last_name) return `${this.first_name} ${this.last_name}`.trim();
  if (this.first_name) return this.first_name;
  return this.email || '—';
});

// Fix 1.9: Global toJSON transform strips password_hash automatically
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete (ret as any).password_hash;
    return ret;
  }
});

export const User = mongoose.model('User', userSchema);
