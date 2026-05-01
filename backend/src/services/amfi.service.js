import { fundCatalog } from '../data/fundCatalog.js';
import { FundSnapshot } from '../models/FundSnapshot.js';

const AMFI_NAV_URL = process.env.AMFI_NAV_URL || 'https://www.amfiindia.com/spages/NAVAll.txt';
const CACHE_MS = 1000 * 60 * 30;
let navCache = { fetchedAt: 0, rows: [] };

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

let pendingFetch = null;

async function fetchAmfiRows() {
  if (Date.now() - navCache.fetchedAt < CACHE_MS && navCache.rows.length) return navCache.rows;

  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(AMFI_NAV_URL, { signal: controller.signal });
      if (!response.ok) throw new Error(`AMFI responded ${response.status}`);
      const rows = parseAmfi(await response.text());
      navCache = { fetchedAt: Date.now(), rows };
      return rows;
    } finally {
      clearTimeout(timeout);
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

function fallbackVariant(fund, key) {
  return {
    ...fund.variants[key],
    variant: key,
    nav: null,
    navDate: null,
    source: 'Prototype metadata'
  };
}

async function enrichFund(fund) {
  let rows = [];
  try {
    rows = await fetchAmfiRows();
  } catch {
    rows = [];
  }

  const target = normalize(fund.displayName);
  const matches = rows.filter((row) => row.normalized.includes(target) || target.includes(row.normalized));

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
      source: row ? 'AMFI NAV feed + prototype factsheet metadata' : 'Prototype metadata'
    };
  });

  const payload = { ...fund, variants };
  try {
    await FundSnapshot.create({
      slug: fund.slug,
      source: variants.some((variant) => variant.nav) ? 'amfi' : 'prototype',
      variants,
      metadata: { displayName: fund.displayName, category: fund.category }
    });
  } catch {
    // Mongo is optional for the prototype; failed writes should not block advice.
  }
  return payload;
}

export async function searchFunds(query = '', limit = 8) {
  const term = query.toLowerCase().trim();
  const list = fundCatalog
    .filter((fund) => !term || `${fund.displayName} ${fund.category}`.toLowerCase().includes(term))
    .slice(0, limit);
  return Promise.all(list.map(enrichFund));
}

export async function getFundPair(slugOrQuery) {
  const query = String(slugOrQuery || '').toLowerCase();
  const fund =
    fundCatalog.find((item) => item.slug === query) ||
    fundCatalog.find((item) => item.displayName.toLowerCase().includes(query.replace(/-/g, ' '))) ||
    fundCatalog[0];
  return enrichFund(fund);
}
