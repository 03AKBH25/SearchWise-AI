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
  
  const [portfolio, setPortfolio] = useState([]); // Default to empty, will be populated by fetchPortfolio or sample for guests
  const [hasCheckedPortfolio, setHasCheckedPortfolio] = useState(false);
  const [validatedResults, setValidatedResults] = useState(null);
  const [guestPortfolio, setGuestPortfolio] = useState([]);
  const [guestResults, setGuestResults] = useState(null);
  const [selectedFundId, setSelectedFundId] = useState('hdfc-flexi-cap');
  const [trendingFunds, setTrendingFunds] = useState([]);
  const [exploreResults, setExploreResults] = useState([]);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [watchlist, setWatchlist] = useState(['nippon-nifty-50', 'kotak-corporate-bond', 'mirae-asset-hybrid']);
  const [calculatorState, setCalculatorState] = useState(null);

  useEffect(() => {
    checkAuth();
    fetchTrending();
  }, []);

  // For guests, show sample portfolio ONLY if not authenticated and loading is finished
  useEffect(() => {
    if (!isLoading && !isAuthenticated && portfolio.length === 0) {
      setPortfolio(samplePortfolio);
    }
  }, [isLoading, isAuthenticated, portfolio.length]);

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
      fetchPersonalizedRecommendations(data.user);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false); // Ensure loading is false after auth check
    }
  }

  async function fetchPersonalizedRecommendations(inputData) {
    if (!inputData) return;
    
    // Determine if it's raw user data or a manual discovery payload
    const isManualDiscovery = !!inputData.goalType;
    
    try {
      const payload = isManualDiscovery ? inputData : {
        goalType: inputData.preferences?.goal,
        riskComfort: inputData.preferences?.risk === 'High' ? 4 : inputData.preferences?.risk === 'Moderate' ? 3 : 2,
        horizonYears: parseInt(inputData.preferences?.horizon) || 5
      };
      
      const { data } = await axios.post(`${API_URL}/funds/recommend`, payload);
      setPersonalizedRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch personalized recommendations', error);
    }
  }

  async function fetchPortfolio() {
    try {
      const { data } = await axios.get(`${API_URL}/portfolio`);
      if (data.holdings && data.holdings.length > 0) {
        setPortfolio(data.holdings);
      } else {
        setPortfolio([]);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio', error);
      setPortfolio([]);
    } finally {
      setHasCheckedPortfolio(true);
    }
  }

  async function syncPortfolio(newHoldings) {
    if (!isAuthenticated) return;
    try {
      const { data } = await axios.post(`${API_URL}/portfolio/sync`, { holdings: newHoldings });
      if (data && data.holdings) {
        setPortfolio(data.holdings);
      }
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

  // Hybrid Approach: Fetch validated results from backend
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.post(`${API_URL}/portfolio/analyze`, { holdings: portfolio });
        setValidatedResults(data);
      } catch (error) {
        console.warn('Backend analysis failed, staying on client estimate', error);
      }
    }, 800); // Slight delay after change
    return () => clearTimeout(timer);
  }, [portfolio]);

  // Fetch AI Insights
  useEffect(() => {
    if (!validatedResults) {
      setAiInsights([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsAiThinking(true);
      try {
        const { data } = await axios.post(`${API_URL}/portfolio/insights/ai`, { 
          portfolioData: validatedResults,
          userPreferences: user?.preferences || {} 
        });
        setAiInsights(data);
      } catch (error) {
        console.warn('AI Insights failed', error);
      } finally {
        setIsAiThinking(false);
      }
    }, 1200); // Wait a bit more for AI to avoid too many calls

    return () => clearTimeout(timer);
  }, [validatedResults, user]);

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

  const instantResults = useMemo(() => analyzePortfolio(portfolio), [portfolio]);
  
  // Merge instant results with validated data if available
  const results = useMemo(() => {
    if (!validatedResults || !Array.isArray(validatedResults.funds)) return { ...instantResults, isValidated: false };
    
    // Check if validated results match current portfolio count to avoid stale data during race
    if (validatedResults.funds.length !== portfolio.length) {
       return { ...instantResults, isValidated: false };
    }
    
    return { ...validatedResults, isValidated: true };
  }, [instantResults, validatedResults, portfolio.length]);
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

  async function removeFromPortfolio(fundId) {
    const updated = portfolio.filter(h => h.fundId !== fundId);
    setPortfolio(updated);
    
    if (isAuthenticated) {
      try {
        await axios.delete(`${API_URL}/portfolio/${fundId}`);
      } catch (error) {
        console.error('Failed to remove fund from server', error);
      }
    }
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    checkAuth,
    logout,
    portfolio,
    setPortfolio,
    removeFromPortfolio,
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
    personalizedRecommendations,
    isSearching,
    searchUniverse,
    fetchPersonalizedRecommendations,
    aiInsights,
    isAiThinking,
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
