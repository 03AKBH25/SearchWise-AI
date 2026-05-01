export const fundCatalog = [
  {
    slug: 'hdfc-flexi-cap',
    displayName: 'HDFC Flexi Cap Fund',
    category: 'Flexi Cap',
    benchmark: 'NIFTY 500 TRI',
    assetClass: 'Equity',
    expectedGrossReturn: 0.12,
    riskFreeRate: 0.065,
    standardDeviation: 0.168,
    trackingError: 0.021,
    aumCrore: 56789,
    riskLabel: 'Very High',
    exposure: {
      equity: 95.4,
      debt: 0,
      cash: 4.6,
      largeCap: 62,
      midCap: 16,
      smallCap: 17,
      sectors: ['Financials', 'Technology', 'Healthcare']
    },
    variants: {
      direct: {
        schemeName: 'HDFC Flexi Cap Fund - Direct Plan - Growth',
        expenseRatio: 0.76,
        exitLoad: '1% if redeemed within 1 year',
        minSip: 100
      },
      regular: {
        schemeName: 'HDFC Flexi Cap Fund - Growth Plan',
        expenseRatio: 1.64,
        exitLoad: '1% if redeemed within 1 year',
        minSip: 100
      }
    }
  },
  {
    slug: 'axis-bluechip',
    displayName: 'Axis Bluechip Fund',
    category: 'Large Cap',
    benchmark: 'NIFTY 100 TRI',
    assetClass: 'Equity',
    expectedGrossReturn: 0.105,
    riskFreeRate: 0.065,
    standardDeviation: 0.142,
    trackingError: 0.018,
    aumCrore: 33120,
    riskLabel: 'Very High',
    exposure: {
      equity: 96.1,
      debt: 0,
      cash: 3.9,
      largeCap: 88,
      midCap: 7,
      smallCap: 1,
      sectors: ['Financials', 'Automobiles', 'Consumer Staples']
    },
    variants: {
      direct: {
        schemeName: 'Axis Bluechip Fund - Direct Plan - Growth',
        expenseRatio: 0.63,
        exitLoad: '1% if redeemed within 12 months',
        minSip: 100
      },
      regular: {
        schemeName: 'Axis Bluechip Fund - Growth',
        expenseRatio: 1.58,
        exitLoad: '1% if redeemed within 12 months',
        minSip: 100
      }
    }
  },
  {
    slug: 'sbi-small-cap',
    displayName: 'SBI Small Cap Fund',
    category: 'Small Cap',
    benchmark: 'BSE 250 SmallCap TRI',
    assetClass: 'Equity',
    expectedGrossReturn: 0.135,
    riskFreeRate: 0.065,
    standardDeviation: 0.238,
    trackingError: 0.036,
    aumCrore: 31900,
    riskLabel: 'Very High',
    exposure: {
      equity: 91.8,
      debt: 0,
      cash: 8.2,
      largeCap: 3,
      midCap: 19,
      smallCap: 70,
      sectors: ['Capital Goods', 'Consumer Discretionary', 'Chemicals']
    },
    variants: {
      direct: {
        schemeName: 'SBI Small Cap Fund - Direct Plan - Growth',
        expenseRatio: 0.69,
        exitLoad: '1% if redeemed within 1 year',
        minSip: 500
      },
      regular: {
        schemeName: 'SBI Small Cap Fund - Regular Plan - Growth',
        expenseRatio: 1.59,
        exitLoad: '1% if redeemed within 1 year',
        minSip: 500
      }
    }
  },
  {
    slug: 'icici-balanced-advantage',
    displayName: 'ICICI Prudential Balanced Advantage Fund',
    category: 'Dynamic Asset Allocation',
    benchmark: 'NIFTY 50 Hybrid Composite Debt 50:50 Index',
    assetClass: 'Hybrid',
    expectedGrossReturn: 0.092,
    riskFreeRate: 0.065,
    standardDeviation: 0.088,
    trackingError: 0.014,
    aumCrore: 58240,
    riskLabel: 'High',
    exposure: {
      equity: 57.6,
      debt: 31.7,
      cash: 10.7,
      largeCap: 42,
      midCap: 8,
      smallCap: 4,
      sectors: ['Financials', 'Sovereign Debt', 'Energy']
    },
    variants: {
      direct: {
        schemeName: 'ICICI Prudential Balanced Advantage Fund - Direct Plan - Growth',
        expenseRatio: 0.95,
        exitLoad: '1% if redeemed within 1 year',
        minSip: 100
      },
      regular: {
        schemeName: 'ICICI Prudential Balanced Advantage Fund - Growth',
        expenseRatio: 1.72,
        exitLoad: '1% if redeemed within 1 year',
        minSip: 100
      }
    }
  },
  {
    slug: 'parag-parikh-flexi-cap',
    displayName: 'Parag Parikh Flexi Cap Fund',
    category: 'Flexi Cap',
    benchmark: 'NIFTY 500 TRI',
    assetClass: 'Equity',
    expectedGrossReturn: 0.118,
    riskFreeRate: 0.065,
    standardDeviation: 0.151,
    trackingError: 0.026,
    aumCrore: 76850,
    riskLabel: 'Very High',
    exposure: {
      equity: 83.5,
      debt: 0,
      cash: 16.5,
      largeCap: 61,
      midCap: 7,
      smallCap: 6,
      sectors: ['Financials', 'Internet', 'Technology']
    },
    variants: {
      direct: {
        schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
        expenseRatio: 0.63,
        exitLoad: '2% within 365 days, 1% within 730 days',
        minSip: 1000
      },
      regular: {
        schemeName: 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth',
        expenseRatio: 1.35,
        exitLoad: '2% within 365 days, 1% within 730 days',
        minSip: 1000
      }
    }
  }
];
