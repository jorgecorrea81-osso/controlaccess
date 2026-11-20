import mongoose from 'mongoose';

const geofenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    /** polygon | circle */
    type: { type: String, enum: ['polygon', 'circle'], required: true },
    /**
     * polygon: [[lng, lat], ...] (anillo cerrado opcional)
     * circle: [[lng, lat]] centro
     */
    coordinates: {
      type: [[Number]],
      required: true,
      validate: {
        validator(value) {
          if (!Array.isArray(value) || value.length === 0) return false;
          return value.every(
            (pair) =>
              Array.isArray(pair) &&
              pair.length === 2 &&
              Number.isFinite(pair[0]) &&
              Number.isFinite(pair[1])
          );
        },
        message: 'coordinates debe ser un array de [lng, lat]',
      },
    },
    /** Radio en metros (solo circle) */
    radiusMeters: { type: Number, default: null },
    color: { type: String, default: '#2dd4bf' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

geofenceSchema.pre('validate', function ensureShape(next) {
  if (this.type === 'circle') {
    if (!this.radiusMeters || this.radiusMeters <= 0) {
      this.invalidate('radiusMeters', 'radiusMeters es obligatorio para geocercas circulares');
    }
    if (!this.coordinates || this.coordinates.length < 1) {
      this.invalidate('coordinates', 'circle requiere coordenadas del centro');
    }
  }
  if (this.type === 'polygon' && (!this.coordinates || this.coordinates.length < 3)) {
    this.invalidate('coordinates', 'polygon requiere al menos 3 puntos');
  }
  next();
});

geofenceSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    type: this.type,
    coordinates: this.coordinates,
    radiusMeters: this.radiusMeters,
    color: this.color,
    active: this.active,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Geofence = mongoose.model('Geofence', geofenceSchema);
