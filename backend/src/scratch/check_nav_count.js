import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/switchwise';

const navHistorySchema = new mongoose.Schema({
  schemeCode: String,
  nav: Number,
  date: Date
});

const NavHistory = mongoose.model('NavHistory', navHistorySchema);

async function checkData() {
  try {
    await mongoose.connect(MONGODB_URI);
    const count = await NavHistory.countDocuments();
    console.log(`Current NavHistory count: ${count}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}

checkData();
