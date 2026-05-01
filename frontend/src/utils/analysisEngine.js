import { fundDataset } from '../data/fundDataset';

const DEFAULT_FUND = {
  id: 'comparable-fund',
  fundName: 'Comparable Diversified Fund',
  category: 'Diversified',
  assetClass: 'Equity',
  risk: 'Moderate',
  directExpense: 0.75,
  regularExpense: 1.65,
  oneYearReturn: 12,
  threeYearReturn: 11,
  fiveYearReturn: 10.5,
  expectedReturn: 11,
  exitLoad: 'Check scheme information document',
  holdings: ['Large cap equities', 'Mid cap equities', 'Cash'],
  sectors: [
    { label: 'Financials', value: 28 },
    { label: 'Technology', value: 16 },
    { label: 'Consumer', value: 12 },
    { label: 'Other', value: 44 }
  ]
};

export function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function detectPlan(name) {
  const text = normalize(name);
  if (text.includes('direct')) return 'Direct';
  if (text.includes('regular')) return 'Regular';
  return 'Regular';
}

export function findFundById(id) {
  return fundDataset.find((fund) => fund.id === id) || null;
}

export function findFund(nameOrId) {
  const byId = findFundById(nameOrId);
  if (byId) return byId;
  const text = normalize(nameOrId);
  const match = fundDataset.find((fund) => text.includes(fund.key) || fund.key.includes(text));
  return match || { ...DEFAULT_FUND, fundName: nameOrId || DEFAULT_FUND.fundName };
}

export function futureValue(principal, expectedReturn, expense, years) {
  const annualRate = (expectedReturn - expense) / 100;
  return principal * Math.pow(1 + annualRate, years);
}

function recommendationFor(loss, amount, plan, expenseDiff) {
  if (plan === 'Direct') return 'Avoid';
  if (loss > Math.max(18000, amount * 0.045) || expenseDiff >= 0.85) return 'Switch';
  if (loss > 3500) return 'Wait';
  return 'Avoid';
}

function statusFor(recommendation) {
  if (recommendation === 'Switch') return 'Needs Action';
  if (recommendation === 'Wait') return 'Review';
  return 'Optimized';
}

export function analyzeHolding(holding, index = 0) {
  const fund = findFund(holding.fundId || holding.fundName);
  const currentPlan = holding.plan || detectPlan(holding.fundName);
  const years = Number(holding.years || 10);
  const amount = Number(holding.amount || 0);
  const currentValue = Number(holding.currentValue || amount);
  const currentExpense = currentPlan === 'Direct' ? fund.directExpense : fund.regularExpense;
  const suggestedExpense = fund.directExpense;
  const currentFV = futureValue(amount, fund.expectedReturn, currentExpense, years);
  const directFV = futureValue(amount, fund.expectedReturn, suggestedExpense, years);
  const lifetimeLoss = Math.max(0, directFV - currentFV);
  const expenseDiff = Math.max(0, currentExpense - suggestedExpense);
  const recommendation = recommendationFor(lifetimeLoss, amount, currentPlan, expenseDiff);

  return {
    ...fund,
    id: `${fund.id}-${index}`,
    baseFundId: fund.id,
    inputName: holding.fundName,
    amount,
    currentValue,
    years,
    currentPlan,
    suggestedPlan: currentPlan === 'Direct' ? 'Stay Direct' : 'Direct',
    currentExpense,
    suggestedExpense,
    currentFV,
    switchedFV: directFV,
    lifetimeLoss: Math.round(lifetimeLoss),
    recommendation,
    status: statusFor(recommendation),
    chart: Array.from({ length: years + 1 }, (_, year) => ({
      year,
      current: Math.round(futureValue(amount, fund.expectedReturn, currentExpense, year)),
      switched: Math.round(futureValue(amount, fund.expectedReturn, suggestedExpense, year))
    }))
  };
}

