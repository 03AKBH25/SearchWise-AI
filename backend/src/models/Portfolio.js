import mongoose from 'mongoose';

const holdingSchema = new mongoose.Schema({
  fundId: { type: String, required: true },
  fundName: { type: String, required: true },
  amount: { type: Number, required: true },
  units: { type: Number, default: 0 },
  currentValue: { type: Number },
  years: { type: Number, default: 5 },
  plan: { type: String, enum: ['Direct', 'Regular'], default: 'Regular' },
  category: { type: String },
  assetClass: { type: String },
  riskLabel: { type: String },
  benchmark: { type: String }
});

const portfolioSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      unique: true, 
      index: true 
    },
    holdings: [holdingSchema]
  },
  { timestamps: true }
);

export const Portfolio =
  mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);
