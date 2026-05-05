import mongoose from 'mongoose';

const systemMetadataSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String }
  },
  { timestamps: true }
);

export const SystemMetadata = mongoose.models.SystemMetadata || mongoose.model('SystemMetadata', systemMetadataSchema);
