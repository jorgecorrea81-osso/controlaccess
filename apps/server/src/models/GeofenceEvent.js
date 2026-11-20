import mongoose from 'mongoose';

const geofenceEventSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    geofence: { type: mongoose.Schema.Types.ObjectId, ref: 'Geofence', required: true },
    type: { type: String, enum: ['enter', 'exit'], required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    source: { type: String, enum: ['mobile', 'web', 'simulator', 'system'], default: 'mobile' },
  },
  { timestamps: true }
);

geofenceEventSchema.index({ createdAt: -1 });

geofenceEventSchema.methods.toSafeJSON = function toSafeJSON() {
  const mapRef = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'object' && ref.toSafeJSON) return ref.toSafeJSON();
    return ref.toString?.() || ref;
  };
  const [lng, lat] = this.location?.coordinates || [];

  return {
    id: this._id.toString(),
    device: mapRef(this.device),
    geofence: mapRef(this.geofence),
    type: this.type,
    lat: lat ?? null,
    lng: lng ?? null,
    source: this.source,
    createdAt: this.createdAt,
  };
};

export const GeofenceEvent = mongoose.model('GeofenceEvent', geofenceEventSchema);
