export const fundDataset = [
  {
    id: 'hdfc-flexi-cap',
    key: 'hdfc flexi cap',
    fundName: 'HDFC Flexi Cap Fund',
    category: 'Flexi Cap',
    assetClass: 'Equity',
    risk: 'High',
    directExpense: 0.76,
    regularExpense: 1.64,
    oneYearReturn: 21.4,
    threeYearReturn: 18.1,
    fiveYearReturn: 17.2,
    expectedReturn: 12,
    exitLoad: '1% if redeemed within 1 year',
    popularity: 91,
    holdings: ['HDFC Bank', 'ICICI Bank', 'Larsen & Toubro', 'Bharti Airtel', 'Infosys'],
    sectors: [
      { label: 'Financials', value: 31 },
      { label: 'Technology', value: 15 },
      { label: 'Industrials', value: 13 },
      { label: 'Consumer', value: 11 }
    ]
  },
  {
    id: 'axis-bluechip',
    key: 'axis bluechip',
    fundName: 'Axis Bluechip Fund',
    category: 'Large Cap',
    assetClass: 'Equity',
    risk: 'Moderate',
    directExpense: 0.63,
    regularExpense: 1.58,
    oneYearReturn: 14.8,
    threeYearReturn: 11.7,
    fiveYearReturn: 12.5,
    expectedReturn: 10.5,
    exitLoad: '1% if redeemed within 12 months',
    popularity: 77,
    holdings: ['Bajaj Finance', 'TCS', 'Avenue Supermarts', 'Kotak Mahindra Bank', 'Reliance Industries'],
    sectors: [
      { label: 'Financials', value: 28 },
      { label: 'Technology', value: 16 },
      { label: 'Consumer', value: 14 },
      { label: 'Energy', value: 10 }
    ]
  },
  {
    id: 'sbi-small-cap',
    key: 'sbi small cap',
    fundName: 'SBI Small Cap Fund',
    category: 'Small Cap',
    assetClass: 'Equity',
    risk: 'Very High',
    directExpense: 0.69,
    regularExpense: 1.59,
    oneYearReturn: 28.2,
    threeYearReturn: 24.3,
    fiveYearReturn: 23.8,
    expectedReturn: 13.5,
    exitLoad: '1% if redeemed within 1 year',
    popularity: 86,
    holdings: ['Blue Star', 'Kalpataru Projects', 'Carborundum Universal', 'V-Guard', 'Finolex Cables'],
    sectors: [
      { label: 'Industrials', value: 25 },
      { label: 'Consumer', value: 18 },
      { label: 'Financials', value: 13 },
      { label: 'Materials', value: 12 }
    ]
  },
  {
    id: 'icici-balanced-advantage',
    key: 'icici balanced advantage',
    fundName: 'ICICI Prudential Balanced Advantage Fund',
    category: 'Dynamic Asset Allocation',
    assetClass: 'Hybrid',
    risk: 'Moderate',
    directExpense: 0.95,
    regularExpense: 1.72,
    oneYearReturn: 12.9,
    threeYearReturn: 11.1,
    fiveYearReturn: 10.6,
    expectedReturn: 9.2,
    exitLoad: '1% if redeemed within 1 year',
    popularity: 82,
    holdings: ['ICICI Bank', 'NTPC', 'HDFC Bank', 'Government Securities', 'Infosys'],
    sectors: [
      { label: 'Financials', value: 24 },
      { label: 'Debt', value: 22 },
      { label: 'Energy', value: 12 },
      { label: 'Technology', value: 9 }
    ]
  },
  {
    id: 'parag-parikh-flexi-cap',
    key: 'parag parikh flexi cap',
    fundName: 'Parag Parikh Flexi Cap Fund',
    category: 'Flexi Cap',
    assetClass: 'Equity',
    risk: 'High',
    directExpense: 0.63,
    regularExpense: 1.35,
    oneYearReturn: 19.2,
    threeYearReturn: 17.4,
    fiveYearReturn: 18.6,
    expectedReturn: 11.8,
    exitLoad: '2% within 365 days, 1% within 730 days',
    popularity: 94,
    holdings: ['Alphabet', 'HDFC Bank', 'Bajaj Holdings', 'Coal India', 'ITC'],
    sectors: [
      { label: 'Financials', value: 27 },
      { label: 'Global Tech', value: 19 },
      { label: 'Consumer', value: 13 },
      { label: 'Energy', value: 9 }
    ]
  },
  {
    id: 'nippon-nifty-50',
    key: 'nippon india index nifty 50',
    fundName: 'Nippon India Index Fund - Nifty 50 Plan',
    category: 'Index Fund',
    assetClass: 'Equity',
    risk: 'Moderate',
    directExpense: 0.18,
    regularExpense: 0.62,
    oneYearReturn: 16.1,
    threeYearReturn: 13.3,
    fiveYearReturn: 14.7,
    expectedReturn: 10.2,
    exitLoad: 'No exit load',
    popularity: 88,
    holdings: ['Reliance Industries', 'HDFC Bank', 'ICICI Bank', 'Infosys', 'Larsen & Toubro'],
    sectors: [
      { label: 'Financials', value: 33 },
      { label: 'Technology', value: 14 },
      { label: 'Energy', value: 12 },
      { label: 'Consumer', value: 10 }
    ]
  },
  {
    id: 'kotak-corporate-bond',
    key: 'kotak corporate bond',
    fundName: 'Kotak Corporate Bond Fund',
    category: 'Corporate Bond',
    assetClass: 'Debt',
    risk: 'Low',
    directExpense: 0.32,
    regularExpense: 0.88,
    oneYearReturn: 7.8,
    threeYearReturn: 6.6,
    fiveYearReturn: 7.1,
    expectedReturn: 7.2,
    exitLoad: 'No exit load',
    popularity: 73,
    holdings: ['AAA Corporate Bonds', 'Government Securities', 'Treasury Bills', 'Bank CDs'],
    sectors: [
      { label: 'Corporate Debt', value: 62 },
      { label: 'Government', value: 24 },
      { label: 'Cash', value: 8 },
      { label: 'Money Market', value: 6 }
    ]
  },
  {
    id: 'mirae-asset-hybrid',
    key: 'mirae asset hybrid equity',
    fundName: 'Mirae Asset Hybrid Equity Fund',
    category: 'Aggressive Hybrid',
    assetClass: 'Hybrid',
    risk: 'Moderate',
    directExpense: 0.59,
    regularExpense: 1.46,
    oneYearReturn: 15.5,
    threeYearReturn: 13.2,
    fiveYearReturn: 13.9,
    expectedReturn: 9.8,
    exitLoad: '1% if redeemed within 1 year',
    popularity: 69,
    holdings: ['HDFC Bank', 'ICICI Bank', 'Infosys', 'Government Securities', 'Reliance Industries'],
    sectors: [
      { label: 'Financials', value: 26 },
      { label: 'Debt', value: 21 },
      { label: 'Technology', value: 11 },
      { label: 'Consumer', value: 10 }
    ]
  }
];

export const samplePortfolio = [
  { fundId: 'hdfc-flexi-cap', fundName: 'HDFC Flexi Cap Fund Regular', amount: 320000, currentValue: 438000, years: 10 },
  { fundId: 'axis-bluechip', fundName: 'Axis Bluechip Fund Regular', amount: 240000, currentValue: 284000, years: 8 },
  { fundId: 'parag-parikh-flexi-cap', fundName: 'Parag Parikh Flexi Cap Fund Direct', amount: 380000, currentValue: 526000, years: 10 },
  { fundId: 'icici-balanced-advantage', fundName: 'ICICI Prudential Balanced Advantage Fund Regular', amount: 180000, currentValue: 214000, years: 7 },
  { fundId: 'kotak-corporate-bond', fundName: 'Kotak Corporate Bond Fund Direct', amount: 160000, currentValue: 181000, years: 5 }
];
