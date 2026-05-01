import 'dotenv/config';
import mongoose from 'mongoose';
import { Fund } from '../models/Fund.js';

const AMFI_NAV_URL = process.env.AMFI_NAV_URL || 'https://www.amfiindia.com/spages/NAVAll.txt';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/switchwise';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/direct plan|regular plan|growth plan|growth|direct|regular|plan/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function variantType(schemeName) {
  return /direct/i.test(schemeName) ? 'direct' : 'regular';
}

function parseAmfi(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+;/.test(line))
    .map((line) => {
      const [schemeCode, isinPayout, isinReinvestment, schemeName, nav, date] = line.split(';');
      return {
        schemeCode,
        isinPayout,
        isinReinvestment,
        schemeName,
        nav: Number(nav),
        date,
        normalized: normalize(schemeName),
        variant: variantType(schemeName)
      };
    })
    .filter((row) => Number.isFinite(row.nav));
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  console.log(`Fetching AMFI data from ${AMFI_NAV_URL}...`);
  const response = await fetch(AMFI_NAV_URL);
  if (!response.ok) throw new Error(`AMFI responded ${response.status}`);
  const text = await response.text();
  
  console.log('Parsing AMFI data...');
  const rows = parseAmfi(text);
  console.log(`Parsed ${rows.length} valid funds.`);

  console.log('Upserting to MongoDB...');
  let count = 0;
  
  // Use bulkWrite for efficiency
  const operations = rows.map((row) => ({
    updateOne: {
      filter: { schemeCode: row.schemeCode },
      update: { $set: row },
      upsert: true
    }
  }));

  // Process in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    await Fund.bulkWrite(batch);
    count += batch.length;
    console.log(`Upserted ${count}/${operations.length}`);
  }

  console.log('Ingestion complete!');
  await mongoose.disconnect();
}

run().catch(console.error);
