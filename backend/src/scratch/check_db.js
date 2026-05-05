import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/switchwise';

const fundSchema = new mongoose.Schema({
  schemeCode: String,
  schemeName: String,
  nav: Number,
  date: String,
  variant: String
});

const Fund = mongoose.model('Fund', fundSchema);

async function checkData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const count = await Fund.countDocuments();
    console.log(`Total funds in DB: ${count}`);

    if (count > 0) {
      const sample = await Fund.findOne().sort({ updatedAt: -1 });
      console.log('Latest sample fund:', JSON.stringify(sample, null, 2));
      
      const distinctVariants = await Fund.distinct('variant');
      console.log('Distinct variants:', distinctVariants);
    } else {
      console.log('No data found in Fund collection.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error checking data:', error);
    process.exit(1);
  }
}

checkData();
