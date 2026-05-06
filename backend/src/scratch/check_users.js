import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/switchwise');
    const count = await User.countDocuments();
    console.log(`TOTAL_USERS:${count}`);
    
    if (count > 0) {
      const users = await User.find({}, { name: 1, email: 1, firstName: 1 }).limit(5).lean();
      console.log('SAMPLE_USERS:', JSON.stringify(users));
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

checkUsers();
