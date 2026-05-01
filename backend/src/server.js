import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { searchFunds, getFundPair } from './services/amfi.service.js';
import { buildAdvice, discoverFunds } from './services/advisor.service.js';
import { getCopilotResponse } from './services/copilot.service.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

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

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mongo: mongoState,
    dataSources: ['AMFI NAV feed', 'Prototype factsheet metadata']
  });
});

app.get('/api/funds/search', async (req, res, next) => {
  try {
    const funds = await searchFunds(String(req.query.q || ''), Number(req.query.limit || 8));
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
    const response = await getCopilotResponse(message, context);
    res.json({ response });
  } catch (error) {
    next(error);
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
