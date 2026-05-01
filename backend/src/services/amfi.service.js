import mongoose from 'mongoose';
import { fundCatalog } from '../data/fundCatalog.js';
import { Fund } from '../models/Fund.js';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/direct plan|regular plan|growth plan|growth|direct|regular|plan/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function enrichFund(fund) {
  const target = normalize(fund.displayName);
  let matches = [];

  try {
    if (mongoose.connection.readyState === 1) {
      matches = await Fund.find({ $text: { $search: `"${fund.displayName}"` } }).lean();
      if (matches.length === 0) {
        matches = await Fund.find({ normalized: { $regex: target, $options: 'i' } }).lean();
      }
    }
  } catch (error) {
    console.warn('DB enrich error:', error.message);
  }

  const variants = ['direct', 'regular'].map((key) => {
    const configured = fund.variants[key];
    const byName = normalize(configured.schemeName);

    const row =
      matches.find((item) => item.variant === key && item.normalized.includes(byName)) ||
      matches.find((item) => item.variant === key) ||
      null;

    return {
      ...configured,
      variant: key,
      nav: row?.nav || null,
      navDate: row?.date || null,
      schemeCode: row?.schemeCode || null,
      source: row ? 'AMFI MongoDB Snapshot + factsheet metadata' : 'Prototype metadata'
    };
  });

  return { ...fund, variants };
}

export async function searchFunds(query = '', limit = 8) {
  const term = query.toLowerCase().trim();

  // Search catalog first
  const catalogMatches = fundCatalog
    .filter((fund) => !term || `${fund.displayName} ${fund.category}`.toLowerCase().includes(term));

  if (catalogMatches.length > 0) {
    return Promise.all(catalogMatches.slice(0, limit).map(enrichFund));
  }

  // Universal Search via MongoDB
  try {
    let dbMatches = [];
    if (term) {
      dbMatches = await Fund.find({ $text: { $search: term } }).limit(limit * 3).lean();
      if (dbMatches.length === 0) {
        dbMatches = await Fund.find({ normalized: { $regex: term, $options: 'i' } }).limit(limit * 3).lean();
      }
    } else {
      dbMatches = await Fund.find().limit(limit * 3).lean();
    }

    const uniqueFunds = [];
    const seen = new Set();

    for (const match of dbMatches) {
      const baseName = match.schemeName.replace(/direct plan|regular plan|growth plan|growth|direct|regular|plan/gi, '').trim();
      if (seen.has(baseName)) continue;
      seen.add(baseName);

      const pairMatches = await Fund.find({ schemeName: { $regex: baseName, $options: 'i' } }).lean();
      const direct = pairMatches.find((p) => p.variant === 'direct');
      const regular = pairMatches.find((p) => p.variant === 'regular');

      if (!direct && !regular) continue;

      const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      uniqueFunds.push({
        slug,
        displayName: baseName || match.schemeName,
        category: 'Universal Fund',
        benchmark: 'General Index',
        assetClass: 'Mixed',
        expectedGrossReturn: 0.10,
        riskFreeRate: 0.065,
        standardDeviation: 0.15,
        trackingError: 0.02,
        aumCrore: 0,
        riskLabel: 'Moderate',
        exposure: { equity: 50, debt: 50, cash: 0, largeCap: 50, midCap: 0, smallCap: 0, sectors: [] },
        variants: {
          direct: {
            schemeName: direct?.schemeName || 'Unknown Direct',
            expenseRatio: 0.6,
            exitLoad: 'Check scheme documents',
            minSip: 500,
            variant: 'direct',
            nav: direct?.nav || null,
            navDate: direct?.date || null,
            source: 'AMFI Universal Search'
          },
          regular: {
            schemeName: regular?.schemeName || 'Unknown Regular',
            expenseRatio: 1.5,
            exitLoad: 'Check scheme documents',
            minSip: 500,
            variant: 'regular',
            nav: regular?.nav || null,
            navDate: regular?.date || null,
            source: 'AMFI Universal Search'
          }
        }
      });

      if (uniqueFunds.length >= limit) break;
    }
    return uniqueFunds;
  } catch (error) {
    console.error('Universal search error:', error);
    return [];
  }
}

export async function getFundPair(slugOrQuery) {
  const query = String(slugOrQuery || '').toLowerCase();

  const fund =
    fundCatalog.find((item) => item.slug === query) ||
    fundCatalog.find((item) => item.displayName.toLowerCase().includes(query.replace(/-/g, ' ')));

  if (fund) return enrichFund(fund);

  try {
    const dbMatch = await Fund.findOne({ normalized: { $regex: query.replace(/-/g, ' '), $options: 'i' } }).lean();
    if (dbMatch) {
      const baseName = dbMatch.schemeName.replace(/direct plan|regular plan|growth plan|growth|direct|regular|plan/gi, '').trim();
      const pairMatches = await Fund.find({ schemeName: { $regex: baseName, $options: 'i' } }).lean();
      
      const direct = pairMatches.find((p) => p.variant === 'direct');
      const regular = pairMatches.find((p) => p.variant === 'regular');

      return {
        slug: query,
        displayName: baseName || dbMatch.schemeName,
        category: 'Universal Fund',
        benchmark: 'General Index',
        assetClass: 'Mixed',
        expectedGrossReturn: 0.10,
        riskFreeRate: 0.065,
        standardDeviation: 0.15,
        trackingError: 0.02,
        aumCrore: 0,
        riskLabel: 'Moderate',
        exposure: { equity: 50, debt: 50, cash: 0, largeCap: 50, midCap: 0, smallCap: 0, sectors: [] },
        variants: {
          direct: {
            schemeName: direct?.schemeName || 'Unknown Direct',
            expenseRatio: 0.6,
            exitLoad: 'Check scheme documents',
            minSip: 500,
            variant: 'direct',
            nav: direct?.nav || null,
            navDate: direct?.date || null,
            source: 'AMFI Universal Search'
          },
          regular: {
            schemeName: regular?.schemeName || 'Unknown Regular',
            expenseRatio: 1.5,
            exitLoad: 'Check scheme documents',
            minSip: 500,
            variant: 'regular',
            nav: regular?.nav || null,
            navDate: regular?.date || null,
            source: 'AMFI Universal Search'
          }
        }
      };
    }
  } catch (error) {
    console.error('getFundPair Universal error:', error);
  }

  return enrichFund(fundCatalog[0]);
}
