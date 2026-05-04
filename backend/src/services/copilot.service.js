import { GoogleGenerativeAI } from '@google/generative-ai';
import { fundCatalog } from '../data/fundCatalog.js';
import dotenv from 'dotenv';

dotenv.config();

const MAX_CONTEXT_CHARS = 24000;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

let geminiModel;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SYSTEM_INSTRUCTION = `
ROLE:
You are "SwitchWise Copilot", a high-end financial intelligence assistant. You are analytical, objective, and precise.

SCOPE & GUARDRAILS:
1. ONLY answer queries related to:
   - Personal finance (savings, budgeting, tax planning).
   - Investments (mutual funds, stocks, fixed deposits, gold).
   - Economics (inflation, interest rates, market trends).
   - Financial definitions and educational concepts.
2. STRICTLY decline non-financial queries (e.g., "how to cook", "write a poem", "sports scores"). 
   - Response for declines: Use type="refusal", title="Out of Scope", and a polite message that you are a specialized financial AI.
3. DATA USAGE: 
   - Use the provided "Evidence context JSON" for any fund-specific analysis.
   - If a fund mentioned by the user is NOT in the context, use your general knowledge but add a note that the specific data is not in the current portfolio view.

STRICT JSON OUTPUT RULES:
- Return ONLY valid JSON.
- No markdown formatting (no \`\`\`json).
- No pre-amble or post-amble text.

RESPONSE STRUCTURE (JSON Schema):
{
  "type": "answer | analysis | comparison | decision | refusal",
  "title": "Concise, professional title",
  "summary": "One-sentence executive summary",
  "blocks": [
    { "type": "paragraph", "text": "Detailed explanation." },
    { "type": "bullets", "title": "Optional", "items": ["point 1", "point 2"] },
    { "type": "steps", "title": "Recommended Path", "items": ["Step 1", "Step 2"] },
    { "type": "table", "title": "Comparison", "columns": ["Col1", "Col2"], "rows": [["val1", "val2"]] },
    { "type": "chart", "chartType": "bar | line", "title": "Trend", "labels": ["Jan", "Feb"], "datasets": [{ "label": "Fund A", "data": [10, 15] }] },
    { "type": "flow", "title": "Process", "steps": ["Input", "Logic", "Output"] },
    { "type": "callout", "tone": "info | warning | success", "text": "Crucial note." }
  ]
}

TONE:
- Professional, senior financial advisor.
- Numerate: Use percentages and currency (INR) where appropriate.
- Direct: Avoid "I hope this helps" or "As an AI".
`;

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  if (!geminiModel) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      geminiModel = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: SYSTEM_INSTRUCTION
      });
    } catch (error) {
      console.error('Failed to initialize Gemini model:', error);
      return null;
    }
  }

  return geminiModel;
}

// -------------------- DATA COMPACTORS --------------------

function compactFund(fund) {
  if (!fund) return null;

  return {
    id: fund.id || fund.slug,
    name: fund.fundName || fund.displayName,
    category: fund.category,
    assetClass: fund.assetClass,
    risk: fund.risk || fund.riskLabel,
    benchmark: fund.benchmark,

    directExpense: fund.directExpense,
    regularExpense: fund.regularExpense,

    expenseGap:
      typeof fund.regularExpense === 'number' &&
        typeof fund.directExpense === 'number'
        ? Number((fund.regularExpense - fund.directExpense).toFixed(2))
        : undefined,

    oneYearReturn: fund.oneYearReturn,
    threeYearReturn: fund.threeYearReturn,
    fiveYearReturn: fund.fiveYearReturn,
    expectedReturn: fund.expectedReturn || fund.expectedGrossReturn,

    exitLoad: fund.exitLoad,
    popularity: fund.popularity,

    currentPlan: fund.currentPlan,
    currentExpense: fund.currentExpense,
    suggestedExpense: fund.suggestedExpense,

    amount: fund.amount,
    currentValue: fund.currentValue,
    years: fund.years,

    lifetimeLoss: fund.lifetimeLoss,
    recommendation: fund.recommendation,
    status: fund.status
  };
}

function compactResults(results = {}) {
  return {
    totalInvested: results.totalInvested,
    currentValue: results.currentValue,
    totalReturns: results.totalReturns,
    totalLoss: results.totalLoss,
    actionCount: results.actionCount,
    regularCount: results.regularCount,
    allocation: results.allocation,
    insights: results.insights,

    highlights: {
      best: compactFund(results.highlights?.best),
      worst: compactFund(results.highlights?.worst),
      expensive: compactFund(results.highlights?.expensive)
    },

    funds: (results.funds || []).map(compactFund)
  };
}

