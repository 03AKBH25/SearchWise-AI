import mongoose from 'mongoose';
import { Fund } from '../models/Fund.js';

const AMFI_NAV_URL = process.env.AMFI_NAV_URL || 'https://www.amfiindia.com/spages/NAVAll.txt';

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

/**
 * Synchronizes the local database with the latest data from AMFI.
 * @returns {Promise<{success: boolean, count: number, message: string}>}
 */
export async function syncAmfiData() {
  try {
    console.log(`[DataSync] Fetching AMFI data from ${AMFI_NAV_URL}...`);
    const response = await fetch(AMFI_NAV_URL);
    if (!response.ok) throw new Error(`AMFI responded ${response.status}`);
    const text = await response.text();
    
    const rows = parseAmfi(text);
    console.log(`[DataSync] Parsed ${rows.length} funds. Upserting...`);

    const operations = rows.map((row) => ({
      updateOne: {
        filter: { schemeCode: row.schemeCode },
        update: { $set: row },
        upsert: true
      }
    }));

    // Process in batches
    const batchSize = 2000;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      await Fund.bulkWrite(batch);
    }

    return {
      success: true,
      count: rows.length,
      message: `Successfully synchronized ${rows.length} funds from AMFI official sources.`
    };
  } catch (error) {
    console.error('[DataSync] Sync failed:', error);
    return {
      success: false,
      count: 0,
      message: `Sync failed: ${error.message}`
    };
  }
}
