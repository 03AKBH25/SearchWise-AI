import React, { createContext, useContext, useMemo, useState } from 'react';

const AppStateContext = createContext(null);

const defaultPortfolio = [
  { fundName: 'HDFC Flexi Cap Fund Regular', amount: 300000, years: 10 }
];

export function AppStateProvider({ children }) {
  const [portfolio, setPortfolio] = useState(defaultPortfolio);
  const [results, setResults] = useState(null);
  const [selectedFundId, setSelectedFundId] = useState(null);

  const selectedFund = useMemo(
    () => results?.funds.find((fund) => fund.id === selectedFundId) || results?.funds[0] || null,
    [results, selectedFundId]
  );

  const value = {
    portfolio,
    setPortfolio,
    results,
    setResults,
    selectedFund,
    selectedFundId,
    setSelectedFundId
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
