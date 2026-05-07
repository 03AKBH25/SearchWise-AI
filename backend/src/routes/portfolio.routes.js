import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { Portfolio } from '../models/Portfolio.js';

import { analyzePortfolio } from '../services/portfolioAnalysis.service.js';
import { generatePortfolioAIInsights } from '../services/aiInsight.service.js';
import { getFundPair } from '../services/amfi.service.js';

const router = express.Router();

// @desc    Analyze a portfolio (public or private)
// @route   POST /api/portfolio/analyze
// @access  Public
router.post('/analyze', async (req, res) => {
  try {
    const { holdings } = req.body;
    if (!holdings) return res.status(400).json({ message: 'Holdings required' });
    
    const results = await analyzePortfolio(holdings);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Analysis Error', error: error.message });
  }
});

// @desc    Generate AI insights for a portfolio
// @route   POST /api/portfolio/insights/ai
// @access  Public
router.post('/insights/ai', async (req, res) => {
  try {
    const { portfolioData, userPreferences } = req.body;
    const insights = await generatePortfolioAIInsights(portfolioData, userPreferences);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'AI Insight Error', error: error.message });
  }
});

// @desc    Get user portfolio
// @route   GET /api/portfolio
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      return res.json({ holdings: [] });
    }
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Sync user portfolio (overwrite or create)
// @route   POST /api/portfolio/sync
// @access  Private
router.post('/sync', protect, async (req, res) => {
  try {
    const { holdings } = req.body;

    // Proactively calculate units for any holding missing them
    // This allows us to track 'Real Current Value' as NAV updates daily
    const processedHoldings = await Promise.all(holdings.map(async (h) => {
      if ((!h.units || h.units === 0) && h.amount) {
        try {
          const fundData = await getFundPair(h.fundId || h.fundName);
          const variants = Array.isArray(fundData.variants) 
            ? fundData.variants 
            : Object.values(fundData.variants || {});
            
          const plan = (h.plan || 'Regular').toLowerCase();
          const variant = variants.find(v => v.variant === plan) || variants[0];
          
          const nav = variant?.nav || 0;
          if (nav > 0) {
            h.units = h.amount / nav;
          }
        } catch (err) {
          console.warn(`Could not calculate units for ${h.fundName}:`, err.message);
        }
      }
      return h;
    }));

    let portfolio = await Portfolio.findOne({ userId: req.user._id });

    if (portfolio) {
      portfolio.holdings = processedHoldings;
      await portfolio.save();
    } else {
      portfolio = await Portfolio.create({
        userId: req.user._id,
        holdings: processedHoldings
      });
    }

    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Remove fund from portfolio
// @route   DELETE /api/portfolio/:fundId
// @access  Private
router.delete('/:fundId', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    portfolio.holdings = portfolio.holdings.filter(
      h => h.fundId !== req.params.fundId
    );

    await portfolio.save();
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

export default router;
