import axios from 'axios';

const testHoldings = [
  { fundName: 'HDFC Flexi Cap Fund', amount: 100000, units: 100, years: 10, plan: 'Direct' }
];

async function testAnalysis() {
  try {
    const response = await axios.post('http://localhost:4000/api/portfolio/analyze', { holdings: testHoldings });
    console.log('Analysis Results:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Analysis failed:', error.response ? error.response.data : error.message);
  }
}

testAnalysis();
