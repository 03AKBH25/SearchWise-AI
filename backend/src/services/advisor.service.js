import { fundCatalog } from '../data/fundCatalog.js';
import { getFundPair, searchFunds } from './amfi.service.js';
import { calculateBeta, calculateSharpeRatio, calculateSortinoRatio } from './financialIntelligence.service.js';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const goalProfiles = {
  wealth_creation: {
    label: 'Wealth creation',
    categories: ['Small Cap', 'Flexi Cap', 'Large Cap'],
    riskFloor: 4,
    horizon: 7
  },
  retirement: {
    label: 'Retirement',
    categories: ['Flexi Cap', 'Large Cap', 'Dynamic Asset Allocation'],
    riskFloor: 3,
    horizon: 10
  },
  passive_income: {
    label: 'Passive income',
    categories: ['Large Cap', 'Dynamic Asset Allocation'],
    riskFloor: 2,
    horizon: 5
  },
  tax_saving: {
    label: 'Tax saving',
    categories: ['ELSS', 'Flexi Cap'],
    riskFloor: 3,
    horizon: 3
  },
  emergency_reserve: {
    label: 'Emergency reserve',
    categories: ['Liquid', 'Ultra Short Duration', 'Low Duration'],
    riskFloor: 1,
    horizon: 1
  },
  child_education: {
    label: 'Child education',
    categories: ['Flexi Cap', 'Large Cap'],
    riskFloor: 3,
    horizon: 8
  },
  short_term: {
    label: 'Short-term parking',
    categories: ['Liquid', 'Low Duration', 'Dynamic Asset Allocation'],
    riskFloor: 1,
    horizon: 2
  },
  // Legacy support
  wealth: {
    label: 'Long-term wealth',
    categories: ['Flexi Cap', 'Large Cap', 'Small Cap'],
    riskFloor: 3,
    horizon: 7
  }
};

function annualizedFutureValue(lumpSum, monthlyContribution, annualReturn, years) {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const lump = lumpSum * Math.pow(1 + monthlyRate, months);
  const sip =
    monthlyRate === 0
      ? monthlyContribution * months
      : monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return lump + sip;
}

function riskScore(fund) {
  if (fund.category === 'Small Cap') return 5;
  if (fund.category === 'Flexi Cap') return 4;
  if (fund.category === 'Large Cap') return 3;
  return 2;
}

function profileFor(payload) {
  return goalProfiles[payload.goalType] || goalProfiles.wealth;
}

function directVariant(fund) {
  return fund.variants.find((variant) => variant.variant === 'direct');
}

function regularVariant(fund) {
  return fund.variants.find((variant) => variant.variant === 'regular');
}

function scoreSwitch(fund, currentVariant, years, amount, monthlyContribution) {
  const current = currentVariant === 'direct' ? directVariant(fund) : regularVariant(fund);
  const target = currentVariant === 'direct' ? regularVariant(fund) : directVariant(fund);
  const currentReturn = fund.expectedGrossReturn - current.expenseRatio / 100;
  const targetReturn = fund.expectedGrossReturn - target.expenseRatio / 100;
  const currentValue = annualizedFutureValue(amount, monthlyContribution, currentReturn, years);
  const targetValue = annualizedFutureValue(amount, monthlyContribution, targetReturn, years);
  const savings = targetValue - currentValue;
  const sharpeCurrent = (currentReturn - fund.riskFreeRate) / fund.standardDeviation;
  const sharpeTarget = (targetReturn - fund.riskFreeRate) / fund.standardDeviation;

  return {
    current,
    target,
    currentValue,
    targetValue,
    savings,
    annualExpenseGap: current.expenseRatio - target.expenseRatio,
    riskAdjustedDelta: sharpeTarget - sharpeCurrent,
    ratios: {
      sharpe: calculateSharpeRatio(currentReturn, fund.riskFreeRate, fund.standardDeviation),
      sortino: calculateSortinoRatio(currentReturn, fund.riskFreeRate, fund.standardDeviation * 0.65),
      beta: calculateBeta(fund.standardDeviation, 0.14, 0.88)
    },
    confidence: Math.round(Math.max(62, Math.min(92, 90 - fund.trackingError * 350)))
  };
}

