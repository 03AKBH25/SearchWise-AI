import { analyzePortfolio } from '../src/services/portfolioAnalysis.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testAllocation() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const holdings = [
    { fundName: 'HDFC Flexi Cap Fund', amount: 100000, units: 100, years: 10, plan: 'Direct' },
    { fundName: 'ICICI Balanced Advantage Fund', amount: 100000, units: 100, years: 10, plan: 'Direct' },
    { fundName: 'SBI Small Cap Fund', amount: 100000, units: 100, years: 10, plan: 'Direct' }
  ];

  const results = await analyzePortfolio(holdings);
  
  console.log('Allocation Percentages:');
  console.log(JSON.stringify(results.allocationPercentages, null, 2));
  
  console.log('\nFund Details (Asset Class):');
  results.funds.forEach(f => console.log(`${f.fundName}: ${f.assetClass}`));
  
  await mongoose.disconnect();
}

testAllocation();