function buildEvidenceContext(context = {}) {
  const payload = {
    page: context.page || 'Dashboard',
    selectedFund: compactFund(context.selectedFund),
    results: compactResults(context.results || {}),
    fundUniverse: (context.fundUniverse || []).map(compactFund),
    backendCatalog: fundCatalog.map((fund) => ({
      slug: fund.slug,
      name: fund.displayName,
      category: fund.category,
      risk: fund.riskLabel,
      benchmark: fund.benchmark,
      aumCrore: fund.aumCrore,
      expectedGrossReturn: fund.expectedGrossReturn,
      standardDeviation: fund.standardDeviation,
      trackingError: fund.trackingError,
      exposure: fund.exposure,
      variants: Object.entries(fund.variants || {}).map(([key, variant]) => ({
        variant: key,
        schemeName: variant.schemeName,
        expenseRatio: variant.expenseRatio,
        nav: variant.nav,
        navDate: variant.navDate,
        exitLoad: variant.exitLoad,
        source: variant.source
      }))
    }))
  };

  const text = JSON.stringify(payload);

  return text.length > MAX_CONTEXT_CHARS
    ? `${text.slice(0, MAX_CONTEXT_CHARS)}...`
    : text;
}

// -------------------- ROBUST PARSER --------------------

function formatInr(value) {
  return currency.format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fundDisplayName(fund) {
  return fund?.fundName || fund?.name || fund?.displayName || 'This fund';
}

function expenseGapFor(fund) {
  return Math.max(
    0,
    Number(fund?.currentExpense || fund?.regularExpense || 0) -
      Number(fund?.suggestedExpense || fund?.directExpense || 0)
  );
}

function isLowExpenseQuery(query) {
  const text = normalize(query);
  return (
    text.includes('low expense') ||
    text.includes('lowest expense') ||
    text.includes('low cost') ||
    text.includes('lowest cost') ||
    text.includes('expense ratio') ||
    text.includes('cheap fund') ||
    text.includes('cheapest fund')
  );
}

function isNifty50Query(query) {
  const text = normalize(query);
  return text.includes('nifty 50') || text.includes('nifty50');
}

function isComparisonTableQuery(query) {
  const text = normalize(query);
  return text.includes('table') || text.includes('tabular') || text.includes('compare') || text.includes('comparison');
}

function isLossQuery(query) {
  const text = normalize(query);
  return text.includes('where') || text.includes('losing') || text.includes('loss') || text.includes('money');
}

function usableReturn(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return number <= 1 ? number * 100 : number;
}

function fundUniverseFrom(context = {}) {
  const byId = new Map();
  for (const fund of [...(context.fundUniverse || []), ...(context.results?.funds || [])]) {
    if (!fund) continue;
    const id = fund.baseFundId || fund.id || fund.slug || fundDisplayName(fund);
    if (!byId.has(id)) byId.set(id, fund);
  }
  for (const fund of fundCatalog) {
    if (byId.has(fund.slug)) continue;
    byId.set(fund.slug, {
      id: fund.slug,
      fundName: fund.displayName,
      category: fund.category,
      assetClass: fund.assetClass,
      risk: fund.riskLabel,
      benchmark: fund.benchmark,
      directExpense: fund.variants?.direct?.expenseRatio,
      regularExpense: fund.variants?.regular?.expenseRatio,
      expectedReturn: fund.expectedGrossReturn,
      exitLoad: fund.variants?.direct?.exitLoad || fund.variants?.regular?.exitLoad,
      popularity: fund.aumCrore
    });
  }
  return [...byId.values()];
}

function lowExpenseShortlistResponse(userMessage = '', context = {}) {
  const funds = fundUniverseFrom(context)
    .filter((fund) => typeof fund.directExpense === 'number')
    .sort(
      (a, b) =>
        Number(a.directExpense || 99) - Number(b.directExpense || 99) ||
        usableReturn(b.fiveYearReturn || b.expectedReturn) - usableReturn(a.fiveYearReturn || a.expectedReturn)
    );
  const top = funds.slice(0, 6);
  const balanced = top.filter((fund) => fund.risk !== 'Very High').slice(0, 3);
  const coreEquity = funds.find((fund) => normalize(fund.category).includes('index')) || funds.find((fund) => fund.assetClass === 'Equity' && fund.risk !== 'Very High') || top[0];
  const conservative = funds.find((fund) => fund.risk === 'Low' || fund.assetClass === 'Debt');
  const hybrid = funds.find((fund) => fund.assetClass === 'Hybrid' || normalize(fund.category).includes('hybrid'));
  const bestReturnLowCost = [...funds]
    .filter((fund) => Number(fund.directExpense || 99) <= 0.75)
    .sort((a, b) => usableReturn(b.fiveYearReturn || b.expectedReturn) - usableReturn(a.fiveYearReturn || a.expectedReturn))[0];

  if (!top.length) {
    return {
      insight: 'I do not have enough fund data in the current context to rank low-expense funds.',
      evidence: 'No funds with Direct expense ratios were available in the provided context.',
      action: '1. Open Explore after fund data loads.\n2. Ask again with your target category, risk level, or investment horizon.'
    };
  }

  return {
    type: isComparisonTableQuery(userMessage) ? 'table' : 'comparison',
    title: 'Low-Expense Fund Shortlist',
    summary: `${fundDisplayName(top[0])} has the lowest visible Direct expense ratio at ${formatPercent(top[0].directExpense)}, but the right choice depends on whether you want equity growth, debt stability, or a balanced fund.`,
    blocks: [
      {
        type: 'table',
        title: 'Ranked by Direct expense ratio',
        columns: ['Rank', 'Fund', 'Direct expense', '5Y/expected return', 'Risk', 'Category', 'Plan gap'],
        rows: top.map((fund, index) => {
          const returnValue = fund.fiveYearReturn ?? fund.expectedReturn;
          const gap = Math.max(0, Number(fund.regularExpense || 0) - Number(fund.directExpense || 0));
          return [
            String(index + 1),
            fundDisplayName(fund),
            formatPercent(fund.directExpense),
            formatPercent(returnValue),
            fund.risk || 'Not available',
            fund.category || 'Not available',
            formatPercent(gap)
          ];
        })
      },
      {
        type: 'bullets',
        title: 'How to read this',
        items: [
          `Lowest visible expense: ${fundDisplayName(top[0])} at ${formatPercent(top[0].directExpense)} Direct expense.`,
          balanced.length
            ? `Lower-volatility shortlist: ${balanced.map((fund) => `${fundDisplayName(fund)} (${formatPercent(fund.directExpense)}, ${fund.risk} risk)`).join('; ')}.`
            : 'Most low-cost options here carry high or very high equity risk, so match them carefully to your horizon.',
          bestReturnLowCost
            ? `Best low-cost return trade-off: ${fundDisplayName(bestReturnLowCost)} has ${formatPercent(bestReturnLowCost.directExpense)} Direct expense with ${formatPercent(bestReturnLowCost.fiveYearReturn ?? bestReturnLowCost.expectedReturn)} ${bestReturnLowCost.fiveYearReturn == null ? 'expected return' : '5Y return'}.`
            : 'Lowest expense alone is not enough; compare category and risk before choosing.'
        ]
      },
      {
        type: 'steps',
        title: 'Decision path',
        items: [
          `Core equity: shortlist ${fundDisplayName(coreEquity)} for low-cost broad-market exposure; verify benchmark fit before investing.`,
          conservative
            ? `Conservative: use ${fundDisplayName(conservative)} if capital stability matters more than equity-like return.`
            : 'If you cannot tolerate sharp drawdowns, filter out Very High risk funds before choosing.',
          hybrid
            ? `Balanced: compare ${fundDisplayName(hybrid)} if you want equity participation with some debt allocation.`
            : 'Ask for a category-specific shortlist, e.g. low expense debt funds or low expense flexi-cap funds.',
          bestReturnLowCost
            ? `Aggressive return: consider ${fundDisplayName(bestReturnLowCost)} only if you can accept ${bestReturnLowCost.risk || 'higher'} risk and category concentration.`
            : 'Use return only after you have matched risk and category.',
          'Before switching existing holdings, check exit load, capital-gains tax, and overlap with funds you already own.'
        ]
      }
    ]
  };
}

function nifty50Response() {
  return {
    type: 'answer',
    title: 'Nifty 50 Explained',
    summary: "The Nifty 50 is a benchmark index that tracks 50 of India's largest and most liquid listed companies.",
    blocks: [
      {
        type: 'paragraph',
        text: 'Think of it as a quick health check for large Indian companies. When people say "the market is up" in India, they often mean indices like the Nifty 50 or Sensex moved up.'
      },
      {
        type: 'bullets',
        title: 'What it represents',
        items: [
          'It includes 50 large companies across sectors such as banks, IT, energy, consumer goods, autos, and healthcare.',
          'It is market-cap weighted, so larger companies influence the index more than smaller ones.',
          'Mutual funds and ETFs use it as a benchmark for large-cap Indian equity performance.'
        ]
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'For investors, a Nifty 50 index fund is usually a low-cost way to get broad large-cap equity exposure, but it still carries equity-market risk.'
      }
    ]
  };
}

function findMentionedFund(query, context = {}) {
  const text = normalize(query);
  const allFunds = [
    ...(context.results?.funds || []),
    ...(context.fundUniverse || []),
    ...(context.selectedFund ? [context.selectedFund] : []),
    ...fundCatalog.map((fund) => ({
      id: fund.slug,
      name: fund.displayName,
      fundName: fund.displayName,
      category: fund.category,
      risk: fund.riskLabel,
      benchmark: fund.benchmark,
      regularExpense: fund.variants?.regular?.expenseRatio,
      directExpense: fund.variants?.direct?.expenseRatio,
      exitLoad: fund.variants?.regular?.exitLoad || fund.variants?.direct?.exitLoad,
      expectedReturn: fund.expectedGrossReturn
    }))
  ];

  return (
    allFunds
      .filter(Boolean)
      .map((fund) => ({ fund, key: normalize(fundDisplayName(fund)) }))
      .filter(({ key }) => {
        if (!key || key === 'this fund' || key === 'fund') return false;
        if (text.includes(key)) return true;
        
        const genericWords = ['fund', 'plan', 'growth', 'direct', 'regular', 'scheme'];
        const parts = key.split(' ').filter((part) => part.length > 2 && !genericWords.includes(part));
        if (parts.length === 0) return false;
        
        const textWords = text.split(/\s+/);
        return parts.every((part) => textWords.includes(part));
      })
      .sort((a, b) => b.key.length - a.key.length)[0]?.fund || null
  );
}

function cleanField(value) {
  if (Array.isArray(value)) return '• ' + value.map(String).join('\n• ');
  if (value && typeof value === 'object') return '• ' + Object.values(value).map(String).join('\n• ');
  return String(value || '').trim();
}

function linesFrom(value) {
  return cleanField(value)
    .split('\n')
    .map((line) => line.replace(/^[•\-\d.\s]+/, '').trim())
    .filter(Boolean);
}

function normalizeTableBlock(block = {}) {
  const columns = Array.isArray(block.columns) ? block.columns.map(String) : [];
  const rows = Array.isArray(block.rows)
    ? block.rows
        .filter((row) => Array.isArray(row) || row && typeof row === 'object')
        .map((row) => {
          if (Array.isArray(row)) return row.map((cell) => String(cell ?? ''));
          return columns.map((column) => String(row[column] ?? row[column.toLowerCase()] ?? ''));
        })
    : [];

  return columns.length && rows.length
    ? { type: 'table', title: block.title ? String(block.title) : '', columns, rows }
    : null;
}

function normalizeBlock(block) {
  if (!block) return null;
  if (typeof block === 'string') return { type: 'paragraph', text: block };
  if (typeof block !== 'object') return null;

  if (block.type === 'table') return normalizeTableBlock(block);
  if (block.type === 'bullets' || block.type === 'steps') {
    const items = Array.isArray(block.items) ? block.items.map(String).filter(Boolean) : linesFrom(block.text);
    return items.length ? { type: block.type, title: block.title ? String(block.title) : '', items } : null;
  }
  if (block.type === 'callout') {
    const text = cleanField(block.text);
    return text ? { type: 'callout', tone: block.tone || 'info', text } : null;
  }

  const text = cleanField(block.text || block.content || block.paragraph);
  return text ? { type: 'paragraph', text } : null;
}

function legacyToBlocks(answer = {}) {
  const blocks = [];
  if (answer.insight) blocks.push({ type: 'paragraph', text: cleanField(answer.insight) });
  if (answer.evidence) blocks.push({ type: 'bullets', title: 'Evidence', items: linesFrom(answer.evidence) });
  if (answer.action) blocks.push({ type: 'steps', title: 'Suggested next steps', items: linesFrom(answer.action) });
  return blocks;
}

function normalizeCopilotResponse(answer, fallbackTitle = 'SwitchWise Copilot') {
  if (!answer) {
    return {
      type: 'answer',
      title: fallbackTitle,
      summary: 'I need a little more context to answer that well.',
      blocks: [{ type: 'paragraph', text: 'Try asking about a fund, expense ratio, portfolio risk, or a comparison you want to make.' }]
    };
  }

  if (typeof answer === 'string') {
    const nested = extractJsonObject(answer);
    if (nested) return normalizeCopilotResponse(nested, fallbackTitle);
    return {
      type: 'answer',
      title: fallbackTitle,
      summary: answer.trim(),
      blocks: [{ type: 'paragraph', text: answer.trim() }]
    };
  }

  const blocks = Array.isArray(answer.blocks)
    ? answer.blocks.map(normalizeBlock).filter(Boolean)
    : legacyToBlocks(answer).map(normalizeBlock).filter(Boolean);
  const summary = cleanField(answer.summary || answer.insight || blocks[0]?.text || '');

  return {
    type: answer.type || (answer.insight || answer.evidence || answer.action ? 'analysis' : 'answer'),
    title: answer.title || fallbackTitle,
    summary,
    blocks: blocks.length ? blocks : [{ type: 'paragraph', text: summary || 'No response content was returned.' }]
  };
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    // Continue to balanced-brace extraction below.
  }

  const start = raw.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') inString = !inString;
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(raw.slice(start, index + 1));
      } catch {
        return null;
      }
    }
  }

  return null;
}

