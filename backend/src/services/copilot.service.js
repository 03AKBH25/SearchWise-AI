import { GoogleGenerativeAI } from '@google/generative-ai';
import { fundCatalog } from '../data/fundCatalog.js';

const MAX_CONTEXT_CHARS = 24000;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

let geminiModel;

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  if (!geminiModel) {
    const genAI = new GoogleGenerativeAI(apiKey);

    geminiModel = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: `
You are SwitchWise Copilot, an evidence-backed mutual fund decision assistant.

SCOPE:
- You are a senior financial expert. 
- If the user asks about topics completely unrelated to finance, investment, or mutual funds (e.g., cooking, sports, pop culture), politely inform them that your expertise is limited to financial analysis and suggest they ask about their portfolio or mutual fund concepts.

STRICT RULES:
- You MUST return ONLY valid JSON.
- Do NOT add explanations before or after JSON.
- Do NOT wrap JSON in markdown blocks.

RESPONSE FORMAT (MANDATORY):
{
  "insight": "Primary diagnosis or explanation. If the user asks for a table or list, use Markdown formatting inside this string.",
  "evidence": "3-5 short lines supporting the insight. Use concrete numbers from context.",
  "action": "A prioritized decision plan with 2-4 numbered steps."
}

CONTENT RULES:
- For analyzing funds, use ONLY the data provided in context. 
- If the user asks for a definition or general financial concept, use your expert knowledge.
- If the user asks for a specific format (like a table), provide it using Markdown syntax within the "insight" field.

TONE:
- Senior finance expert: calm, specific, numerate, and practical.
- No vague disclaimers or filler phrases.
`
    });
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
    insight: [
      'Low expense shortlist from the visible fund universe:',
      ...top.map((fund, index) => {
        const returnValue = fund.fiveYearReturn ?? fund.expectedReturn;
        const returnLabel = fund.fiveYearReturn == null ? 'expected return' : '5Y return';
        return `${index + 1}. ${fundDisplayName(fund)} - ${formatPercent(fund.directExpense)} Direct expense, ${formatPercent(returnValue)} ${returnLabel}, ${fund.risk || 'risk unavailable'} risk, ${fund.category || 'category unavailable'}.`;
      }),
      '',
      bestReturnLowCost
        ? `Best low-cost return trade-off: ${fundDisplayName(bestReturnLowCost)} has ${formatPercent(bestReturnLowCost.directExpense)} Direct expense with ${formatPercent(bestReturnLowCost.fiveYearReturn ?? bestReturnLowCost.expectedReturn)} ${bestReturnLowCost.fiveYearReturn == null ? 'expected return' : '5Y return'}.`
        : 'Lowest expense alone is not enough; compare category and risk before choosing.'
    ].join('\n'),
    evidence: [
      `Lowest visible expense: ${fundDisplayName(top[0])} at ${formatPercent(top[0].directExpense)} Direct expense.`,
      balanced.length
        ? `Balanced low-cost choices excluding Very High risk: ${balanced.map((fund) => `${fundDisplayName(fund)} (${formatPercent(fund.directExpense)}, ${fund.risk} risk)`).join('; ')}.`
        : 'Most low-cost options here carry high or very high equity risk, so match them carefully to your horizon.',
      ...top.slice(0, 3).map((fund) => {
        const gap = Math.max(0, Number(fund.regularExpense || 0) - Number(fund.directExpense || 0));
        return `${fundDisplayName(fund)}: Regular ${formatPercent(fund.regularExpense)} vs Direct ${formatPercent(fund.directExpense)}, annual plan-cost gap ${formatPercent(gap)}.`;
      })
    ].join('\n'),
    action: [
      `1. Core equity choice: shortlist ${fundDisplayName(coreEquity)} for low-cost broad-market exposure; verify benchmark fit before investing.`,
      conservative
        ? `2. Conservative choice: use ${fundDisplayName(conservative)} if capital stability matters more than equity-like return.`
        : '2. If you cannot tolerate sharp drawdowns, filter out Very High risk funds before choosing.',
      hybrid
        ? `3. Balanced choice: compare ${fundDisplayName(hybrid)} if you want equity participation with some debt allocation.`
        : bestReturnLowCost
          ? `3. If return potential matters after cost, compare ${fundDisplayName(bestReturnLowCost)} against the cheapest option, not just on expense.`
          : '3. Ask for a category-specific shortlist, e.g. low expense debt funds or low expense flexi-cap funds.',
      bestReturnLowCost
        ? `4. Aggressive return choice: consider ${fundDisplayName(bestReturnLowCost)} only if you can accept ${bestReturnLowCost.risk || 'higher'} risk and category concentration.`
        : '4. Ask for a category-specific shortlist, e.g. low expense debt funds or low expense flexi-cap funds.',
      '5. Before switching existing holdings, check exit load, capital-gains tax, and overlap with funds you already own.'
    ].join('\n')
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
        return {
          insight: text.replace(/```json/gi, '').replace(/```/g, '').trim(),
          evidence: "",
          action: ""
        };
      }
      throw new Error('No JSON found');
    }

    const fields = ['insight', 'evidence', 'action'];
    for (const field of fields) {
      if (typeof parsed[field] === 'string' && parsed[field].trim().startsWith('{')) {
        const nested = extractJsonObject(parsed[field]);
        if (nested?.insight || nested?.evidence || nested?.action) parsed = { ...parsed, ...nested };
        else return fallbackResponse(userMessage, context);
      }
    }

    return {
      insight: cleanField(parsed.insight),
      evidence: cleanField(parsed.evidence),
      action: cleanField(parsed.action)
    };
  } catch (err) {
    console.warn('Failed to parse AI response as JSON:', err.message);
    return fallbackResponse(userMessage, context);
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

  if (isLowExpenseQuery(userMessage)) return lowExpenseShortlistResponse(userMessage, context);

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

  if (q.includes('where') || q.includes('losing') || q.includes('loss') || q.includes('money')) {
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
    insight: priorityFund
      ? `${priorityFund.fundName || priorityFund.name} is your highest priority fund to review.`
      : 'Add your portfolio to get insights.',

    evidence: [
      `Regular funds: ${results.regularCount || 0}`,
      `Funds needing action: ${results.actionCount || 0}`,
      `Estimated loss: ${formatInr(results.totalLoss || 0)}`,
      priorityFund
        ? `Top priority: ${priorityFund.fundName || priorityFund.name} with ${formatInr(priorityFund.lifetimeLoss || 0)} estimated drag.`
        : ''
    ]
      .filter(Boolean)
      .join('\n'),

    action:
      '1. Start with the highest-loss Regular plan.\n2. Compare Direct vs Regular expense and exit load.\n3. Switch only after checking tax impact and whether advice from the distributor is worth the cost.'
  };
}

