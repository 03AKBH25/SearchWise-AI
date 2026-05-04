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
  if (plan === 'Direct') return 'Hold';
  if (loss > Math.max(18000, amount * 0.045) || expenseDiff >= 0.85) return 'Switch';
  if (loss > 3500) return 'Wait';
  return 'Hold';
}

function statusFor(recommendation) {
  if (recommendation === 'Switch') return 'Needs Action';
  if (recommendation === 'Wait') return 'Wait';
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
    optimizedGain: funds.reduce((sum, fund) => sum + Math.max(0, fund.switchedFV - fund.currentFV), 0),
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
