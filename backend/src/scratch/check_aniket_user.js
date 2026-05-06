import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function checkAniket() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/switchwise');
    const user = await User.findOne({ email: '25aniket9@gmail.com' }).lean();
    console.log('ANIKET_USER:', JSON.stringify(user));
    await mongoose.disconnect();
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

checkAniket();
