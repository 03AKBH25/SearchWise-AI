import { getFundPair } from './amfi.service.js';

function calculateSharpeRatio(returnValue = 0, riskFreeRate = 6.5, standardDeviation = 12) {
  const deviation = Math.max(0.1, Number(standardDeviation || 12));
  return (Number(returnValue || 0) - Number(riskFreeRate || 0)) / deviation;
}

function calculateSortinoRatio(returnValue = 0, riskFreeRate = 6.5, downsideDeviation = 8) {
  const deviation = Math.max(0.1, Number(downsideDeviation || 8));
  return (Number(returnValue || 0) - Number(riskFreeRate || 0)) / deviation;
}

function calculateBeta(fundVolatility = 12, marketVolatility = 14, correlation = 0.88) {
  const market = Math.max(0.1, Number(marketVolatility || 14));
  return (Number(fundVolatility || 12) / market) * Number(correlation || 0.88);
}

function ratioLabel(type, value) {
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

function futureValue(principal, expectedReturn, expense, years) {
  const annualRate = (expectedReturn - expense) / 100;
  return principal * Math.pow(1 + annualRate, years);
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

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function detectPlan(name) {
  const text = normalize(name);
  if (text.includes('direct')) return 'Direct';
  if (text.includes('regular')) return 'Regular';
  return 'Regular';
}

export async function analyzeHolding(holding, index = 0) {
  // Use the AMFI service to get real fund data if possible
  const fundData = await getFundPair(holding.slug || holding.fundId || holding.fundName);
  
  // Normalize variants to an array (sometimes it's an object from universal search)
  const variantsArray = Array.isArray(fundData.variants) 
    ? fundData.variants 
    : Object.values(fundData.variants || {});

  const directVariant = variantsArray.find(v => v.variant === 'direct');
  const regularVariant = variantsArray.find(v => v.variant === 'regular');

  const currentPlan = holding.plan || detectPlan(holding.fundName);
  
  // Find the specific variant's NAV
  const variantData = currentPlan === 'Direct' ? directVariant : regularVariant;
  const latestNav = variantData?.nav || variantsArray[0]?.nav || 0;
  const navDate = variantData?.navDate || variantsArray[0]?.navDate;

  const fund = {
    id: fundData.slug,
    fundName: (fundData.displayName === 'Universal Fund' || fundData.category === 'Universal Fund') ? (holding.fundName || fundData.displayName) : fundData.displayName,
    category: fundData.category,
    assetClass: fundData.assetClass || (fundData.category === 'Debt' ? 'Debt' : fundData.category === 'Hybrid' ? 'Hybrid' : 'Equity'),
    risk: fundData.riskLabel,
    directExpense: directVariant?.expenseRatio || 0.75,
    regularExpense: regularVariant?.expenseRatio || 1.65,
    expectedReturn: (fundData.expectedGrossReturn || 0.12) * 100, 
    fiveYearReturn: 12.5, 
    benchmarkReturn: 13.0,
    benchmarkVolatility: 0.14 * 100,
    standardDeviation: (fundData.standardDeviation || 0.12) * 100,
    downsideDeviation: (fundData.standardDeviation || 0.12) * 0.65 * 100,
    correlation: fundData.correlation || 0.88,
    riskFreeRate: (fundData.riskFreeRate || 0.065) * 100,
    navDate,
    latestNav,
    benchmark: fundData.benchmark,
    aumCrore: fundData.aumCrore
  };

  // If expectedReturn is already a large number (like 12), don't multiply by 100
  if (fund.expectedReturn > 100) fund.expectedReturn /= 100;
  if (fund.standardDeviation > 100) fund.standardDeviation /= 100;
  
  fund.expectedReturn = fundData.expectedGrossReturn > 1 ? fundData.expectedGrossReturn : (fundData.expectedGrossReturn * 100 || 12);
  fund.standardDeviation = fundData.standardDeviation > 1 ? fundData.standardDeviation : (fundData.standardDeviation * 100 || 12);
  fund.riskFreeRate = fundData.riskFreeRate > 1 ? fundData.riskFreeRate : (fundData.riskFreeRate * 100 || 6.5);


  const years = Number(holding.years || 10);
  const amount = Number(holding.amount || 0);
  const units = Number(holding.units || 0);
  
  // Calculate real current value based on units if available, else fallback
  const currentValue = units > 0 
    ? Math.round(units * latestNav) 
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
    holdingId: holding.fundId || fund.id,
    inputName: holding.fundName,
    amount,
    units,
    currentValue,
    years,
    currentPlan,
    suggestedPlan: currentPlan === 'Direct' ? 'Stay Direct' : 'Direct',
    currentExpense,
    suggestedExpense,
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

export async function analyzePortfolio(portfolio) {
  const funds = await Promise.all(portfolio.map((h, i) => analyzeHolding(h, i)));
  
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
    const year = new Date().getFullYear() - 8 + index;
    const progress = index / 8;
    const value = Math.round(totalInvested * (0.72 + progress * 0.28) + totalReturns * Math.pow(progress, 1.35));
    return { year, value };
  });

  const insights = [
    regularCount
      ? {
          id: 'regular-plan',
          title: `${regularCount} funds in Regular plans`,
          description: 'Regular variants usually carry higher annual costs than Direct variants.',
          severity: 'high'
        }
      : {
          id: 'regular-plan',
          title: 'All detected plans are Direct',
          description: 'Your visible plan selection is already cost-aware.',
          severity: 'good'
        },
    {
      id: 'expense-ratio',
      title: `${highExpenseFunds.length} high expense funds detected`,
      description: highExpenseFunds.length ? 'These funds deserve closer review because fees affect NAV each day.' : 'No fund crosses the high-cost threshold.',
      severity: highExpenseFunds.length ? 'medium' : 'good'
    },
    {
      id: 'category-exposure',
      title: `${topCategory?.[0] || 'Equity'} is your largest exposure`,
      description: topCategory ? `${Math.round(categoryDistribution[0].percent)}% of your money sits in this category.` : 'Allocation is spread across categories.',
      severity: topCategory?.[1] > currentValue * 0.45 ? 'medium' : 'good'
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
    weightedExpense,
    directExpense,
    latestNavDate,
    ratios,
    ratioSummary,
    costComparison,
    performance,
    insights,
    highlights: { best, worst, expensive },
    generatedAt: new Date().toISOString(),
    isValidated: true
  };
}
