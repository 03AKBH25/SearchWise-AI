import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { searchFunds, getFundPair, getTrendingFunds } from './services/amfi.service.js';
import { buildAdvice, discoverFunds } from './services/advisor.service.js';
import { getCopilotResponse } from './services/copilot.service.js';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { configurePassport } from './config/passport.js';

import authRoutes from './routes/auth.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';


const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ 
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true 
}));
app.use(cookieParser());
app.use(session({
  secret: process.env.JWT_SECRET || 'switchwise_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());
app.use(passport.session());

configurePassport();

let mongoState = 'not_configured';

async function connectMongo() {
  if (!process.env.MONGODB_URI) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 1500
    });
    mongoState = 'connected';
  } catch (error) {
    mongoState = 'offline';
    console.warn(`MongoDB unavailable, continuing with in-memory public data: ${error.message}`);
  }
}

app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);

app.get('/api/health', (_req, res) => {

  res.json({
    ok: true,
    mongo: mongoState,
    dataSources: ['AMFI NAV feed', 'Prototype factsheet metadata']
  });
});

app.get('/api/funds/trending', async (req, res, next) => {
  try {
    res.json({ funds: await getTrendingFunds() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/funds/search', async (req, res, next) => {
  try {
    const { q, limit, ...filters } = req.query;
    const funds = await searchFunds(String(q || ''), filters, Number(limit || 8));
    res.json({ funds });
  } catch (error) {
    next(error);
  }
});

app.get('/api/funds/:slug', async (req, res, next) => {
  try {
    res.json(await getFundPair(req.params.slug));
  } catch (error) {
    next(error);
  }
});

app.post('/api/funds/recommend', async (req, res, next) => {
  try {
    res.json(await discoverFunds(req.body));
  } catch (error) {
    next(error);
  }
});

app.post('/api/copilot/chat', async (req, res, next) => {
  try {
    const { message, context } = req.body;
    console.log(`[Copilot] Received message: "${message.substring(0, 50)}..."`);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await getCopilotResponse(message, context, (status) => {
      res.write(`data: ${JSON.stringify({ type: 'status', status })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ type: 'final', response })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[Copilot Error]', error);
    // If headers already sent, we can't send a normal error JSON
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

app.post('/api/advice', async (req, res, next) => {
  try {
    res.json(await buildAdvice(req.body));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || 'Something went wrong while building the recommendation.'
  });
});

await connectMongo();

app.listen(port, () => {
  console.log(`SwitchWise API running on http://localhost:${port}`);
});
