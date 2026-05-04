export function calculateSharpeRatio(returnValue = 0, riskFreeRate = 0.065, standardDeviation = 0.12) {
  const deviation = Math.max(0.001, Number(standardDeviation || 0.12));
  return (Number(returnValue || 0) - Number(riskFreeRate || 0)) / deviation;
}

export function calculateSortinoRatio(returnValue = 0, riskFreeRate = 0.065, downsideDeviation = 0.08) {
  const deviation = Math.max(0.001, Number(downsideDeviation || 0.08));
  return (Number(returnValue || 0) - Number(riskFreeRate || 0)) / deviation;
}

export function calculateBeta(fundVolatility = 0.12, marketVolatility = 0.14, correlation = 0.88) {
  const market = Math.max(0.001, Number(marketVolatility || 0.14));
  return (Number(fundVolatility || 0.12) / market) * Number(correlation || 0.88);
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

export function calculateAllocation(holdings = []) {
  const total = holdings.reduce((sum, holding) => sum + Number(holding.currentValue || holding.amount || 0), 0) || 1;
  const buckets = holdings.reduce((map, holding) => {
    const assetClass = holding.assetClass || 'Equity';
    map[assetClass] = (map[assetClass] || 0) + Number(holding.currentValue || holding.amount || 0);
    return map;
  }, {});

  return ['Equity', 'Debt', 'Hybrid'].map((label) => ({
    label,
    value: buckets[label] || 0,
    percent: Math.round(((buckets[label] || 0) / total) * 100)
  }));
}

export function estimateCostImpact(amount = 0, currentExpense = 0, directExpense = 0, years = 10, expectedReturn = 0.1) {
  const principal = Number(amount || 0);
  const horizon = Math.max(1, Number(years || 10));
  const currentRate = Number(expectedReturn || 0.1) - Number(currentExpense || 0) / 100;
  const directRate = Number(expectedReturn || 0.1) - Number(directExpense || 0) / 100;
  const currentValue = principal * Math.pow(1 + currentRate, horizon);
  const directValue = principal * Math.pow(1 + directRate, horizon);

  return {
    annualExpenseGap: Math.max(0, (principal * (Number(currentExpense || 0) - Number(directExpense || 0))) / 100),
    longTermImpact: Math.max(0, directValue - currentValue)
  };
}
