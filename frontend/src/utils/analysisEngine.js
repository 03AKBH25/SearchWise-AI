import { fundDataset } from '../data/fundDataset';

// Local cache for funds fetched from the DB during a session (e.g. for guest users)
let extendedDataset = [];

export function addToExtendedDataset(fund) {
  if (!fund) return;
  const id = fund.slug || fund.id || fund.baseFundId;
  if (!extendedDataset.find(f => f.id === id)) {
    extendedDataset.push(mapBackendFundToLocal(fund));
  }
}

export function mapBackendFundToLocal(f) {
  if (!f) return null;
  // If it's already in local format, return it
  if (f.id && f.directExpense !== undefined) return f;

  const id = f.slug || f.id || f.baseFundId;
  const direct = f.variants?.direct || f.variants?.[0] || {};
  const regular = f.variants?.regular || f.variants?.[1] || {};

  return {
    id,
    key: (f.displayName || f.fundName || '').toLowerCase(),
    fundName: f.displayName || f.fundName,
    category: f.category || 'Mixed',
    assetClass: f.assetClass || 'Equity',
    risk: f.riskLabel || f.risk || 'Moderate',
    directExpense: direct.expenseRatio || 0.6,
    regularExpense: regular.expenseRatio || 1.5,
    expectedReturn: f.expectedGrossReturn ? f.expectedGrossReturn * 100 : 10,
    oneYearReturn: f.oneYearReturn || 12,
    threeYearReturn: f.threeYearReturn || 11,
    fiveYearReturn: f.fiveYearReturn || 10.5,
    latestNav: direct.nav || f.latestNav,
    navDate: direct.navDate || f.navDate,
    benchmark: f.benchmark || 'NIFTY 50 TRI'
  };
}

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
  return fundDataset.find((fund) => fund.id === id) || extendedDataset.find((fund) => fund.id === id) || null;
}

export function findFund(nameOrId) {
  const byId = findFundById(nameOrId);
  if (byId) return byId;
  const text = normalize(nameOrId);
  const match = [...fundDataset, ...extendedDataset].find((fund) => text.includes(fund.key) || fund.key.includes(text));
  return match || { ...DEFAULT_FUND, fundName: nameOrId || DEFAULT_FUND.fundName };
}

export function futureValue(principal, expectedReturn, expense, years) {
  const annualRate = (expectedReturn - expense) / 100;
  return principal * Math.pow(1 + annualRate, years);
}

export function calculateLumpsum({ principal, annualRate, years }) {
  const r = annualRate / 100;
  const n = 1;

  const futureValue = principal * Math.pow(1 + r / n, n * years);

  return {
    invested: principal,
    returns: futureValue - principal,
    total: futureValue,
  };
}

export function calculateSharpeRatio(returnValue = 0, riskFreeRate = 6.5, standardDeviation = 12) {
  const deviation = Math.max(0.1, Number(standardDeviation || 12));
  return (Number(returnValue || 0) - Number(riskFreeRate || 0)) / deviation;
}

export function calculateSortinoRatio(returnValue = 0, riskFreeRate = 6.5, downsideDeviation = 8) {
  const deviation = Math.max(0.1, Number(downsideDeviation || 8));
  return (Number(returnValue || 0) - Number(riskFreeRate || 0)) / deviation;
}

export function calculateBeta(fundVolatility = 12, marketVolatility = 14, correlation = 0.88) {
  const market = Math.max(0.1, Number(marketVolatility || 14));
  return (Number(fundVolatility || 12) / market) * Number(correlation || 0.88);
}

export function ratioLabel(type, value) {
  if (type === 'beta') {
    if (value < 0.85) return 'Lower volatility';
    if (value <= 1.15) return 'Market-like';
    return 'Higher volatility';
  }
  if (value >= 0.75) return 'Good';
  if (value >= 0.35) return 'Moderate';
  return 'Poor';
}

function weightedAverage(funds, getter, total) {
  if (!funds.length || !total) return 0;
  return funds.reduce((sum, fund) => sum + getter(fund) * (fund.currentValue / total), 0);
}

function allocationImplication(equityPercent) {
  if (equityPercent >= 75) return 'Higher equity exposure means higher volatility can show up during market declines.';
  if (equityPercent <= 35) return 'Lower equity exposure may reduce volatility, but growth can be more muted.';
  return 'Mixed allocation can balance growth participation with some stability.';
}

function recommendationFor(loss, amount, plan, expenseDiff) {
  if (plan === 'Direct') return 'Hold';
  if (loss > Math.max(18000, amount * 0.045) || expenseDiff >= 0.85) return 'Explore';
  if (loss > 3500) return 'Wait';
  return 'Hold';
}

