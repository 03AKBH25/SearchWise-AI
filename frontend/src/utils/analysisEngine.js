import { fundDataset } from '../data/fundDataset';

const DEFAULT_FUND = {
  fundName: 'Comparable Diversified Equity Fund',
  category: 'Equity',
  directExpense: 0.75,
  regularExpense: 1.65,
  expectedReturn: 11,
  exitLoad: 'Check scheme information document'
};

export function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function detectPlan(name) {
  const text = normalize(name);
  if (text.includes('direct')) return 'Direct';
  return 'Regular';
}

function findFund(name) {
  const text = normalize(name);
  const match = fundDataset.find((fund) => text.includes(fund.key) || fund.key.includes(text));
  return match || { ...DEFAULT_FUND, fundName: name || DEFAULT_FUND.fundName };
}

function futureValue(principal, expectedReturn, expense, years) {
  const annualRate = (expectedReturn - expense) / 100;
  return principal * Math.pow(1 + annualRate, years);
}

function recommendationFor(loss, amount, currentPlan) {
  if (currentPlan === 'Direct') return 'Avoid';
  if (loss > Math.max(15000, amount * 0.05)) return 'Switch';
  if (loss > 2500) return 'Wait';
  return 'Avoid';
}

export function analyzePortfolio(portfolio) {
  const funds = portfolio.map((holding, index) => {
    const fund = findFund(holding.fundName);
    const currentPlan = detectPlan(holding.fundName);
    const years = Number(holding.years || 10);
    const amount = Number(holding.amount || 0);
    const currentExpense = currentPlan === 'Direct' ? fund.directExpense : fund.regularExpense;
    const suggestedExpense = fund.directExpense;
    const currentFV = futureValue(amount, fund.expectedReturn, currentExpense, years);
    const switchedFV = futureValue(amount, fund.expectedReturn, suggestedExpense, years);
    const loss = Math.max(0, switchedFV - currentFV);
    const recommendation = recommendationFor(loss, amount, currentPlan);

    return {
      id: `${index}-${normalize(fund.fundName).replaceAll(' ', '-')}`,
      inputName: holding.fundName,
      fundName: fund.fundName,
      category: fund.category,
      amount,
      years,
      currentPlan,
      suggestedPlan: currentPlan === 'Direct' ? 'Stay Direct' : 'Direct',
      currentExpense,
      suggestedExpense,
      expectedReturn: fund.expectedReturn,
      exitLoad: fund.exitLoad,
      currentFV,
      switchedFV,
      lifetimeLoss: Math.round(loss),
      recommendation,
      chart: Array.from({ length: years + 1 }, (_, year) => ({
        year,
        current: Math.round(futureValue(amount, fund.expectedReturn, currentExpense, year)),
        switched: Math.round(futureValue(amount, fund.expectedReturn, suggestedExpense, year))
      }))
    };
  });

  return {
    funds,
    totalLoss: funds.reduce((sum, fund) => sum + fund.lifetimeLoss, 0),
    actionCount: funds.filter((fund) => fund.recommendation === 'Switch').length,
    generatedAt: new Date().toISOString()
  };
}

export function generateExplanation(fundAnalysis) {
  if (!fundAnalysis) return '';
  if (fundAnalysis.currentPlan === 'Direct') {
    return `${fundAnalysis.fundName} already appears to be in a Direct plan. The co-pilot does not suggest switching away because the lower-cost variant is already selected.`;
  }

  return `${fundAnalysis.fundName} appears to be held in a Regular plan. The Direct plan has a lower annual expense ratio, so more of the same market return stays invested. Over ${fundAnalysis.years} years, that cost gap compounds into an estimated ${formatInr(fundAnalysis.lifetimeLoss)} difference before tax and exit-load effects.`;
}