function parseJsonResponse(text, userMessage, context) {
  try {
    let parsed = extractJsonObject(text);
    if (!parsed) {
      if (text && text.trim().length > 10) {
        return normalizeCopilotResponse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
      }
      throw new Error('No JSON found');
    }

    const fields = ['insight', 'evidence', 'action'];
    for (const field of fields) {
      if (typeof parsed[field] === 'string' && parsed[field].trim().startsWith('{')) {
        const nested = extractJsonObject(parsed[field]);
        if (nested?.insight || nested?.evidence || nested?.action) parsed = { ...parsed, ...nested };
        else return normalizeCopilotResponse(fallbackResponse(userMessage, context));
      }
    }

    return normalizeCopilotResponse(parsed);
  } catch (err) {
    console.warn('Failed to parse AI response as JSON:', err.message);
    return normalizeCopilotResponse(fallbackResponse(userMessage, context));
  }
}

// -------------------- FALLBACK ENGINE --------------------

function fallbackResponse(userMessage = '', context = {}) {
  const q = String(userMessage || '').toLowerCase();
  const results = context.results || {};
  const funds = [...(results.funds || [])];
  const mentionedFund = findMentionedFund(userMessage, context);
  const priorityFunds = funds
    .filter((fund) => fund.currentPlan === 'Regular' || fund.status === 'Needs Action')
    .sort((a, b) => Number(b.lifetimeLoss || 0) - Number(a.lifetimeLoss || 0));

  if (isNifty50Query(userMessage)) return nifty50Response();
  if (isLowExpenseQuery(userMessage)) return lowExpenseShortlistResponse(userMessage, context);

  if (mentionedFund && isLossQuery(userMessage)) {
    const inPortfolio =
      funds.find((fund) => normalize(fundDisplayName(fund)) === normalize(fundDisplayName(mentionedFund))) ||
      funds.find((fund) => normalize(fundDisplayName(fund)).includes(normalize(fundDisplayName(mentionedFund)))) ||
      funds.find((fund) => normalize(fundDisplayName(mentionedFund)).includes(normalize(fundDisplayName(fund)))) ||
      mentionedFund;
    const gap = expenseGapFor(inPortfolio);
    const currentExpense = Number(inPortfolio.currentExpense || inPortfolio.regularExpense || 0);
    const directExpense = Number(inPortfolio.suggestedExpense || inPortfolio.directExpense || 0);
    const loss = Number(inPortfolio.lifetimeLoss || 0);

    return {
      type: 'answer',
      title: `${fundDisplayName(inPortfolio)} Cost Drag`,
      summary: loss > 0
        ? `You are losing an estimated ${formatInr(loss)} in ${fundDisplayName(inPortfolio)} from the Regular-vs-Direct cost gap.`
        : `${fundDisplayName(inPortfolio)} does not show visible Regular-plan cost drag in the current portfolio context.`,
      blocks: [
        {
          type: 'bullets',
          title: 'Evidence',
          items: [
            `Current plan: ${inPortfolio.currentPlan || 'Not specified'}.`,
            `Current expense: ${formatPercent(currentExpense)} vs Direct expense: ${formatPercent(directExpense)}.`,
            `Annual cost gap: ${formatPercent(gap)}.`,
            `Modeled horizon: ${Number(inPortfolio.years || 0) || 'not specified'} years; invested amount: ${formatInr(inPortfolio.amount || 0)}.`
          ]
        },
        {
          type: 'steps',
          title: 'Suggested next steps',
          items: [
            'Check exit load and capital-gains tax before switching existing units.',
            'Move future SIPs to Direct if you do not need distributor-led advice.',
            'Compare same-category exposure only if you are changing the fund, not just the plan.'
          ]
        }
      ]
    };
  }

  if (q.includes('summarize') || q.includes('summary') || q.includes('overview')) {
    const totalInvested = Number(results.totalInvested || 0);
    const currentValue = Number(results.currentValue || 0);
    const totalReturns = Number(results.totalReturns || currentValue - totalInvested);
    const topLoss = priorityFunds[0];
    const best = results.highlights?.best;
    const worst = results.highlights?.worst;
    const allocation = (results.allocation || [])
      .filter((item) => Number(item.value || 0) > 0)
      .map((item) => `${item.label}: ${formatInr(item.value)}`)
      .join('\n');

    return {
      insight: results.totalLoss > 0
        ? `Your portfolio has ${results.regularCount || 0} Regular funds creating an estimated ${formatInr(results.totalLoss)} long-term drag.`
        : `Your portfolio is cost-optimized with ${results.regularCount || 0} Regular funds identified.`,
      evidence: [
        `Invested: ${formatInr(totalInvested)}; current value: ${formatInr(currentValue)}; gain: ${formatInr(totalReturns)}.`,
        `Regular funds: ${results.regularCount || 0}; funds needing action: ${results.actionCount || 0}.`,
        topLoss ? `Largest visible drag: ${fundDisplayName(topLoss)} at ${formatInr(topLoss.lifetimeLoss)}.` : '',
        best ? `Best 5Y performer: ${fundDisplayName(best)} at ${formatPercent(best.fiveYearReturn)}.` : '',
        worst ? `Weakest 5Y performer: ${fundDisplayName(worst)} at ${formatPercent(worst.fiveYearReturn)}.` : '',
        allocation ? `Allocation:\n${allocation}` : ''
      ]
        .filter(Boolean)
        .join('\n'),
      action: [
        topLoss ? `1. Review ${fundDisplayName(topLoss)} first to address the largest cost leakage.` : '1. Maintain your current cost-aware strategy.',
        '2. Periodically check for lower-cost Direct variants as fund houses update expense ratios.',
        '3. Ensure your asset allocation remains aligned with your long-term risk comfort.'
      ].join('\n')
    };
  }

  if (mentionedFund && (q.includes('option') || q.includes('what') || q.includes('review') || q.includes('axis') || q.includes('fund'))) {
    const inPortfolio =
      funds.find((fund) => normalize(fundDisplayName(fund)) === normalize(fundDisplayName(mentionedFund))) ||
      funds.find((fund) => normalize(fundDisplayName(fund)).includes(normalize(fundDisplayName(mentionedFund)))) ||
      mentionedFund;
    const gap = expenseGapFor(inPortfolio);
    const currentExpense = Number(inPortfolio.currentExpense || inPortfolio.regularExpense || 0);
    const directExpense = Number(inPortfolio.suggestedExpense || inPortfolio.directExpense || 0);
    const isRegular = inPortfolio.currentPlan === 'Regular' || currentExpense > directExpense;
    const alternatives = (context.fundUniverse || [])
      .filter((fund) => fund.id !== inPortfolio.baseFundId && fund.id !== inPortfolio.id && fund.assetClass === inPortfolio.assetClass)
      .sort((a, b) => Number(a.directExpense || 99) - Number(b.directExpense || 99))
      .slice(0, 2);

    return {
      insight: isRegular
        ? `${fundDisplayName(inPortfolio)} has a clear cost-saving option: shift from Regular to Direct if exit load and tax do not offset the benefit.`
        : `${fundDisplayName(inPortfolio)} is already cost-aware; the decision is whether it still deserves portfolio space versus peers.`,
      evidence: [
        `Current plan: ${inPortfolio.currentPlan || 'Not specified'}; current expense: ${formatPercent(currentExpense)}; Direct expense: ${formatPercent(directExpense)}; annual gap: ${formatPercent(gap)}.`,
        `Estimated drag visible in your portfolio: ${formatInr(inPortfolio.lifetimeLoss || 0)} over the modeled horizon.`,
        `Fund profile: ${inPortfolio.category || 'Category unavailable'}; ${inPortfolio.assetClass || 'asset class unavailable'}; ${inPortfolio.risk || 'risk unavailable'} risk.`,
        typeof inPortfolio.fiveYearReturn === 'number' ? `Performance: 1Y ${formatPercent(inPortfolio.oneYearReturn)}, 3Y ${formatPercent(inPortfolio.threeYearReturn)}, 5Y ${formatPercent(inPortfolio.fiveYearReturn)}.` : '',
        alternatives.length
          ? `Comparable lower-cost options to check: ${alternatives.map((fund) => `${fundDisplayName(fund)} (${formatPercent(fund.directExpense)} Direct expense)`).join('; ')}.`
          : ''
      ]
        .filter(Boolean)
        .join('\n'),
      action: [
        isRegular ? `1. First compare ${fundDisplayName(inPortfolio)} Regular vs Direct; this keeps the same underlying scheme while reducing cost.` : `1. Keep ${fundDisplayName(inPortfolio)} only if its role still fits your goal and risk comfort.`,
        '2. Before switching existing units, check exit load and capital-gains tax.',
        alternatives.length ? '3. Compare it with the listed peers only if you want to change fund/category exposure, not merely reduce plan cost.' : '3. If you want alternatives, compare same-category funds with lower Direct expense and similar risk.'
      ].join('\n')
    };
  }

  if (isLossQuery(userMessage)) {
    const top = priorityFunds.slice(0, 3);
    const totalLoss = Number(results.totalLoss || top.reduce((sum, fund) => sum + Number(fund.lifetimeLoss || 0), 0));

    return {
      insight: `You are losing an estimated ${formatInr(totalLoss)} mainly because ${results.regularCount || top.length} holdings are still in Regular plans instead of lower-cost Direct variants.`,

      evidence: top.length
        ? top
            .map((fund, index) => {
              const gap = Math.max(0, Number(fund.currentExpense || fund.regularExpense || 0) - Number(fund.suggestedExpense || fund.directExpense || 0));
              return `${index + 1}. ${fund.fundName || fund.name}: ${formatInr(fund.lifetimeLoss)} estimated drag; ${formatPercent(fund.currentExpense || fund.regularExpense)} current expense vs ${formatPercent(fund.suggestedExpense || fund.directExpense)} Direct, a ${formatPercent(gap)} annual cost gap.`;
            })
            .join('\n')
        : 'No high-loss Regular-plan holding is visible in the current portfolio context.',

      action: [
        top[0]
          ? `1. Review ${top[0].fundName || top[0].name} first because it contributes the largest visible loss.`
          : '1. Add or select holdings so the loss ranking can be calculated.',
        '2. Check exit load and capital-gains tax before switching existing units.',
        '3. Move future SIPs to Direct where you do not need distributor-led advice.',
        '4. After switching cost-heavy funds, compare category exposure so the portfolio risk does not drift.'
      ].join('\n')
    };
  }

  if (q.includes('recommend') || q.includes('suggest') || q.includes('best')) {
    const universe = (context.fundUniverse || [])
      .filter(Boolean)
      .sort(
        (a, b) =>
          Number(b.fiveYearReturn || 0) - Number(a.fiveYearReturn || 0) ||
          Number(a.directExpense || 99) - Number(b.directExpense || 99)
      )
      .slice(0, 4);

    return {
      insight: universe.length
        ? `The strongest shortlist from the visible universe is ${universe.map((fund) => fund.fundName || fund.name).join(', ')}.`
        : 'I need a visible fund universe before recommending funds.',
      evidence: universe
        .map(
          (fund, index) =>
            `${index + 1}. ${fund.fundName || fund.name}: ${formatPercent(fund.fiveYearReturn)} 5Y return, ${formatPercent(fund.directExpense)} Direct expense, ${fund.risk} risk, ${fund.category} category.`
        )
        .join('\n'),
      action: '1. Pick the fund whose category fits your goal horizon.\n2. Prefer lower expense only when risk and category fit are acceptable.\n3. Avoid replacing a fund purely on past return; compare drawdown comfort, exit load, and tax first.'
    };
  }

  const priorityFund = priorityFunds[0] || funds[0];

  return {
    type: 'analysis',
    title: priorityFund ? `Review: ${priorityFund.fundName || priorityFund.name}` : 'Portfolio Overview',
    summary: priorityFund 
      ? `${priorityFund.fundName || priorityFund.name} is the highest priority for review due to its cost structure.`
      : 'Your portfolio analysis is ready.',
    blocks: [
      {
        type: 'bullets',
        title: 'Current Status',
        items: [
          `Regular funds identified: ${results.regularCount || 0}`,
          `Funds needing immediate action: ${results.actionCount || 0}`,
          `Total estimated lifetime drag: ${formatInr(results.totalLoss || 0)}`
        ]
      },
      priorityFund ? {
        type: 'callout',
        tone: 'warning',
        text: `Priority Fund: ${priorityFund.fundName} has a ${formatInr(priorityFund.lifetimeLoss)} estimated hidden loss.`
      } : null,
      {
        type: 'steps',
        title: 'Suggested Next Steps',
        items: [
          'Open the Action Center to see the full list of Regular-to-Direct opportunities.',
          'Review the Portfolio tab to check performance versus peers.',
          'Check the Explore section for low-cost alternatives in the same categories.'
        ]
      }
    ].filter(Boolean)
  };
}

