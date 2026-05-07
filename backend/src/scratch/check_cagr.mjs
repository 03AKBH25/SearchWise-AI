import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
const Fund = mongoose.model('Fund', new mongoose.Schema({
  schemeCode: String, schemeName: String, variant: String,
  fiveYearReturn: Number, threeYearReturn: Number, oneYearReturn: Number, returnsUpdatedAt: Date
}));
const sample = await Fund.find({ fiveYearReturn: { $ne: null } }).limit(6).lean();
console.log('\n=== Real CAGR Returns Now Stored ===');
sample.forEach(f => console.log({
  name: f.schemeName?.slice(0, 55),
  variant: f.variant,
  '5Y_CAGR': f.fiveYearReturn,
  '3Y_CAGR': f.threeYearReturn,
  '1Y_CAGR': f.oneYearReturn
}));
const total = await Fund.countDocuments({ fiveYearReturn: { $ne: null } });
console.log(`\nTotal funds with real CAGR data: ${total}`);
await mongoose.disconnect();
