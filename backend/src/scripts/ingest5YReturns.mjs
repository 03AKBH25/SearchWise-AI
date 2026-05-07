/**
 * ingest5YReturns.mjs
 *
 * Fetches historical NAV data from mfapi.in (which mirrors AMFI data) for every
 * fund scheme code in the local MongoDB, computes 1Y / 3Y / 5Y CAGR returns, and
 * persists them directly on the Fund document.
 *
 * Also stores "anchor" NAV entries (today, 1yr ago, 3yr ago, 5yr ago) in NavHistory
 * so they are available for future ad-hoc calculations.
 *
 * Rate: 3 requests / second  (~80 min for all 14,000 funds)
 * Re-runnable: skips funds whose returnsUpdatedAt is less than 30 days old.
 *
 * Usage:
 *   node src/scripts/ingest5YReturns.mjs
 *   node src/scripts/ingest5YReturns.mjs --limit 100      # quick test with first 100 funds
 *   node src/scripts/ingest5YReturns.mjs --force          # re-process even recent ones
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { setTimeout as sleep } from 'timers/promises';

dotenv.config();

// ─── Schema definitions (inline to keep the script self-contained) ───────────

const fundSchema = new mongoose.Schema({
  schemeCode:      { type: String, required: true, unique: true, index: true },
  schemeName:      { type: String, required: true },
  nav:             { type: Number, required: true },
  date:            { type: String, required: true },
  normalized:      { type: String, index: true },
  variant:         { type: String, enum: ['direct', 'regular'], index: true },
  isinPayout:      String,
  isinReinvestment:String,
  fiveYearReturn:  { type: Number, default: null },
  threeYearReturn: { type: Number, default: null },
  oneYearReturn:   { type: Number, default: null },
  returnsUpdatedAt:{ type: Date,   default: null }
}, { timestamps: true });

const navHistorySchema = new mongoose.Schema({
  schemeCode: { type: String, required: true, index: true },
  nav:        { type: Number, required: true },
  date:       { type: Date,   required: true, index: true }
}, { timestamps: true });
navHistorySchema.index({ schemeCode: 1, date: 1 }, { unique: true });

const Fund      = mongoose.models.Fund      || mongoose.model('Fund',      fundSchema);
const NavHistory = mongoose.models.NavHistory || mongoose.model('NavHistory', navHistorySchema);

// ─── CLI flags ───────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const LIMIT   = args.includes('--limit')  ? parseInt(args[args.indexOf('--limit')  + 1], 10) : Infinity;
const FORCE   = args.includes('--force');
const CONCURRENCY = 3;     // parallel requests per batch
const DELAY_MS    = 1000;  // wait between batches (ms) → effective 3 req/sec

// ─── Helpers ─────────────────────────────────────────────────────────────────

function anchorDate(yearsBack) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsBack);
  return d;
}

/** Find the NAV entry in mfapi data closest to a target date (data is newest-first) */
function closestNav(data, targetDate) {
  const target = targetDate.getTime();
  let best = null, bestDiff = Infinity;
  for (const entry of data) {
    // mfapi dates are DD-Mon-YYYY (e.g. "06-May-2026") or DD-MM-YYYY
    const parts = entry.date.split('-');
    let parsed;
    if (parts[1].length > 2) {
      // DD-Mon-YYYY
      parsed = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`);
    } else {
      // DD-MM-YYYY
      parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    if (isNaN(parsed)) continue;
    const diff = Math.abs(parsed.getTime() - target);
    if (diff < bestDiff) { bestDiff = diff; best = { nav: parseFloat(entry.nav), date: parsed }; }
    // Once we pass the target going back in time, data is sorted so we can break early
    if (parsed.getTime() < target - 30 * 86400000 && best) break;
  }
  return best;
}

/** CAGR formula: (endNAV / startNAV)^(1/years) - 1, as a percentage */
function cagr(endNav, startNav, years) {
  if (!startNav || startNav <= 0 || !endNav || endNav <= 0) return null;
  return +(((endNav / startNav) ** (1 / years) - 1) * 100).toFixed(2);
}

/** Fetch from mfapi.in with a simple retry */
async function fetchHistory(schemeCode, retries = 2) {
  const url = `https://api.mfapi.in/mf/${schemeCode}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status !== 'SUCCESS' || !Array.isArray(json.data)) return null;
      return json.data; // newest-first array of { date, nav }
    } catch (err) {
      if (attempt === retries) return null;
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔌  Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected.\n');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const query = FORCE
    ? {}
    : { $or: [{ returnsUpdatedAt: null }, { returnsUpdatedAt: { $lt: thirtyDaysAgo } }] };

  const funds = await Fund.find(query).select('schemeCode schemeName nav variant').lean();
  const total = Math.min(funds.length, LIMIT === Infinity ? funds.length : LIMIT);

  console.log(`📊  Funds to process : ${total.toLocaleString()}`);
  console.log(`⚡  Concurrency      : ${CONCURRENCY} req/batch  (${CONCURRENCY}/sec)\n`);
  if (total === 0) { console.log('Nothing to do — all funds are fresh (use --force to reprocess).'); await mongoose.disconnect(); return; }

  const target5Y = anchorDate(5);
  const target3Y = anchorDate(3);
  const target1Y = anchorDate(1);

  let processed = 0, updated = 0, skipped = 0, errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = funds.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (fund) => {
      try {
        const data = await fetchHistory(fund.schemeCode);
        if (!data || data.length < 2) { skipped++; return; }

        const todayNav  = parseFloat(data[0]?.nav);
        const entry5Y   = closestNav(data, target5Y);
        const entry3Y   = closestNav(data, target3Y);
        const entry1Y   = closestNav(data, target1Y);

        const r5 = entry5Y ? cagr(todayNav, entry5Y.nav, 5) : null;
        const r3 = entry3Y ? cagr(todayNav, entry3Y.nav, 3) : null;
        const r1 = entry1Y ? cagr(todayNav, entry1Y.nav, 1) : null;

        // Persist computed returns on Fund document
        await Fund.updateOne(
          { schemeCode: fund.schemeCode },
          { $set: { fiveYearReturn: r5, threeYearReturn: r3, oneYearReturn: r1, returnsUpdatedAt: new Date() } }
        );

        // Store anchor NAV entries in NavHistory (upsert to avoid duplicates)
        const anchors = [
          entry5Y && { schemeCode: fund.schemeCode, nav: entry5Y.nav, date: entry5Y.date },
          entry3Y && { schemeCode: fund.schemeCode, nav: entry3Y.nav, date: entry3Y.date },
          entry1Y && { schemeCode: fund.schemeCode, nav: entry1Y.nav, date: entry1Y.date },
        ].filter(Boolean);

        for (const anchor of anchors) {
          await NavHistory.updateOne(
            { schemeCode: anchor.schemeCode, date: anchor.date },
            { $set: { nav: anchor.nav } },
            { upsert: true }
          ).catch(() => {}); // ignore duplicate key errors
        }

        updated++;
      } catch (err) {
        errors++;
        console.error(`  ❌  ${fund.schemeCode} (${fund.schemeName?.slice(0, 40)}): ${err.message}`);
      } finally {
        processed++;
      }
    }));

    // Progress log every 50 funds
    if (processed % 50 === 0 || processed >= total) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate    = (processed / Math.max(1, elapsed)).toFixed(1);
      const eta     = ((total - processed) / Math.max(0.1, rate)).toFixed(0);
      process.stdout.write(
        `\r  Progress: ${processed}/${total}  ` +
        `✅ ${updated}  ⏭ ${skipped}  ❌ ${errors}  ` +
        `[${elapsed}s elapsed, ETA ~${eta}s @ ${rate} req/s]   `
      );
    }

    if (i + CONCURRENCY < total) await sleep(DELAY_MS);
  }

  console.log(`\n\n🏁  Done.`);
  console.log(`   Updated  : ${updated.toLocaleString()}`);
  console.log(`   Skipped  : ${skipped.toLocaleString()} (insufficient history)`);
  console.log(`   Errors   : ${errors.toLocaleString()}`);
  console.log(`   Duration : ${((Date.now() - startTime) / 60000).toFixed(1)} min`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
