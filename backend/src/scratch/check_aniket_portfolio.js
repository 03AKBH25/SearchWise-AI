import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const PortfolioSchema = new mongoose.Schema({}, { strict: false });
const Portfolio = mongoose.model('Portfolio', PortfolioSchema, 'portfolios');

async function checkPortfolio() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/switchwise');
    
    // Aniket's ID from previous run
    const aniketId = '69f844b92ca883dd81334031';
    
    const portfolio = await Portfolio.findOne({ userId: new mongoose.Types.ObjectId(aniketId) }).lean();
    
    if (portfolio) {
      console.log('ANIKET_PORTFOLIO_FOUND:true');
      console.log('HOLDINGS_COUNT:', portfolio.holdings?.length || 0);
      console.log('HOLDINGS_DATA:', JSON.stringify(portfolio.holdings));
    } else {
      console.log('ANIKET_PORTFOLIO_FOUND:false');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

checkPortfolio();
