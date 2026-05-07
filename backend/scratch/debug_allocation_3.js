import { analyzePortfolio } from '../src/services/portfolioAnalysis.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testAllocation() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Use specific names that should match Equity and Hybrid
  const holdings = [
    { fundName: 'Axis Small Cap Fund', amount: 100000, units: 100, years: 10, plan: 'Direct' },
    { fundName: 'ICICI Prudential Balanced Advantage Fund', amount: 100000, units: 100, years: 10, plan: 'Direct' },
    { fundName: 'HDFC Flexi Cap Fund', amount: 100000, units: 100, years: 10, plan: 'Direct' }
  ];

  const results = await analyzePortfolio(holdings);
  
  console.log('--- Allocation Percentages ---');
  console.log(JSON.stringify(results.allocationPercentages, null, 2));
  
  console.log('\n--- Category Distribution ---');
  console.log(JSON.stringify(results.categoryDistribution, null, 2));
  
  console.log('\n--- Fund Analysis Details ---');
  results.funds.forEach(f => {
    console.log(`- Fund: ${f.fundName}`);
    console.log(`  Category: ${f.category}`);
    console.log(`  Asset Class: ${f.assetClass}`);
    console.log(`  Current Value: ${f.currentValue}`);
  });
  
  await mongoose.disconnect();
}

testAllocation();
