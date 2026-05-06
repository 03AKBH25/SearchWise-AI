import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../src/models/User.js';
import { Portfolio } from '../src/models/Portfolio.js';
import { fundCatalog } from '../src/data/fundCatalog.js';

async function checkAniket() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ name: /aniket/i });
  if (!user) {
    console.log('User Aniket not found');
    process.exit(0);
  }
  console.log('User found:', user.name, user._id);

  const portfolio = await Portfolio.findOne({ userId: user._id });
  if (!portfolio) {
    console.log('Portfolio for Aniket not found');
    process.exit(0);
  }

  console.log('Holdings count:', portfolio.holdings.length);
  
  let totalValue = 0;
  let equityValue = 0;

  portfolio.holdings.forEach(holding => {
    // Find fund in catalog
    const fund = fundCatalog.find(f => f.slug === holding.fundId || f.displayName === holding.fundName);
    const amount = holding.amount || 0;
    totalValue += amount;

    if (fund) {
      const equityPercent = fund.exposure?.equity || 0;
      equityValue += (amount * (equityPercent / 100));
      console.log(`- ${holding.fundName}: ${amount} (Equity: ${equityPercent}%)`);
    } else {
      // Default to 50% if not in catalog (as per advisor service logic)
      equityValue += (amount * 0.5);
      console.log(`- ${holding.fundName}: ${amount} (Unknown fund, assuming 50% Equity)`);
    }
  });

  const finalEquityPercent = (equityValue / totalValue) * 100;
  console.log('\nCalculated Total Equity %:', finalEquityPercent.toFixed(2) + '%');
  
  process.exit(0);
}

checkAniket().catch(console.error);
