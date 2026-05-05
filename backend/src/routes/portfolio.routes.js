import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { Portfolio } from '../models/Portfolio.js';

const router = express.Router();

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