// -------------------- MAIN FUNCTION --------------------

export async function getCopilotResponse(userMessage = '', context = {}) {
  const query = String(userMessage || '').toLowerCase();
  const page = String(context.page || '').toLowerCase();
  const shouldUseDeterministicLossAnswer =
    (page === 'dashboard' || page === 'portfolio') &&
    (query.includes('where') || query.includes('losing') || query.includes('loss') || query.includes('money'));
  const shouldUseDeterministicContextAnswer =
    query.includes('summarize') ||
    query.includes('summary') ||
    query.includes('overview');
  const shouldUseDeterministicLowExpenseAnswer = isLowExpenseQuery(userMessage);

  if (shouldUseDeterministicLossAnswer || shouldUseDeterministicContextAnswer || shouldUseDeterministicLowExpenseAnswer) {
    return fallbackResponse(userMessage, context);
  }

  const model = getGeminiModel();
  if (!model) return fallbackResponse(userMessage, context);

  const prompt = [
    `User question: ${userMessage || 'Give a contextual summary.'}`,
    `Current date: ${new Date().toISOString().slice(0, 10)}`,
    'Evidence context JSON:',
    buildEvidenceContext(context)
  ].join('\n\n');

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
        responseMimeType: 'application/json'
      }
    });

    return parseJsonResponse(result.response.text(), userMessage, context);
  } catch (error) {
    console.error('Copilot error:', error);
    
    if (error?.status === 429 || error?.message?.includes('429')) {
      return {
        insight: "SwitchWise Copilot is currently at maximum capacity for the free tier.",
        evidence: "You have reached the temporary usage limit of the Gemini API free quota.",
        action: "1. Please wait a moment before trying again.\n2. Consider upgrading to SwitchWise Premium for unlimited, high-priority Copilot access."
      };
    }
    
    return fallbackResponse(userMessage, context);
  }
}
