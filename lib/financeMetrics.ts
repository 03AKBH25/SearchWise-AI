export type NavData = {
  date: string;
  nav: number;
};

export type Fund = {
  fundId: string;
  navHistory: NavData[];
  expenseRatio?: number;
};

export type PortfolioFund = {
  fundId: string;
  weight: number;
  navHistory: NavData[];
};

export type Portfolio = {
  funds: PortfolioFund[];
};

export type Cashflow = {
  date: string;
  amount: number;
};

export type PortfolioMetrics = {
  cagr: number | null;
  volatility: number;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  beta: number | null;
  alpha: number | null;
  maxDrawdown: number;
};

const TRADING_DAYS_PER_YEAR = 252;
const CALENDAR_DAYS_PER_YEAR = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const XIRR_MAX_ITERATIONS = 100;
const XIRR_TOLERANCE = 1e-7;

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const daysBetween = (startDate: string, endDate: string): number | null => {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }

  return (end - start) / MS_PER_DAY;
};

const toReturnByDate = (navHistory: NavData[]): Map<string, number> => {
  const returnsByDate = new Map<string, number>();

  for (let index = 1; index < navHistory.length; index += 1) {
    const previous = navHistory[index - 1]?.nav;
    const current = navHistory[index]?.nav;

    if (!isFiniteNumber(previous) || !isFiniteNumber(current) || previous === 0) {
      continue;
    }

    returnsByDate.set(navHistory[index].date, current / previous - 1);
  }

  return returnsByDate;
};

