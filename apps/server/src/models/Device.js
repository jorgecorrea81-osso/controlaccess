import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    deviceKey: { type: String, required: true, unique: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    label: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    lastLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },
    lastSeenAt: { type: Date, default: null },
    online: { type: Boolean, default: false },
    accuracy: { type: Number, default: null },
    speed: { type: Number, default: null },
    heading: { type: Number, default: null },
    /** IDs de geocercas en las que está actualmente el dispositivo */
    insideGeofences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Geofence' }],
  },
  { timestamps: true }
);

deviceSchema.index({ lastLocation: '2dsphere' }, { sparse: true });

deviceSchema.methods.toSafeJSON = function toSafeJSON() {
  const [lng, lat] = this.lastLocation?.coordinates || [];
  const user =
    this.user && typeof this.user === 'object' && this.user.toSafeJSON
      ? this.user.toSafeJSON()
      : this.user?.toString?.() || this.user;

  return {
    id: this._id.toString(),
    name: this.name,
    deviceKey: this.deviceKey,
    user,
    label: this.label,
    active: this.active,
    lat: lat ?? null,
    lng: lng ?? null,
    lastSeenAt: this.lastSeenAt,
    online: this.online,
    accuracy: this.accuracy,
    speed: this.speed,
    heading: this.heading,
    insideGeofences: (this.insideGeofences || []).map((g) =>
      typeof g === 'object' && g.toSafeJSON ? g.toSafeJSON() : g?.toString?.() || g
    ),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Device = mongoose.model('Device', deviceSchema);
