import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { samplePortfolio } from '../data/fundDataset';
import { analyzePortfolio, findFundById } from '../utils/analysisEngine';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
axios.defaults.withCredentials = true;

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [portfolio, setPortfolio] = useState(samplePortfolio);
  const [guestPortfolio, setGuestPortfolio] = useState([]);
  const [guestResults, setGuestResults] = useState(null);
  const [selectedFundId, setSelectedFundId] = useState('hdfc-flexi-cap');
  const [watchlist, setWatchlist] = useState(['nippon-nifty-50', 'kotak-corporate-bond', 'mirae-asset-hybrid']);
  const [calculatorState, setCalculatorState] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data } = await axios.get(`${API_URL}/auth/me`);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    try {
      await axios.post(`${API_URL}/auth/logout`);
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed', error);
    }
  }

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
    user,
    isAuthenticated,
    isLoading,
    checkAuth,
    logout,
    portfolio,
    setPortfolio,
    guestPortfolio,
    setGuestPortfolio,
    guestResults,
    setGuestResults,
    results,
    selectedFund,
    selectedFundId,
    setSelectedFundId,
    watchlist,
    setWatchlist,
    watchedFunds,
    calculatorState,
    setCalculatorState
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
