import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { Portfolio } from '../models/Portfolio.js';

import { analyzePortfolio } from '../services/portfolioAnalysis.service.js';
import { generatePortfolioAIInsights } from '../services/aiInsight.service.js';

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

    let portfolio = await Portfolio.findOne({ userId: req.user._id });

    if (portfolio) {
      portfolio.holdings = holdings;
      await portfolio.save();
    } else {
      portfolio = await Portfolio.create({
        userId: req.user._id,
        holdings
      });
    }

    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

export default router;
