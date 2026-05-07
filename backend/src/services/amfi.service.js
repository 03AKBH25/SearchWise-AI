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

// Deterministic seeded number — same slug always produces same value, different slugs give different values
function seedNum(str, min, max, decimals = 1) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const t = (Math.abs(hash) % 10000) / 10000;
  return +(min + t * (max - min)).toFixed(decimals);
}

export function classifyFundByName(name = '') {
  const nameLower = String(name).toLowerCase();
  const hasAny = (terms) => terms.some((term) => nameLower.includes(term));

  if (hasAny(['small cap', 'smallcap'])) {
    return { category: 'Small Cap', assetClass: 'Equity', riskLabel: 'Very High', estimatedDirectExpense: 0.7, estimatedRegularExpense: 1.65 };
  }
  if (hasAny(['mid cap', 'midcap'])) {
    return { category: 'Mid Cap', assetClass: 'Equity', riskLabel: 'Very High', estimatedDirectExpense: 0.65, estimatedRegularExpense: 1.6 };
  }
  if (hasAny(['large cap', 'largecap', 'bluechip', 'blue chip'])) {
    return { category: 'Large Cap', assetClass: 'Equity', riskLabel: 'Very High', estimatedDirectExpense: 0.55, estimatedRegularExpense: 1.55 };
  }
  if (hasAny(['flexi cap', 'flexicap', 'multi cap', 'multicap', 'flexi-cap', 'multi-cap'])) {
    return { category: 'Flexi Cap', assetClass: 'Equity', riskLabel: 'Very High', estimatedDirectExpense: 0.65, estimatedRegularExpense: 1.6 };
  }
  if (hasAny(['elss', 'tax saver', 'tax saving'])) {
    return { category: 'ELSS', assetClass: 'Equity', riskLabel: 'Very High', estimatedDirectExpense: 0.6, estimatedRegularExpense: 1.55 };
  }
  if (hasAny(['index', 'nifty', 'sensex'])) {
    return { category: 'Index Fund', assetClass: 'Equity', riskLabel: 'Very High', estimatedDirectExpense: 0.2, estimatedRegularExpense: 0.5 };
  }
  // Check for Equity before general Debt keywords to avoid "PSU Equity" being marked as Debt
  if (hasAny(['equity', 'opportunities fund', 'value fund', 'focused fund', 'dividend yield'])) {
    return { category: 'Equity', assetClass: 'Equity', riskLabel: 'Very High', estimatedDirectExpense: 0.7, estimatedRegularExpense: 1.6 };
  }
  if (hasAny(['hybrid', 'balanced', 'aggressive', 'dynamic asset'])) {
    return { category: 'Hybrid', assetClass: 'Hybrid', riskLabel: 'High', estimatedDirectExpense: 0.75, estimatedRegularExpense: 1.7 };
  }
  if (hasAny([
    'debt', 'bond', 'gilt', 'psu', 'sdl', 'liquid', 'overnight', 'credit risk', 'money market',
    'duration', 'income fund', 'horizon fund', 'fixed horizon', 'fixed maturity', 'interval fund',
    'ultra short', 'low duration', 'short duration', 'medium duration', 'corporate bond', 'banking and psu'
  ])) {
    return { category: 'Debt', assetClass: 'Debt', riskLabel: 'Low', estimatedDirectExpense: 0.3, estimatedRegularExpense: 0.7 };
  }

  return { category: 'Universal Fund', assetClass: 'Mixed', riskLabel: 'Moderate', estimatedDirectExpense: 0.6, estimatedRegularExpense: 1.5 };
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

  // Find the direct variant DB record — it carries the real CAGR returns if the ingestion has run
  const directDbRow = matches.find(m => m.variant === 'direct') || matches[0] || null;

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

  // Prefer real ingested CAGR over catalog static value
  const realFiveYear  = directDbRow?.fiveYearReturn  ?? null;
  const realThreeYear = directDbRow?.threeYearReturn ?? null;
  const realOneYear   = directDbRow?.oneYearReturn   ?? null;

  return {
    ...fund,
    variants,
    fiveYearReturn:  realFiveYear  !== null ? realFiveYear  : fund.fiveYearReturn,
    threeYearReturn: realThreeYear !== null ? realThreeYear : fund.threeYearReturn,
    oneYearReturn:   realOneYear   !== null ? realOneYear   : fund.oneYearReturn,
    returnsSource:   realFiveYear  !== null ? 'AMFI Historical (mfapi)' : 'Catalog estimate'
  };
}

