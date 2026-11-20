import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    credential: { type: mongoose.Schema.Types.ObjectId, ref: 'Credential', default: null },
    accessPoint: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessPoint', required: true },
    direction: { type: String, enum: ['in', 'out'], default: 'in' },
    result: { type: String, enum: ['granted', 'denied'], required: true },
    reason: { type: String, trim: true, default: '' },
    cardCodeAttempt: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['web', 'mobile', 'device', 'system'], default: 'web' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

accessLogSchema.index({ createdAt: -1 });
accessLogSchema.index({ accessPoint: 1, createdAt: -1 });

accessLogSchema.methods.toSafeJSON = function toSafeJSON() {
  const mapRef = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'object' && ref.toSafeJSON) return ref.toSafeJSON();
    return ref.toString?.() || ref;
  };

  return {
    id: this._id.toString(),
    user: mapRef(this.user),
    credential: mapRef(this.credential),
    accessPoint: mapRef(this.accessPoint),
    direction: this.direction,
    result: this.result,
    reason: this.reason,
    cardCodeAttempt: this.cardCodeAttempt,
    source: this.source,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const AccessLog = mongoose.model('AccessLog', accessLogSchema);