function scoreCandidate(fund, payload) {
  const profile = profileFor(payload);
  
  // 1. Goal Category Fit (30 points)
  const categoryFit = profile.categories.includes(fund.category) ? 30 : 8;
  
  // 2. Risk Alignment (25 points)
  const userRisk = payload.riskComfort === 'Aggressive' ? 5 : payload.riskComfort === 'Moderate' ? 3 : 2;
  const riskFit = Math.max(0, 25 - Math.abs(riskScore(fund) - userRisk) * 7);
  
  // 3. Horizon Suitability (15 points)
  const userHorizon = parseInt(payload.horizonYears) || profile.horizon;
  const horizonFit = userHorizon >= profile.horizon ? 15 : 7;
  
  // 4. Expense Efficiency (15 points)
  const expense = directVariant(fund).expenseRatio;
  let costFit = Math.max(0, 15 - expense * 8);
  
  // 5. Preference Bonus (15 points)
  let preferenceBonus = 0;
  const pref = payload.preference;
  if (pref === 'Lower risk' && fund.riskLabel === 'Moderate') preferenceBonus = 15;
  if (pref === 'Higher growth' && (fund.category === 'Small Cap' || fund.category === 'Flexi Cap')) preferenceBonus = 15;
  if (pref === 'Lower cost' && expense < 0.6) preferenceBonus = 15;
  if (pref === 'Stable returns' && fund.assetClass === 'Hybrid') preferenceBonus = 15;
  if (pref === 'Tax efficiency' && fund.category === 'ELSS') preferenceBonus = 15;

  const score = Math.round(categoryFit + riskFit + horizonFit + costFit + preferenceBonus);

  return {
    slug: fund.slug,
    displayName: fund.displayName,
    category: fund.category,
    benchmark: fund.benchmark,
    riskLabel: fund.riskLabel,
    aumCrore: fund.aumCrore,
    ratios: {
      sharpe: calculateSharpeRatio(fund.expectedGrossReturn - directVariant(fund).expenseRatio / 100, fund.riskFreeRate, fund.standardDeviation),
      sortino: calculateSortinoRatio(fund.expectedGrossReturn - directVariant(fund).expenseRatio / 100, fund.riskFreeRate, fund.standardDeviation * 0.65),
      beta: calculateBeta(fund.standardDeviation, 0.14, 0.88)
    },
    directExpense: directVariant(fund).expenseRatio,
    regularExpense: regularVariant(fund).expenseRatio,
    nav: directVariant(fund).nav,
    navDate: directVariant(fund).navDate,
    source: directVariant(fund).source,
    fitScore: Math.min(100, score),
    why: [
      `${fund.category} fit for ${profile.label.toLowerCase()}`,
      `Direct expense ratio ${directVariant(fund).expenseRatio}% vs Regular ${regularVariant(fund).expenseRatio}%`,
      `Risk bucket: ${fund.riskLabel}; benchmark: ${fund.benchmark}`
    ],
    caution:
      riskScore(fund) > Number(payload.riskComfort || 3)
        ? 'Higher risk than your selected comfort level; size allocation carefully.'
        : 'Risk level is broadly aligned with your selected comfort level.'
  };
}

function nextBestAction(recommendations, candidates, payload) {
  const topSwitch = recommendations[0];
  if (topSwitch?.score.savings > Number(payload.amount || 250000) * 0.03) {
    return {
    label: 'Compare existing Regular units after checking exit load and tax',
      reason: `${currency.format(topSwitch.score.savings)} modeled benefit over ${topSwitch.input.horizonYears} years is meaningful enough to investigate.`
    };
  }

  return {
    label: 'Start future SIPs in a recommended Direct plan first',
    reason: `${candidates[0]?.displayName || 'A low-cost Direct plan'} is the cleaner first move while tax and exit-load details are uncertain.`
  };
}

export async function discoverFunds(payload = {}) {
  const profile = profileFor(payload);
  const enriched = await Promise.all(fundCatalog.map((fund) => getFundPair(fund.slug)));
  const scored = enriched
    .map((fund) => scoreCandidate(fund, payload))
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 4);

  return {
    profile,
    candidates: scored,
    dataNote:
      'Fund universe is seeded from prototype metadata and enriched with AMFI NAV where available. Production should add official factsheet ingestion for returns, portfolio holdings and rolling-risk stats.'
  };
}

export async function buildAdvice(payload = {}) {
  const holdings = Array.isArray(payload.holdings) && payload.holdings.length ? payload.holdings : [];
  const horizonYears = Number(payload.horizonYears || profileFor(payload).horizon || 10);
  const amount = Number(payload.amount || 250000);
  const monthlyContribution = Number(payload.monthlyContribution || 0);
  const currentVariant = payload.currentVariant || 'regular';
  const discovery = await discoverFunds({ ...payload, horizonYears });

  const holdingInputs = holdings.length
    ? holdings
    : [{ slug: discovery.candidates[0]?.slug || fundCatalog[0].slug, amount, monthlyContribution, currentVariant }];

  const recommendations = [];

  for (const holding of holdingInputs) {
    const fund = await getFundPair(holding.slug || holding.query || payload.query);
    const input = {
      amount: Number(holding.amount || amount),
      monthlyContribution: Number(holding.monthlyContribution || monthlyContribution),
      horizonYears,
      currentVariant: holding.currentVariant || currentVariant
    };
    const score = scoreSwitch(fund, input.currentVariant, input.horizonYears, input.amount, input.monthlyContribution);

    recommendations.push({
      fund: {
        slug: fund.slug,
        displayName: fund.displayName,
        category: fund.category,
        benchmark: fund.benchmark,
        riskLabel: fund.riskLabel,
        exposure: fund.exposure
      },
      input,
      variants: {
        direct: directVariant(fund),
        regular: regularVariant(fund),
        current: score.current,
        recommended: score.target
      },
      score,
      decision:
        score.target.variant === 'direct'
          ? 'Direct has lower expense; verify tax and exit load before any change.'
          : 'Direct already has lower cost; Regular may only make sense if advisory value is explicit.',
      checks: [
        `Expense gap: ${score.annualExpenseGap.toFixed(2)} percentage points each year`,
        `Modeled wealth impact: ${currency.format(score.savings)} before tax and exit load`,
        `Same-scheme switch: exposure should remain materially similar; benchmark is ${fund.benchmark}`,
        `Exit-load rule: ${score.current.exitLoad}`
      ]
    });
  }

  recommendations.sort((a, b) => b.score.savings - a.score.savings);
  const totalSavings = recommendations.reduce((sum, item) => sum + item.score.savings, 0);
  const nextAction = nextBestAction(recommendations, discovery.candidates, { ...payload, amount });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalSavings,
      totalSavingsLabel: currency.format(totalSavings),
      nextAction,
      headline: nextAction.label
    },
    discovery,
    assumptions: [
      'AMFI provides live NAV, not a complete suitability dataset.',
      'Expense, exposure and risk fields are prototype factsheet metadata until a production factsheet pipeline is connected.',
      'This is decision support, not personalized investment advice. Tax, exit load and suitability must be verified.'
    ],
    recommendations
  };
}

export async function searchFundUniverse(query) {
  return searchFunds(query, 12);
}