export function analyzePortfolio(portfolio) {
  const funds = portfolio.map(analyzeHolding);
  const totalInvested = funds.reduce((sum, fund) => sum + fund.amount, 0);
  const currentValue = funds.reduce((sum, fund) => sum + fund.currentValue, 0);
  const totalLoss = funds.reduce((sum, fund) => sum + fund.lifetimeLoss, 0);
  const actionCount = funds.filter((fund) => fund.status === 'Needs Action').length;
  const regularCount = funds.filter((fund) => fund.currentPlan === 'Regular').length;
  const highExpenseFunds = funds.filter((fund) => fund.currentExpense >= 1.4);
  const allocation = ['Equity', 'Debt', 'Hybrid'].map((assetClass) => ({
    label: assetClass,
    value: funds
      .filter((fund) => fund.assetClass === assetClass)
      .reduce((sum, fund) => sum + fund.currentValue, 0)
  }));
  const categoryMap = funds.reduce((map, fund) => {
    map[fund.category] = (map[fund.category] || 0) + fund.currentValue;
    return map;
  }, {});
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
  const totalReturns = currentValue - totalInvested;
  const performance = Array.from({ length: 9 }, (_, index) => {
    const year = 2018 + index;
    const progress = index / 8;
    const value = Math.round(totalInvested * (0.72 + progress * 0.28) + totalReturns * Math.pow(progress, 1.35));
    return { year, value };
  });

  const insights = [
    regularCount
      ? {
          id: 'regular-plan',
          title: `${regularCount} funds in Regular plans`,
          detail: 'Regular variants usually carry higher annual costs than Direct variants.',
          severity: 'high'
        }
      : {
          id: 'regular-plan',
          title: 'All detected plans are Direct',
          detail: 'Your visible plan selection is already cost-aware.',
          severity: 'good'
        },
    {
      id: 'expense-ratio',
      title: `${highExpenseFunds.length} high expense funds detected`,
      detail: highExpenseFunds.length ? 'These funds deserve the first review.' : 'No fund crosses the high-cost threshold.',
      severity: highExpenseFunds.length ? 'medium' : 'good'
    },
    {
      id: 'category-exposure',
      title: `${topCategory?.[0] || 'Equity'} is your largest exposure`,
      detail: topCategory ? `${formatInr(topCategory[1])} sits in this category.` : 'Allocation is spread across categories.',
      severity: topCategory?.[1] > currentValue * 0.45 ? 'medium' : 'good'
    },
    {
      id: 'action-count',
      title: `${actionCount} funds need switching`,
      detail: 'Priority is based on cost drag and compounding impact.',
      severity: actionCount ? 'high' : 'good'
    }
  ];

  const best = [...funds].sort((a, b) => b.fiveYearReturn - a.fiveYearReturn)[0];
  const worst = [...funds].sort((a, b) => a.fiveYearReturn - b.fiveYearReturn)[0];
  const expensive = [...funds].sort((a, b) => b.currentExpense - a.currentExpense)[0];

  return {
    funds,
    totalInvested,
    currentValue,
    totalReturns,
    totalLoss,
    actionCount,
    regularCount,
    allocation,
    performance,
    insights,
    highlights: { best, worst, expensive },
    generatedAt: new Date().toISOString()
  };
}

export function getFundAlternatives(baseFundId, limit = 3) {
  const fund = findFundById(baseFundId);
  return fundDataset
    .filter((item) => item.id !== baseFundId && (!fund || item.assetClass === fund.assetClass))
    .sort((a, b) => a.directExpense - b.directExpense || b.fiveYearReturn - a.fiveYearReturn)
    .slice(0, limit);
}

export function generateCopilotResponse(query, context) {
  const q = normalize(query);
  const { page, results, selectedFund } = context;
  const priorityFund = results?.funds.find((fund) => fund.status === 'Needs Action') || results?.funds[0];
  const loss = formatInr(results?.totalLoss || 0);

  if (page === 'Explore' || q.includes('low risk') || q.includes('alternative')) {
    const lowCost = fundDataset.filter((fund) => fund.risk !== 'Very High').sort((a, b) => a.directExpense - b.directExpense)[0];
    return {
      insight: `${lowCost.fundName} is the cleanest low-cost candidate in this mock universe.`,
      evidence: `${lowCost.category}, ${lowCost.risk} risk, ${formatPercent(lowCost.directExpense)} Direct expense ratio, and ${lowCost.fiveYearReturn.toFixed(1)}% 5Y return.`,
      action: 'Use Explore filters for Moderate or Low risk and expense below 0.75%, then compare it with your highest-cost holding.'
    };
  }

  if (page === 'Fund' && selectedFund) {
    const currentExpense = selectedFund.currentExpense ?? selectedFund.regularExpense ?? selectedFund.directExpense;
    const suggestedExpense = selectedFund.suggestedExpense ?? selectedFund.directExpense;
    const lifetimeLoss = selectedFund.lifetimeLoss ?? 0;
    const recommendation = selectedFund.recommendation ?? 'Wait';
    return {
      insight: `${selectedFund.fundName} looks ${currentExpense > suggestedExpense ? 'costly in your current variant' : 'cost-efficient in Direct form'}.`,
      evidence: `Current expense is ${formatPercent(currentExpense)} versus ${formatPercent(suggestedExpense)} for Direct. Estimated cost drag is ${formatInr(lifetimeLoss)}.`,
      action: recommendation === 'Switch' ? 'Review tax and exit load, then prioritize switching this holding.' : 'Keep it on watch and compare performance against lower-cost peers.'
    };
  }

  if (page === 'Portfolio' || q.includes('rank') || q.includes('fix')) {
    return {
      insight: `${priorityFund?.fundName || 'Your first holding'} is the first fund to review.`,
      evidence: `It is marked ${priorityFund?.status || 'Review'} with an estimated hidden loss of ${formatInr(priorityFund?.lifetimeLoss || 0)}.`,
      action: 'Sort by Needs Action and fix Regular plans before spending time on already optimized funds.'
    };
  }

  return {
    insight: `Your portfolio shows an estimated hidden loss of ${loss}.`,
    evidence: `${results?.regularCount || 0} Regular plans were detected and ${results?.actionCount || 0} funds need action based on expense drag.`,
    action: 'Start with the Action Center, then open Portfolio to review the funds ranked by loss.'
  };
}