const getCommonDates = (dateSets: Array<Set<string>>): string[] => {
  if (dateSets.length === 0) {
    return [];
  }

  const [firstSet, ...remainingSets] = dateSets;

  return Array.from(firstSet)
    .filter((date) => remainingSets.every((dateSet) => dateSet.has(date)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
};

const buildPortfolioNavHistory = (portfolio: Portfolio): NavData[] => {
  const validFunds = portfolio.funds.filter(
    (fund) => isFiniteNumber(fund.weight) && fund.weight > 0 && fund.navHistory.length > 0,
  );

  if (validFunds.length === 0) {
    return [];
  }

  const navMaps = validFunds.map((fund) => {
    const navByDate = new Map<string, number>();
    fund.navHistory.forEach((entry) => {
      if (isFiniteNumber(entry.nav) && entry.nav > 0) {
        navByDate.set(entry.date, entry.nav);
      }
    });
    return navByDate;
  });

  const commonDates = getCommonDates(navMaps.map((navByDate) => new Set(navByDate.keys())));

  if (commonDates.length === 0) {
    return [];
  }

  const initialNavs = navMaps.map((navByDate) => navByDate.get(commonDates[0]));
  const totalWeight = validFunds.reduce((sum, fund) => sum + fund.weight, 0);

  if (totalWeight === 0 || initialNavs.some((nav) => !isFiniteNumber(nav ?? NaN) || nav === 0)) {
    return [];
  }

  return commonDates.map((date) => {
    const nav = validFunds.reduce((sum, fund, index) => {
      const currentNav = navMaps[index].get(date);
      const initialNav = initialNavs[index];

      if (!isFiniteNumber(currentNav ?? NaN) || !isFiniteNumber(initialNav ?? NaN) || initialNav === 0) {
        return sum;
      }

      return sum + (fund.weight / totalWeight) * (currentNav as number) / (initialNav as number);
    }, 0);

    return { date, nav };
  });
};

export const mean = (values: number[]): number => {
  const finiteValues = values.filter(isFiniteNumber);

  if (finiteValues.length === 0) {
    return 0;
  }

  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
};

export const variance = (values: number[]): number => {
  const finiteValues = values.filter(isFiniteNumber);

  if (finiteValues.length === 0) {
    return 0;
  }

  const average = mean(finiteValues);
  const squaredDifferences = finiteValues.map((value) => (value - average) ** 2);

  return mean(squaredDifferences);
};

export const stdDev = (values: number[]): number => Math.sqrt(variance(values));

export const covariance = (firstValues: number[], secondValues: number[]): number => {
  const length = Math.min(firstValues.length, secondValues.length);

  if (length === 0) {
    return 0;
  }

  const pairs: Array<[number, number]> = [];

  for (let index = 0; index < length; index += 1) {
    const first = firstValues[index];
    const second = secondValues[index];

    if (isFiniteNumber(first) && isFiniteNumber(second)) {
      pairs.push([first, second]);
    }
  }

  if (pairs.length === 0) {
    return 0;
  }

  const firstMean = mean(pairs.map(([first]) => first));
  const secondMean = mean(pairs.map(([, second]) => second));
  const products = pairs.map(([first, second]) => (first - firstMean) * (second - secondMean));

  return mean(products);
};

export const getDailyReturns = (navHistory: NavData[]): number[] => {
  if (navHistory.length < 2) {
    return [];
  }

  const returns: number[] = [];

  for (let index = 1; index < navHistory.length; index += 1) {
    const previousNav = navHistory[index - 1]?.nav;
    const currentNav = navHistory[index]?.nav;

    if (!isFiniteNumber(previousNav) || !isFiniteNumber(currentNav) || previousNav === 0) {
      continue;
    }

    returns.push(currentNav / previousNav - 1);
  }

  return returns;
};

export const getCAGR = (navHistory: NavData[]): number | null => {
  if (navHistory.length < 2) {
    return null;
  }

  const first = navHistory[0];
  const last = navHistory[navHistory.length - 1];
  const days = daysBetween(first.date, last.date);

  if (
    days === null ||
    days <= 0 ||
    !isFiniteNumber(first.nav) ||
    !isFiniteNumber(last.nav) ||
    first.nav <= 0 ||
    last.nav <= 0
  ) {
    return null;
  }

  const years = days / CALENDAR_DAYS_PER_YEAR;

  return (last.nav / first.nav) ** (1 / years) - 1;
};

export const getVolatility = (dailyReturns: number[]): number => stdDev(dailyReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);

export const getSharpeRatio = (dailyReturns: number[], riskFreeRate = 0.06): number | null => {
  const dailyStdDev = stdDev(dailyReturns);

  if (dailyReturns.length === 0 || dailyStdDev === 0 || !isFiniteNumber(riskFreeRate)) {
    return null;
  }

  const dailyRiskFreeRate = (1 + riskFreeRate) ** (1 / TRADING_DAYS_PER_YEAR) - 1;
  const dailySharpe = (mean(dailyReturns) - dailyRiskFreeRate) / dailyStdDev;

  return dailySharpe * Math.sqrt(TRADING_DAYS_PER_YEAR);
};

export const getSortinoRatio = (dailyReturns: number[], riskFreeRate = 0.06): number | null => {
  if (dailyReturns.length === 0 || !isFiniteNumber(riskFreeRate)) {
    return null;
  }

  const dailyRiskFreeRate = (1 + riskFreeRate) ** (1 / TRADING_DAYS_PER_YEAR) - 1;
  const downsideReturns = dailyReturns.filter((dailyReturn) => dailyReturn < dailyRiskFreeRate);
  const downsideDeviation = stdDev(downsideReturns.map((dailyReturn) => dailyReturn - dailyRiskFreeRate));

  if (downsideDeviation === 0) {
    return null;
  }

  const dailySortino = (mean(dailyReturns) - dailyRiskFreeRate) / downsideDeviation;

  return dailySortino * Math.sqrt(TRADING_DAYS_PER_YEAR);
};

export const getBeta = (fundReturns: number[], benchmarkReturns: number[]): number | null => {
  const benchmarkVariance = variance(benchmarkReturns);

  if (fundReturns.length === 0 || benchmarkReturns.length === 0 || benchmarkVariance === 0) {
    return null;
  }

  return covariance(fundReturns, benchmarkReturns) / benchmarkVariance;
};

export const getAlpha = (
  fundCAGR: number | null,
  benchmarkCAGR: number | null,
  beta: number | null,
  riskFreeRate = 0.06,
): number | null => {
  if (
    fundCAGR === null ||
    benchmarkCAGR === null ||
    beta === null ||
    !isFiniteNumber(fundCAGR) ||
    !isFiniteNumber(benchmarkCAGR) ||
    !isFiniteNumber(beta) ||
    !isFiniteNumber(riskFreeRate)
  ) {
    return null;
  }

  return fundCAGR - (riskFreeRate + beta * (benchmarkCAGR - riskFreeRate));
};

export const getMaxDrawdown = (navHistory: NavData[]): number => {
  if (navHistory.length === 0) {
    return 0;
  }

  let peak = navHistory[0].nav;
  let maxDrawdown = 0;

  for (const entry of navHistory) {
    if (!isFiniteNumber(entry.nav) || entry.nav <= 0) {
      continue;
    }

    if (!isFiniteNumber(peak) || peak <= 0 || entry.nav > peak) {
      peak = entry.nav;
    }

    const drawdown = entry.nav / peak - 1;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  }

  return maxDrawdown;
};

export const getPortfolioReturns = (portfolio: Portfolio): number[] => {
  const validFunds = portfolio.funds.filter((fund) => isFiniteNumber(fund.weight) && fund.weight > 0);

  if (validFunds.length === 0) {
    return [];
  }

  const returnsByFund = validFunds.map((fund) => toReturnByDate(fund.navHistory));
  const commonDates = getCommonDates(returnsByFund.map((returnsByDate) => new Set(returnsByDate.keys())));
  const totalWeight = validFunds.reduce((sum, fund) => sum + fund.weight, 0);

  if (commonDates.length === 0 || totalWeight === 0) {
    return [];
  }

  return commonDates.map((date) =>
    validFunds.reduce((weightedReturn, fund, index) => {
      const dailyReturn = returnsByFund[index].get(date);

      if (!isFiniteNumber(dailyReturn ?? NaN)) {
        return weightedReturn;
      }

      return weightedReturn + (fund.weight / totalWeight) * (dailyReturn as number);
    }, 0),
  );
};

export const getPortfolioMetrics = (portfolio: Portfolio, benchmarkNavHistory: NavData[]): PortfolioMetrics => {
  const portfolioNavHistory = buildPortfolioNavHistory(portfolio);
  const portfolioReturns = getPortfolioReturns(portfolio);
  const benchmarkReturns = getDailyReturns(benchmarkNavHistory);
  const portfolioCAGR = getCAGR(portfolioNavHistory);
  const benchmarkCAGR = getCAGR(benchmarkNavHistory);
  const beta = getBeta(portfolioReturns, benchmarkReturns);

  return {
    cagr: portfolioCAGR,
    volatility: getVolatility(portfolioReturns),
    sharpeRatio: getSharpeRatio(portfolioReturns),
    sortinoRatio: getSortinoRatio(portfolioReturns),
    beta,
    alpha: getAlpha(portfolioCAGR, benchmarkCAGR, beta),
    maxDrawdown: getMaxDrawdown(portfolioNavHistory),
  };
};

export const getXIRR = (cashflows: Cashflow[]): number | null => {
  const validCashflows = cashflows
    .map((cashflow) => ({ ...cashflow, timestamp: Date.parse(cashflow.date) }))
    .filter((cashflow) => Number.isFinite(cashflow.timestamp) && isFiniteNumber(cashflow.amount));

  if (
    validCashflows.length < 2 ||
    !validCashflows.some((cashflow) => cashflow.amount > 0) ||
    !validCashflows.some((cashflow) => cashflow.amount < 0)
  ) {
    return null;
  }

  const firstTimestamp = validCashflows[0].timestamp;
  let rate = 0.1;

  for (let iteration = 0; iteration < XIRR_MAX_ITERATIONS; iteration += 1) {
    let value = 0;
    let derivative = 0;

    for (const cashflow of validCashflows) {
      const years = (cashflow.timestamp - firstTimestamp) / MS_PER_DAY / CALENDAR_DAYS_PER_YEAR;
      const base = 1 + rate;

      if (base <= 0) {
        return null;
      }

      value += cashflow.amount / base ** years;
      derivative += (-years * cashflow.amount) / base ** (years + 1);
    }

    if (Math.abs(value) < XIRR_TOLERANCE) {
      return rate;
    }

    if (derivative === 0) {
      return null;
    }

    const nextRate = rate - value / derivative;

    if (!isFiniteNumber(nextRate) || nextRate <= -1) {
      return null;
    }

    if (Math.abs(nextRate - rate) < XIRR_TOLERANCE) {
      return nextRate;
    }

    rate = nextRate;
  }

  return null;
};
