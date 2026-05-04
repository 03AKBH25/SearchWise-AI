import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // flash is the current standard name

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('Listing available models...');
    // Note: The SDK might not have a direct listModels, but we can try common ones
    const models = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-pro-latest'];
    
    for (const modelName of models) {
      try {
        console.log(`Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "Hello"');
        const response = await result.response;
        console.log(`✅ ${modelName} works:`, response.text());
        break; // Stop if one works
      } catch (e) {
        console.log(`❌ ${modelName} failed:`, e.message);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
