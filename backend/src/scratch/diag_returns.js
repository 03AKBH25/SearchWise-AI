import mongoose from 'mongoose';
import { Portfolio } from '../models/Portfolio.js';
import { getFundPair } from '../services/amfi.service.js';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/switchwise';

async function diagnoseReturns() {
  await mongoose.connect(MONGODB_URI);
  const p = await Portfolio.findOne({}).lean();
  if (!p) return;

  console.log('Diagnosing Returns:');
  for (const h of p.holdings) {
    const fundData = await getFundPair(h.fundId || h.fundName);
    const variants = Array.isArray(fundData.variants) ? fundData.variants : Object.values(fundData.variants || {});
    const plan = (h.plan || 'Regular').toLowerCase();
    const variant = variants.find(v => v.variant === plan) || variants[0];
    const latestNav = variant?.nav || 0;
    
    const units = h.units;
    const amount = h.amount;
    const currentValue = Math.round(units * latestNav);
    const returns = currentValue - amount;

    console.log(`- ${h.fundName}:`);
    console.log(`  Amount: ${amount}`);
    console.log(`  Units: ${units}`);
    console.log(`  NAV: ${latestNav}`);
    console.log(`  Current Value: ${currentValue}`);
    console.log(`  Returns: ${returns}`);
    console.log(`  (Raw Product: ${units * latestNav})`);
  }
  await mongoose.disconnect();
}

diagnoseReturns();
