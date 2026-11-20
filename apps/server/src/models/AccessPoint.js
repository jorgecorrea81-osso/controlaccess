import mongoose from 'mongoose';

const accessPointSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    location: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    allowedRoles: {
      type: [{ type: String, enum: ['admin', 'guard', 'employee'] }],
      default: ['admin', 'guard', 'employee'],
    },
  },
  { timestamps: true }
);

accessPointSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    code: this.code,
    location: this.location,
    description: this.description,
    active: this.active,
    allowedRoles: this.allowedRoles,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const AccessPoint = mongoose.model('AccessPoint', accessPointSchema);
