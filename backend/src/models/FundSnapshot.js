import mongoose from 'mongoose';

const fundSnapshotSchema = new mongoose.Schema(
  {
    slug: { type: String, index: true, required: true },
    fetchedAt: { type: Date, default: Date.now },
    source: { type: String, required: true },
    variants: { type: Array, default: [] },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

export const FundSnapshot =
  mongoose.models.FundSnapshot || mongoose.model('FundSnapshot', fundSnapshotSchema);
