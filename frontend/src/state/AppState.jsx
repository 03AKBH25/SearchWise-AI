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
  const [trendingFunds, setTrendingFunds] = useState([]);
  const [exploreResults, setExploreResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [watchlist, setWatchlist] = useState(['nippon-nifty-50', 'kotak-corporate-bond', 'mirae-asset-hybrid']);
  const [calculatorState, setCalculatorState] = useState(null);

  useEffect(() => {
    checkAuth();
    fetchTrending();
  }, []);

  async function fetchTrending() {
    try {
      const { data } = await axios.get(`${API_URL}/funds/trending`);
      setTrendingFunds(data.funds || []);
    } catch (error) {
      console.error('Failed to fetch trending funds', error);
    }
  }

  async function checkAuth() {
    try {
      const { data } = await axios.get(`${API_URL}/auth/me`);
      setUser(data.user);
      setIsAuthenticated(true);
      fetchPortfolio();
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPortfolio() {
    try {
      const { data } = await axios.get(`${API_URL}/portfolio`);
      if (data.holdings && data.holdings.length > 0) {
        setPortfolio(data.holdings);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio', error);
    }
  }

  async function syncPortfolio(newHoldings) {
    if (!isAuthenticated) return;
    try {
      await axios.post(`${API_URL}/portfolio/sync`, { holdings: newHoldings });
    } catch (error) {
      console.error('Failed to sync portfolio', error);
    }
  }

  // Auto-sync portfolio to DB whenever it changes
  useEffect(() => {
    if (isAuthenticated && portfolio !== samplePortfolio) {
      const timer = setTimeout(() => {
        syncPortfolio(portfolio);
      }, 1000); // Debounce sync
      return () => clearTimeout(timer);
    }
  }, [portfolio, isAuthenticated]);

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

  async function searchUniverse(params = {}) {
    setIsSearching(true);
    try {
      const { data } = await axios.get(`${API_URL}/funds/search`, { params });
      setExploreResults(data.funds || []);
    } catch (error) {
      console.error('Universe search failed', error);
      setExploreResults([]);
    } finally {
      setIsSearching(false);
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
    trendingFunds,
    exploreResults,
    isSearching,
    searchUniverse,
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
