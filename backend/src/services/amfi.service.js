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

export async function searchFunds(query = '', filters = {}, limit = 8) {
  const term = query.toLowerCase().trim();
  const { category, risk, expense } = filters;

  // Search catalog first
  let catalogMatches = fundCatalog
    .filter((fund) => {
      const matchesQuery = !term || `${fund.displayName} ${fund.category}`.toLowerCase().includes(term);
      const matchesCategory = !category || category === 'All' || fund.assetClass === category || fund.category === category;
      const matchesRisk = !risk || risk === 'All' || fund.riskLabel === risk;
      const matchesExpense = !expense || fund.variants.direct.expenseRatio <= Number(expense);
      return matchesQuery && matchesCategory && matchesRisk && matchesExpense;
    });

  const enrichedCatalog = await Promise.all(catalogMatches.slice(0, limit).map(enrichFund));

  // If we have enough high-quality catalog matches, return them
  if (enrichedCatalog.length >= limit) {
    return enrichedCatalog;
  }

  // Universal Search via MongoDB
  try {
    let dbQuery = {};
    if (term) {
      dbQuery.$or = [
        { $text: { $search: term } },
        { normalized: { $regex: term, $options: 'i' } }
      ];
    }
    
    // In universal search, category/risk/expense are harder to filter in DB because they aren't in the schema
    // But we can filter by 'variant' or other fields we have
    
    let dbMatches = await Fund.find(dbQuery).limit(limit * 5).lean();

    const uniqueFunds = [...enrichedCatalog];
    const seen = new Set(enrichedCatalog.map(f => f.displayName.toLowerCase()));

    for (const match of dbMatches) {
      const baseName = match.schemeName.replace(/direct plan|regular plan|growth plan|growth|direct|regular|plan/gi, '').trim();
      const normalizedBase = baseName.toLowerCase();
      if (seen.has(normalizedBase)) continue;
      seen.add(normalizedBase);

      // Perform a secondary search for the other variant
      const pairMatches = await Fund.find({ schemeName: { $regex: baseName, $options: 'i' } }).lean();
      const direct = pairMatches.find((p) => p.variant === 'direct');
      const regular = pairMatches.find((p) => p.variant === 'regular');

      if (!direct && !regular) continue;

      // Filter by expense if provided
      const directExpense = 0.6; // Assumption for universal funds
      if (expense && directExpense > Number(expense)) continue;

      const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      uniqueFunds.push({
        slug,
        fundName: baseName || match.schemeName,
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
            expenseRatio: directExpense,
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
    return enrichedCatalog;
  }
}

export async function getTrendingFunds(limit = 6) {
  // Sort catalog by popularity and return top items
  const trending = [...fundCatalog]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
    
  return Promise.all(trending.map(enrichFund));
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