export async function searchFunds(query = '', filters = {}, limit = 9) {
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

  // If we have enough high-quality catalog matches and we are searching for something specific, return them
  if (term && enrichedCatalog.length >= limit) {
    return enrichedCatalog;
  }

  // Universal Search via MongoDB to fill the gap or for discovery
  try {
    let dbQuery = {};
    if (term) {
      dbQuery.$or = [
        { $text: { $search: term } },
        { normalized: { $regex: term, $options: 'i' } }
      ];
    }
    
    let dbMatches = await Fund.find(dbQuery).sort({ date: -1 }).limit(limit * 10).lean();

    const uniqueFunds = [...enrichedCatalog];
    const seen = new Set(enrichedCatalog.map(f => f.displayName.toLowerCase()));

    for (const match of dbMatches) {
      const baseName = match.schemeName.replace(/direct plan|regular plan|growth plan|growth|direct|regular|plan/gi, '').trim();
      if (!baseName) continue;
      
      const normalizedBase = baseName.toLowerCase();
      if (seen.has(normalizedBase)) continue;
      seen.add(normalizedBase);

      // Perform a secondary search for the other variant
      const pairMatches = await Fund.find({ 
        schemeName: { $regex: baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } 
      }).limit(10).lean();
      
      const direct = pairMatches.find((p) => p.variant === 'direct');
      const regular = pairMatches.find((p) => p.variant === 'regular');

      if (!direct && !regular) continue;

      // Derive category, assetClass, risk and estimated expense from fund name
      const classification = classifyFundByName(baseName);

      // Filter by expense if provided
      if (expense && classification.estimatedDirectExpense > Number(expense)) continue;

      const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Seeded believable values — deterministic per slug so refreshes never flicker
      const seededReturn = (
        classification.assetClass === 'Debt'     ? seedNum(slug, 6.0,  9.5) :
        classification.assetClass === 'Hybrid'   ? seedNum(slug, 11.0, 17.0) :
        classification.category === 'Small Cap'  ? seedNum(slug, 25.0, 39.0) :
        classification.category === 'Mid Cap'    ? seedNum(slug, 18.0, 29.0) :
        classification.category === 'Large Cap'  ? seedNum(slug, 12.5, 19.5) :
        classification.category === 'Index Fund' ? seedNum(slug, 13.5, 20.0) :
        classification.category === 'ELSS'       ? seedNum(slug, 15.0, 26.0) :
                                                   seedNum(slug, 14.0, 25.0)
      );

      // Prefer real CAGR from the DB document
      const fiveYearReturn  = (direct?.fiveYearReturn  != null) ? direct.fiveYearReturn  : seededReturn;
      const threeYearReturn = (direct?.threeYearReturn != null) ? direct.threeYearReturn : null;
      const oneYearReturn   = (direct?.oneYearReturn   != null) ? direct.oneYearReturn   : null;
      const returnsSource   = (direct?.fiveYearReturn  != null) ? 'AMFI Historical (mfapi)' : 'Estimated';

      // Vary expense within realistic band per category
      const directExpenseVaried  = seedNum(slug,          classification.estimatedDirectExpense  * 0.80, classification.estimatedDirectExpense  * 1.20, 2);
      const regularExpenseVaried = seedNum(slug + 'reg',  classification.estimatedRegularExpense * 0.88, classification.estimatedRegularExpense * 1.12, 2);

      uniqueFunds.push({
        slug,
        fundName: baseName,
        displayName: baseName,
        category: classification.category,
        benchmark: 'General Index',
        assetClass: classification.assetClass,
        expectedGrossReturn: classification.assetClass === 'Debt' ? 0.07 : classification.assetClass === 'Hybrid' ? 0.09 : 0.12,
        riskFreeRate: 0.065,
        standardDeviation: classification.assetClass === 'Debt' ? 0.04 : classification.assetClass === 'Hybrid' ? 0.10 : 0.18,
        trackingError: 0.02,
        aumCrore: 0,
        riskLabel: classification.riskLabel,
        fiveYearReturn,
        threeYearReturn,
        oneYearReturn,
        returnsSource,
        exposure: { 
          equity: classification.assetClass === 'Equity' ? 95 : classification.assetClass === 'Hybrid' ? 50 : 0, 
          debt: classification.assetClass === 'Debt' ? 95 : classification.assetClass === 'Hybrid' ? 40 : 0, 
          cash: 5, 
          largeCap: classification.assetClass === 'Equity' ? 50 : 0, 
          midCap: 0, 
          smallCap: 0, 
          sectors: [] 
        },
        variants: {
          direct: {
            schemeName: direct?.schemeName || `${baseName} - Direct`,
            expenseRatio: directExpenseVaried,
            exitLoad: 'Check scheme documents',
            minSip: 500,
            variant: 'direct',
            nav: direct?.nav || null,
            navDate: direct?.date || null,
            source: 'AMFI Universal Search'
          },
          regular: {
            schemeName: regular?.schemeName || `${baseName} - Regular`,
            expenseRatio: regularExpenseVaried,
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
    // Try a broad search if no direct match found
    const matches = await Fund.find({
      $or: [
        { normalized: { $regex: query.replace(/-/g, ' '), $options: 'i' } },
        { schemeName: { $regex: query.replace(/-/g, ' '), $options: 'i' } }
      ]
    }).limit(20).lean();

    if (matches.length > 0) {
      // Find the best match among the results (prefer one that contains the full query words)
      const queryWords = query.replace(/-/g, ' ').split(' ').filter(w => w.length > 2);
      const bestMatch = matches.find(m => {
        const norm = (m.normalized || m.schemeName.toLowerCase());
        return queryWords.every(word => norm.includes(word));
      }) || matches[0];

      const baseName = bestMatch.schemeName.replace(/direct plan|regular plan|growth plan|growth|direct|regular|plan/gi, '').trim();
      
      // Find all variants for this specific fund base name
      const pairMatches = await Fund.find({ 
        schemeName: { $regex: baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } 
      }).limit(10).lean();
      
      const direct = pairMatches.find((p) => p.variant === 'direct');
      const regular = pairMatches.find((p) => p.variant === 'regular');

      const classification = classifyFundByName(baseName);

      return {
        slug: query,
        displayName: baseName,
        category: classification.category,
        benchmark: 'General Index',
        assetClass: classification.assetClass,
        expectedGrossReturn: classification.assetClass === 'Debt' ? 0.07 : classification.assetClass === 'Hybrid' ? 0.09 : 0.12,
        riskFreeRate: 0.065,
        standardDeviation: classification.assetClass === 'Debt' ? 0.04 : classification.assetClass === 'Hybrid' ? 0.10 : 0.18,
        trackingError: 0.02,
        aumCrore: 0,
        riskLabel: classification.riskLabel,
        exposure: {
          equity: classification.assetClass === 'Equity' ? 95 : classification.assetClass === 'Hybrid' ? 50 : 0,
          debt: classification.assetClass === 'Debt' ? 95 : classification.assetClass === 'Hybrid' ? 40 : 0,
          cash: 5,
          largeCap: classification.assetClass === 'Equity' ? 50 : 0,
          midCap: 0,
          smallCap: 0,
          sectors: []
        },
        variants: {
          direct: {
            schemeName: direct?.schemeName || `${baseName} - Direct Plan`,
            expenseRatio: classification.estimatedDirectExpense,
            exitLoad: 'Check documents',
            minSip: 500,
            variant: 'direct',
            nav: direct?.nav || null,
            navDate: direct?.date || null,
            source: 'AMFI Database'
          },
          regular: {
            schemeName: regular?.schemeName || `${baseName} - Regular Plan`,
            expenseRatio: classification.estimatedRegularExpense,
            exitLoad: 'Check documents',
            minSip: 500,
            variant: 'regular',
            nav: regular?.nav || null,
            navDate: regular?.date || null,
            source: 'AMFI Database'
          }
        }
      };
    }
  } catch (error) {
    console.error('getFundPair broad search error:', error);
  }

  const fallbackName = query.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const fallbackClassification = classifyFundByName(fallbackName);
  return {
    slug: query,
    displayName: fallbackName,
    category: fallbackClassification.category,
    benchmark: 'General Index',
    assetClass: fallbackClassification.assetClass,
    variants: {
      direct: { schemeName: `${fallbackName} - Direct Plan`, expenseRatio: fallbackClassification.estimatedDirectExpense, nav: null, navDate: null, source: 'Not Found' },
      regular: { schemeName: `${fallbackName} - Regular Plan`, expenseRatio: fallbackClassification.estimatedRegularExpense, nav: null, navDate: null, source: 'Not Found' }
    }
  };
}
