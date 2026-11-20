import mongoose from 'mongoose';

const credentialSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cardCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['card', 'pin', 'qr', 'mobile'], default: 'card' },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

credentialSchema.methods.toSafeJSON = function toSafeJSON() {
  const user =
    this.user && typeof this.user === 'object' && this.user.toSafeJSON
      ? this.user.toSafeJSON()
      : this.user?.toString?.() || this.user;

  return {
    id: this._id.toString(),
    user,
    cardCode: this.cardCode,
    type: this.type,
    active: this.active,
    expiresAt: this.expiresAt,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Credential = mongoose.model('Credential', credentialSchema);
