import 'dotenv/config';
import mongoose from 'mongoose';
import { SystemMetadata } from '../src/models/SystemMetadata.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/switchwise';

async function check() {
  await mongoose.connect(MONGODB_URI);
  const meta = await SystemMetadata.findOne({ key: 'lastAmfiSync' });
  console.log('Last Sync Meta:', meta);
  await mongoose.disconnect();
}

check();
