import { getFundPair } from '../src/services/amfi.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testGetFundPair() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const testNames = [
    'HDFC Flexi Cap Fund',
    'Axis Bluechip Fund',
    'SBI Small Cap Fund',
    'ICICI Balanced Advantage Fund'
  ];

  for (const name of testNames) {
    const res = await getFundPair(name);
    console.log(`\nQuery: ${name}`);
    console.log(`Display Name: ${res.displayName}`);
    console.log(`Category: ${res.category}`);
    console.log(`Asset Class: ${res.assetClass}`);
    console.log(`Variants Found: ${Object.keys(res.variants).length}`);
  }
  
  await mongoose.disconnect();
}

testGetFundPair();
