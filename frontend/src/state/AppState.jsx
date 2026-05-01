import React, { createContext, useContext, useMemo, useState } from 'react';
import { samplePortfolio } from '../data/fundDataset';
import { analyzePortfolio, findFundById } from '../utils/analysisEngine';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [portfolio, setPortfolio] = useState(samplePortfolio);
  const [selectedFundId, setSelectedFundId] = useState('hdfc-flexi-cap');
  const [watchlist, setWatchlist] = useState(['nippon-nifty-50', 'kotak-corporate-bond', 'mirae-asset-hybrid']);

  const results = useMemo(() => analyzePortfolio(portfolio), [portfolio]);
  const selectedHolding = useMemo(
    () => results.funds.find((fund) => fund.baseFundId === selectedFundId || fund.id === selectedFundId) || null,
    [results, selectedFundId]
  );
  const selectedFund = useMemo(
    () => selectedHolding || findFundById(selectedFundId) || results.funds[0] || null,
    [results.funds, selectedFundId, selectedHolding]
  );
  const watchedFunds = useMemo(
    () => watchlist.map((id) => findFundById(id)).filter(Boolean),
    [watchlist]
  );

  const value = {
    portfolio,
    setPortfolio,
    results,
    selectedFund,
    selectedFundId,
    setSelectedFundId,
    watchlist,
    setWatchlist,
    watchedFunds
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
