import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // This is the REST way since the SDK might not expose it easily in older versions
    // but let's try a fetch to the raw endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    const models = data.models || [];
    console.log('Total models found:', models.length);
    
    const flashModels = models.filter(m => m.name.includes('flash'));
    const proModels = models.filter(m => m.name.includes('pro'));
    
    console.log('--- FLASH MODELS ---');
    flashModels.forEach(m => console.log(m.name));
    
    console.log('--- PRO MODELS ---');
    proModels.forEach(m => console.log(m.name));
  } catch (error) {
    console.error('Failed to list models:', error);
  }
}

listModels();
