import mongoose from 'mongoose';

const fundSchema = new mongoose.Schema(
  {
    schemeCode: { type: String, required: true, unique: true, index: true },
    isinPayout: { type: String },
    isinReinvestment: { type: String },
    schemeName: { type: String, required: true },
    nav: { type: Number, required: true },
    date: { type: String, required: true },
    normalized: { type: String, index: true },
    variant: { type: String, enum: ['direct', 'regular'], index: true },
    // Pre-computed CAGR returns populated by ingest5YReturns script
    fiveYearReturn:  { type: Number, default: null },
    threeYearReturn: { type: Number, default: null },
    oneYearReturn:   { type: Number, default: null },
    returnsUpdatedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Text index for searching by name
fundSchema.index({ schemeName: 'text', normalized: 'text' });

export const Fund = mongoose.models.Fund || mongoose.model('Fund', fundSchema);