// -------------------- MAIN FUNCTION --------------------

export async function getCopilotResponse(userMessage = '', context = {}) {
  const query = String(userMessage || '').toLowerCase();
  const page = String(context.page || '').toLowerCase();
  const mentionedFund = findMentionedFund(userMessage, context);
  // Removed aggressive deterministic triggers to allow the AI to handle queries intelligently.
  // Fallback will now only trigger on API failure or missing configuration.

  const model = getGeminiModel();
  if (!model) return normalizeCopilotResponse(fallbackResponse(userMessage, context));

  const prompt = [
    `User question: ${userMessage || 'Give a contextual summary.'}`,
    `Current date: ${new Date().toISOString().slice(0, 10)}`,
    'Evidence context JSON:',
    buildEvidenceContext(context)
  ].join('\n\n');

  let lastError;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json'
        }
      });

      return parseJsonResponse(result.response.text(), userMessage, context);
    } catch (error) {
      lastError = error;
      
      // Retry on 503 (Service Unavailable / High Demand)
      if (error?.status === 503 || error?.message?.includes('503')) {
        console.warn(`[Copilot] 503 Service Unavailable (Attempt ${attempt}/${maxRetries}). Retrying...`);
        if (attempt < maxRetries) {
          await sleep(1500 * attempt); // 1.5s, 3s backoff
          continue;
        }
      }
      
      // If we are not retrying, break the loop
      break;
    }
  }

  // If we reach here, handle the error
  console.error('Copilot final error:', lastError);
  
  if (lastError?.status === 429 || lastError?.message?.includes('429')) {
    return {
      type: 'answer',
      title: 'Copilot Capacity Reached',
      summary: 'SwitchWise Copilot is currently at maximum capacity for the free tier.',
      blocks: [
        { type: 'paragraph', text: 'You have reached the temporary usage limit of the Gemini API free quota.' },
        { type: 'steps', title: 'What to do next', items: ['Please wait a moment before trying again.', 'Consider upgrading to SwitchWise Premium for unlimited, high-priority Copilot access.'] }
      ]
    };
  }
  
  if (lastError?.status === 503 || lastError?.message?.includes('503')) {
    return {
      type: 'answer',
      title: 'AI Model Overloaded',
      summary: 'The underlying AI model is experiencing extremely high demand right now.',
      blocks: [
        { type: 'paragraph', text: 'This is a temporary service issue on the provider side. I attempted to reconnect several times but the service remains unavailable.' },
        { type: 'steps', title: 'Suggested next steps', items: ['Try again in 30-60 seconds.', 'Check your internet connection.', 'If the problem persists, the fallback engine will provide basic portfolio guidance.'] }
      ]
    };
  }
  
  return normalizeCopilotResponse(fallbackResponse(userMessage, context));
}
