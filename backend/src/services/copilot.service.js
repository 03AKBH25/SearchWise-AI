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

STRICT RULES:
- You MUST return ONLY valid JSON.
- Do NOT add explanations before or after JSON.
- Do NOT wrap JSON in markdown.
- Do NOT include any extra text.

RESPONSE FORMAT (MANDATORY):
{
  "insight": "One decisive diagnosis, direct answer, or clear explanation of the concept asked.",
  "evidence": "3-5 short lines supporting the insight. Use concrete numbers from context when analyzing funds. If explaining a concept, relate it to the user's portfolio context if possible.",
  "action": "A prioritized decision plan with 2-4 numbered steps, or next logical steps based on the explanation."
}

CONTENT RULES:
- For analyzing funds, use ONLY the data provided in context. Do NOT invent returns, NAV, ratings, or financial values.
- If the user asks for a definition, explanation, or general financial concept (e.g., "what is exit load", "what is drag"), use your expert financial knowledge to answer it clearly.
- If data is missing, clearly say so.

DECISION LOGIC:
- Identify hidden losses (especially Direct vs Regular expense gap).
- Quantify impact using given numbers.
- Prioritize actions based on highest loss.

FORMATTING RULES:
- Insight: clear, direct, and impactful explanation or diagnosis.
- Evidence: structured, bullet-style sentences, but keep it as a JSON string.
- Action: step-by-step, prioritized, but keep it as a JSON string.
- Never place a JSON object inside insight, evidence, or action.

TONE:
- Sound like a senior finance expert explaining the decision calmly.
- Be specific, numerate, and practical.
- No generic phrases, no filler, no vague disclaimers.

CONTEXT AWARENESS:
- Dashboard → summarize portfolio issues
- Portfolio → rank funds by action priority
- Fund → analyze selected fund deeply
- Explore → compare and suggest funds
- General Questions → explain concepts clearly and relate to user context if possible
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

function cleanField(value) {
  if (Array.isArray(value)) return value.map(String).join('\n');
  if (value && typeof value === 'object') return Object.values(value).map(String).join('\n');
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
    if (!parsed) throw new Error('No JSON found');

    const fields = ['insight', 'evidence', 'action'];
    for (const field of fields) {
      if (typeof parsed[field] === 'string' && parsed[field].trim().startsWith('{')) {
        const nested = extractJsonObject(parsed[field]);
        if (nested?.insight || nested?.evidence || nested?.action) parsed = { ...parsed, ...nested };
      }
    }

    return {
      insight: cleanField(parsed.insight),
      evidence: cleanField(parsed.evidence),
      action: cleanField(parsed.action)
    };
  } catch (err) {
    return fallbackResponse(userMessage, context);
  }
}

// -------------------- FALLBACK ENGINE --------------------

function fallbackResponse(userMessage = '', context = {}) {
  const q = String(userMessage || '').toLowerCase();
  const results = context.results || {};
  const funds = [...(results.funds || [])];
  const priorityFunds = funds
    .filter((fund) => fund.currentPlan === 'Regular' || fund.status === 'Needs Action')
    .sort((a, b) => Number(b.lifetimeLoss || 0) - Number(a.lifetimeLoss || 0));

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

  if (shouldUseDeterministicLossAnswer) return fallbackResponse(userMessage, context);

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
    return fallbackResponse(userMessage, context);
  }
}
