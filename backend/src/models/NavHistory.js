import mongoose from 'mongoose';

const navHistorySchema = new mongoose.Schema(
  {
    schemeCode: { type: String, required: true, index: true },
    nav: { type: Number, required: true },
    date: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

// Unique compound index to prevent duplicate NAV entries for the same fund on the same day
navHistorySchema.index({ schemeCode: 1, date: 1 }, { unique: true });

export const NavHistory =
  mongoose.models.NavHistory || mongoose.model('NavHistory', navHistorySchema);