function statusFor(recommendation) {
  if (recommendation === 'Explore') return 'Needs Action';
  if (recommendation === 'Wait') return 'Wait';
  return 'Optimized';
}

export function analyzeHolding(holding, index = 0) {
  const fund = findFund(holding.fundId || holding.fundName);
  const currentPlan = holding.plan || detectPlan(holding.fundName);
  const years = Number(holding.years || 10);
  const amount = Number(holding.amount || 0);
  const units = Number(holding.units || 0);
  
  // Try to use latestNav for current value if units are available
  const latestNav = fund.latestNav || 0;
  // Calculate units from amount if not provided manually
  const effectiveUnits = units > 0 ? units : (latestNav > 0 ? amount / latestNav : 0);
  
  const currentValue = effectiveUnits > 0 
    ? Math.round(effectiveUnits * latestNav) 
    : Number(holding.currentValue || amount);

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
    units: effectiveUnits,
    currentValue,
    years,
    currentPlan,
    suggestedPlan: currentPlan === 'Direct' ? 'Stay Direct' : 'Direct',
    currentExpense,
    suggestedExpense,
    latestNav: fund.latestNav,
    navDate: fund.navDate,
    benchmark: fund.benchmark,
    benchmarkReturn: fund.benchmarkReturn,
    benchmarkVolatility: fund.benchmarkVolatility,
    aumCrore: fund.aumCrore,
    standardDeviation: fund.standardDeviation,
    downsideDeviation: fund.downsideDeviation,
    correlation: fund.correlation,
    beta: calculateBeta(fund.standardDeviation, fund.benchmarkVolatility, fund.correlation),
    sharpeRatio: calculateSharpeRatio(fund.expectedReturn, fund.riskFreeRate, fund.standardDeviation),
    sortinoRatio: calculateSortinoRatio(fund.expectedReturn, fund.riskFreeRate, fund.downsideDeviation),
    directAnnualCost: Math.round((amount * suggestedExpense) / 100),
    regularAnnualCost: Math.round((amount * fund.regularExpense) / 100),
    annualExpenseGap: Math.round((amount * expenseDiff) / 100),
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
  const highExpenseCount = funds.filter((fund) => fund.currentExpense >= 1.35).length;
  const underperformingCount = funds.filter((fund) => fund.fiveYearReturn < (fund.benchmarkReturn || fund.fiveYearReturn) - 1).length;
  const regularCount = funds.filter((fund) => fund.currentPlan === 'Regular').length;
  const totalReturns = currentValue - totalInvested;
  const highExpenseFunds = funds.filter((fund) => fund.currentExpense >= 1.4);
  const allocation = ['Equity', 'Debt', 'Hybrid'].map((assetClass) => ({
    label: assetClass,
    value: funds
      .filter((fund) => fund.assetClass === assetClass)
      .reduce((sum, fund) => sum + fund.currentValue, 0)
  }));
  const allocationPercentages = allocation.map((item) => ({
    ...item,
    percent: currentValue ? Math.round((item.value / currentValue) * 100) : 0
  }));
  const categoryMap = funds.reduce((map, fund) => {
    map[fund.category] = (map[fund.category] || 0) + fund.currentValue;
    return map;
  }, {});
  const categoryDistribution = Object.entries(categoryMap)
    .map(([label, value]) => ({ label, value, percent: currentValue ? Math.round((value / currentValue) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
  const concentrationIssues = topCategory?.[1] > currentValue * 0.45 ? 1 : 0;
  const actionBreakdown = {
    highExpense: highExpenseCount,
    underperformance: underperformingCount,
    concentration: concentrationIssues
  };
  const actionCount = funds.filter((fund) =>
    fund.currentExpense >= 1.35 ||
    fund.fiveYearReturn < (fund.benchmarkReturn || fund.fiveYearReturn) - 1 ||
    fund.status === 'Needs Action'
  ).length + concentrationIssues;
  const equityPercent = allocationPercentages.find((item) => item.label === 'Equity')?.percent || 0;
  const weightedExpense = weightedAverage(funds, (fund) => fund.currentExpense, currentValue);
  const directExpense = weightedAverage(funds, (fund) => fund.suggestedExpense, currentValue);
  const latestNavDate = funds
    .map((fund) => fund.navDate)
    .filter(Boolean)
    .sort()
    .at(-1);
  const ratios = {
    sharpe: weightedAverage(funds, (fund) => fund.sharpeRatio, currentValue),
    sortino: weightedAverage(funds, (fund) => fund.sortinoRatio, currentValue),
    beta: weightedAverage(funds, (fund) => fund.beta, currentValue)
  };
  const ratioSummary = {
    sharpe: { value: ratios.sharpe, label: ratioLabel('sharpe', ratios.sharpe) },
    sortino: { value: ratios.sortino, label: ratioLabel('sortino', ratios.sortino) },
    beta: { value: ratios.beta, label: ratioLabel('beta', ratios.beta) }
  };
  const costComparison = funds.map((fund) => ({
    id: fund.id,
    fundName: fund.fundName,
    currentPlan: fund.currentPlan,
    currentExpense: fund.currentExpense,
    directExpense: fund.suggestedExpense,
    annualExpenseGap: fund.annualExpenseGap,
    longTermImpact: fund.lifetimeLoss
  }));
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
          description: 'Regular variants usually carry higher annual costs than Direct variants.',
          severity: 'high'
        }
      : {
          id: 'regular-plan',
          title: 'All detected plans are Direct',
          detail: 'Your visible plan selection is already cost-aware.',
          description: 'Your visible plan selection is already cost-aware.',
          severity: 'good'
        },
    {
      id: 'expense-ratio',
      title: `${highExpenseFunds.length} high expense funds detected`,
      detail: highExpenseFunds.length ? 'These funds deserve the first review.' : 'No fund crosses the high-cost threshold.',
      description: highExpenseFunds.length ? 'These funds deserve closer review because fees affect NAV each day.' : 'No fund crosses the high-cost threshold.',
      severity: highExpenseFunds.length ? 'medium' : 'good'
    },
    {
      id: 'category-exposure',
      title: `${topCategory?.[0] || 'Equity'} is your largest exposure`,
      detail: topCategory ? `${formatInr(topCategory[1])} sits in this category.` : 'Allocation is spread across categories.',
      description: topCategory ? `${formatInr(topCategory[1])} sits in this category.` : 'Allocation is spread across categories.',
      severity: topCategory?.[1] > currentValue * 0.45 ? 'medium' : 'good'
    },
    {
      id: 'action-count',
      title: `${actionCount} high impact areas detected`,
      detail: 'Priority is based on cost, benchmark difference, and concentration.',
      description: 'Priority is based on cost, benchmark difference, and concentration.',
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
    actionBreakdown,
    regularCount,
    optimizedGain: funds.reduce((sum, fund) => sum + Math.max(0, fund.switchedFV - fund.currentFV), 0),
    allocation,
    allocationPercentages,
    categoryDistribution,
    allocationInsight: allocationImplication(equityPercent),
    weightedExpense,
    directExpense,
    latestNavDate,
    ratios,
    ratioSummary,
    costComparison,
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

function isLowExpenseQuery(query) {
  const q = normalize(query);
  return (
    q.includes('low expense') ||
    q.includes('lowest expense') ||
    q.includes('low cost') ||
    q.includes('lowest cost') ||
    q.includes('expense ratio') ||
    q.includes('cheap fund') ||
    q.includes('cheapest fund')
  );
}

function isNifty50Query(query) {
  const q = normalize(query);
  return q.includes('nifty 50') || q.includes('nifty50');
}

function isComparisonTableQuery(query) {
  const q = normalize(query);
  return q.includes('table') || q.includes('tabular') || q.includes('compare') || q.includes('comparison');
}

function isLossQuery(query) {
  const q = normalize(query);
  return q.includes('where') || q.includes('losing') || q.includes('loss') || q.includes('money');
}

function findMentionedPortfolioFund(query, results = {}) {
  const text = normalize(query);
  const funds = results?.funds || [];
  return funds
    .map((fund) => {
      const name = normalize(fund.fundName || fund.name);
      const key = normalize(fund.key || fund.baseFundId || fund.id);
      const searchable = [name, key].filter(Boolean);
      const genericWords = ['fund', 'plan', 'growth', 'direct', 'regular', 'scheme'];
      const tokens = name.split(' ').filter((part) => part.length > 2 && !genericWords.includes(part));
      const textWords = text.split(/\s+/);
      const matched =
        searchable.some((value) => value && (text.includes(value) || value.includes(text))) ||
        (tokens.length > 0 && tokens.every((token) => textWords.includes(token)));
      return matched ? { fund, score: Math.max(name.length, key.length) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0]?.fund || null;
}

function nifty50Response() {
  return {
    type: 'answer',
    title: 'Nifty 50 Explained',
    summary: "The Nifty 50 is a benchmark index that tracks 50 of India's largest and most liquid listed companies.",
    blocks: [
      {
        type: 'paragraph',
        text: 'Think of it as a quick health check for large Indian companies. When people say the market is up in India, they often mean indices like the Nifty 50 or Sensex moved up.'
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

function lowExpenseShortlistResponse(query = '') {
  const funds = [...fundDataset].sort(
    (a, b) => a.directExpense - b.directExpense || b.fiveYearReturn - a.fiveYearReturn
  );
  const top = funds.slice(0, 6);
  const balanced = top.filter((fund) => fund.risk !== 'Very High').slice(0, 3);
  const coreEquity = funds.find((fund) => fund.category === 'Index Fund') || funds.find((fund) => fund.assetClass === 'Equity' && fund.risk !== 'Very High') || top[0];
  const conservative = funds.find((fund) => fund.risk === 'Low' || fund.assetClass === 'Debt');
  const hybrid = funds.find((fund) => fund.assetClass === 'Hybrid');
  const bestReturnLowCost = [...funds]
    .filter((fund) => fund.directExpense <= 0.75)
    .sort((a, b) => b.fiveYearReturn - a.fiveYearReturn)[0];

  return {
    type: isComparisonTableQuery(query) ? 'table' : 'comparison',
    title: 'Low-Expense Fund Shortlist',
    summary: `${top[0].fundName} has the lowest visible Direct expense ratio at ${formatPercent(top[0].directExpense)}, but the right choice depends on whether you want equity growth, debt stability, or a balanced fund.`,
    blocks: [
      {
        type: 'table',
        title: 'Ranked by Direct expense ratio',
        columns: ['Rank', 'Fund', 'Direct expense', '5Y return', 'Risk', 'Category', 'Plan gap'],
        rows: top.map((fund, index) => [
          String(index + 1),
          fund.fundName,
          formatPercent(fund.directExpense),
          formatPercent(fund.fiveYearReturn),
          fund.risk,
          fund.category,
          formatPercent(Math.max(0, fund.regularExpense - fund.directExpense))
        ])
      },
      {
        type: 'bullets',
        title: 'How to read this',
        items: [
          `Lowest visible expense: ${top[0].fundName} at ${formatPercent(top[0].directExpense)} Direct expense.`,
          `Lower-volatility shortlist: ${balanced.map((fund) => `${fund.fundName} (${formatPercent(fund.directExpense)}, ${fund.risk} risk)`).join('; ')}.`,
          `Best low-cost return trade-off: ${bestReturnLowCost.fundName} combines ${formatPercent(bestReturnLowCost.directExpense)} Direct expense with ${formatPercent(bestReturnLowCost.fiveYearReturn)} 5Y return.`
        ]
      },
      {
        type: 'steps',
        title: 'Decision path',
        items: [
          `Core equity: shortlist ${coreEquity.fundName} for low-cost broad-market exposure; verify benchmark fit before investing.`,
          `Conservative: use ${conservative.fundName} if capital stability matters more than equity-like return.`,
          `Balanced: compare ${hybrid.fundName} if you want equity participation with some debt allocation.`,
          `Aggressive return: consider ${bestReturnLowCost.fundName} only if you can accept ${bestReturnLowCost.risk} risk and category concentration.`,
          'Before switching existing holdings, check exit load, capital-gains tax, and overlap with funds you already own.'
        ]
      }
    ]
  };
}

export function generateCopilotResponse(query, context) {
  const q = normalize(query);
  const { page, results, selectedFund } = context;
  const priorityFund = results?.funds.find((fund) => fund.status === 'Needs Action') || results?.funds[0];
  const loss = formatInr(results?.totalLoss || 0);
  const mentionedFund = findMentionedPortfolioFund(query, results);

  if (isNifty50Query(query)) return nifty50Response();
  if (isLowExpenseQuery(query)) return lowExpenseShortlistResponse(query);

  if (mentionedFund && isLossQuery(query)) {
    const currentExpense = mentionedFund.currentExpense ?? mentionedFund.regularExpense ?? 0;
    const suggestedExpense = mentionedFund.suggestedExpense ?? mentionedFund.directExpense ?? 0;
    const expenseGap = Math.max(0, currentExpense - suggestedExpense);
    const lifetimeLoss = mentionedFund.lifetimeLoss ?? 0;

    return {
      type: 'answer',
      title: `${mentionedFund.fundName} Cost Drag`,
      summary: lifetimeLoss > 0
        ? `You are losing an estimated ${formatInr(lifetimeLoss)} in ${mentionedFund.fundName} from the Regular-vs-Direct cost gap.`
        : `${mentionedFund.fundName} does not show visible Regular-plan cost drag in the current portfolio context.`,
      blocks: [
        {
          type: 'bullets',
          title: 'Evidence',
          items: [
            `Current plan: ${mentionedFund.currentPlan || 'Not specified'}.`,
            `Current expense: ${formatPercent(currentExpense)} vs Direct expense: ${formatPercent(suggestedExpense)}.`,
            `Annual cost gap: ${formatPercent(expenseGap)}.`,
            `Modeled horizon: ${mentionedFund.years || 'not specified'} years; invested amount: ${formatInr(mentionedFund.amount || 0)}.`
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
      action: recommendation === 'Explore' ? 'Review tax and exit load, then compare the lower-cost variant.' : 'Keep it on watch and compare performance against lower-cost peers.'
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
