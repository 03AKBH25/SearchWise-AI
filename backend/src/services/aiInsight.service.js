import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Simple in-memory rate-limit cooldown: don't retry for 60 seconds after a 429
let rateLimitCooldownUntil = 0;

const SYSTEM_INSTRUCTION = `
ROLE:
You are "SwitchWise Portfolio Strategist", an objective financial auditor. Your task is to analyze a user's mutual fund portfolio data and provide honest, balanced insights.

OBJECTIVITY RULES:
1. DO NOT be biased towards finding problems. If a portfolio is well-managed, praise the user.
2. Categorize insights into:
   - "positive": Celebrates good decisions (e.g., low costs, diversification, risk alignment).
   - "critical": Points out significant risks or cost leakages (e.g., Regular plans, high concentration, risk mismatch).
   - "info": Educational or neutral observations (e.g., sector trends, market positioning).
3. Align insights with the user's "Risk Profile" (Conservative, Moderate, Aggressive).
4. Be numerate: Use percentages and currency (INR) values from the data.
5. Keep descriptions concise: 2 sentences max.

OUTPUT FORMAT:
Return ONLY a JSON array of insight objects:
[
  {
    "type": "positive | critical | info",
    "title": "Short title",
    "description": "Insight text."
  }
]
`;

function compactFund(fund) {
  if (!fund) return null;
  return {
    name: fund.fundName || fund.displayName,
    category: fund.category,
    risk: fund.risk || fund.riskLabel,
    directExpense: fund.directExpense,
    regularExpense: fund.regularExpense,
    currentPlan: fund.currentPlan,
    currentExpense: fund.currentExpense,
    amount: fund.amount,
    currentValue: fund.currentValue,
    years: fund.years,
    lifetimeLoss: fund.lifetimeLoss,
    status: fund.status
  };
}

function compactResults(results = {}) {
  return {
    totalInvested: results.totalInvested,
    currentValue: results.currentValue,
    totalLoss: results.totalLoss,
    actionCount: results.actionCount,
    regularCount: results.regularCount,
    allocation: results.allocation,
    weightedExpense: results.weightedExpense,
    directExpense: results.directExpense,
    funds: (results.funds || []).map(compactFund)
  };
}

export async function generatePortfolioAIInsights(portfolioData, userPreferences = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn('AI Insights: No API key found');
    return [];
  }

  // Skip if we're in a rate-limit cooldown
  if (Date.now() < rateLimitCooldownUntil) {
    console.warn('AI Insights: Skipping due to rate-limit cooldown');
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const data = compactResults(portfolioData);

    const prompt = `
USER CONTEXT:
Risk Profile: ${userPreferences.risk || 'Not specified'}
Goal: ${userPreferences.goal || 'General growth'}

PORTFOLIO DATA:
${JSON.stringify(data)}

Generate 3 balanced insights. Return ONLY the JSON array.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Check if response was blocked by safety filters
    if (!response.candidates || response.candidates.length === 0 || response.candidates[0].finishReason === 'SAFETY') {
      console.warn('AI Insights: Response blocked by safety filters');
      return [];
    }

    const text = response.text();

    // Robust JSON extraction
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.substring(start, end + 1));
    }

    return [];
  } catch (error) {
    if (error?.status === 429 || error?.message?.includes('429')) {
      rateLimitCooldownUntil = Date.now() + 60_000; // Back off for 60 seconds
      console.warn('AI Insights: Rate limit reached (429). Cooling down for 60s.');
    } else {
      console.error('AI Insight Generation Error:', error.message);
    }
    return [];
  }
}
