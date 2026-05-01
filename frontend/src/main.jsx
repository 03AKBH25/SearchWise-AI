import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, HelpCircle, Moon, ShieldCheck, Sun } from 'lucide-react';
import { AppStateProvider, useAppState } from './state/AppState';
import {
  AddRowButton,
  BreakdownPanel,
  Button,
  Card,
  FundCard,
  FundInputRow,
  GrowthChart,
  RecommendationBadge,
  SummaryCard
} from './components/ui';
import { analyzePortfolio, formatInr, generateExplanation } from './utils/analysisEngine';
import './styles.css';

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return path;
}

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('switchwise-theme') || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('switchwise-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function AppShell() {
  const path = useRoute();
  const [theme, setTheme] = useTheme();

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')}>SwitchWise AI</button>
        <div className="top-actions">
          <span><ShieldCheck size={16} /> Deterministic analysis</span>
          <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>
      <main className="route-transition" key={path}>
        <Router path={path} />
      </main>
    </div>
  );
}

function Router({ path }) {
  const { results } = useAppState();
  if (path === '/') return <LandingPage />;
  if (path === '/input') return <PortfolioInput />;
  if (path === '/processing') return <ProcessingScreen />;
  if (path === '/results') return results ? <ResultsDashboard /> : <PortfolioInput />;
  if (path.startsWith('/fund/')) return results ? <FundDetail /> : <PortfolioInput />;
  return <LandingPage />;
}

function LandingPage() {
  const [showHow, setShowHow] = useState(false);
  return (
    <section className="landing-screen">
      <div className="hero-copy">
        <span className="eyebrow">Mutual fund variant analysis</span>
        <h1>SwitchWise AI</h1>
        <p>Detect hidden losses in your mutual funds</p>
        <div className="hero-actions">
          <Button onClick={() => navigate('/input')}>Analyze My Portfolio <ArrowRight size={18} /></Button>
          <Button variant="ghost" onClick={() => setShowHow(!showHow)}><HelpCircle size={18} /> How it works</Button>
        </div>
      </div>
      <Card className="hero-card">
        <span>You may be paying extra every year</span>
        <strong>Regular vs Direct</strong>
        <p>Enter holdings, see potential loss, review what to switch, and understand why before acting.</p>
      </Card>
      {showHow && (
        <Card className="how-card">
          <h2>How it works</h2>
          <p>We detect likely plan type, apply static expense-ratio data, compound both scenarios, and explain the decision in plain language.</p>
        </Card>
      )}
    </section>
  );
}

function PortfolioInput() {
  const { portfolio, setPortfolio } = useAppState();
  const [errors, setErrors] = useState([]);

  function updateRow(index, row) {
    setPortfolio(portfolio.map((item, itemIndex) => (itemIndex === index ? row : item)));
  }

  function removeRow(index) {
    setPortfolio(portfolio.filter((_, itemIndex) => itemIndex !== index));
  }

  function validate() {
    const nextErrors = portfolio.map((row) => ({
      fundName: row.fundName.trim() ? '' : 'Fund name is required',
      amount: Number(row.amount) > 0 ? '' : 'Amount must be positive'
    }));
    setErrors(nextErrors);
    return nextErrors.every((row) => !row.fundName && !row.amount);
  }

  function submit() {
    if (!validate()) return;
    navigate('/processing');
  }

  return (
    <section className="flow-screen narrow">
      <div className="screen-heading">
        <span className="eyebrow">Step 1</span>
        <h1>Add your holdings</h1>
        <p>Add one or more mutual funds. Include "Regular" or "Direct" in the name if you know the plan.</p>
      </div>
      <Card className="input-card">
        {portfolio.map((row, index) => (
          <FundInputRow
            key={index}
            row={row}
            index={index}
            error={errors[index]}
            canRemove={portfolio.length > 1}
            onChange={updateRow}
            onRemove={removeRow}
          />
        ))}
        <AddRowButton onClick={() => setPortfolio([...portfolio, { fundName: '', amount: 100000, years: 10 }])} />
      </Card>
      <div className="single-cta">
        <Button onClick={submit}>Analyze Portfolio <ArrowRight size={18} /></Button>
      </div>
    </section>
  );
}

function ProcessingScreen() {
  const { portfolio, setResults } = useAppState();
  const [active, setActive] = useState(0);
  const steps = ['Detecting fund variants', 'Calculating expense impact', 'Generating recommendations'];

  useEffect(() => {
    const timers = [
      setTimeout(() => setActive(1), 450),
      setTimeout(() => setActive(2), 900),
      setTimeout(() => {
        setResults(analyzePortfolio(portfolio));
        navigate('/results');
      }, 1500)
    ];
    return () => timers.forEach(clearTimeout);
  }, [portfolio, setResults]);

  return (
    <section className="processing-screen">
      <Card className="processing-card">
        <span className="loader" />
        <h1>Analyzing your portfolio</h1>
        <div className="progress-list">
          {steps.map((step, index) => (
            <div key={step} className={index <= active ? 'complete' : ''}>
              <i>{index + 1}</i>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function ResultsDashboard() {
  const { results, setSelectedFundId } = useAppState();
  const [showDetails, setShowDetails] = useState(false);

  function viewFund(fund) {
    setSelectedFundId(fund.id);
    navigate(`/fund/${fund.id}`);
  }

  return (
    <section className="flow-screen">
      <div className="screen-heading">
        <span className="eyebrow">Step 3</span>
        <h1>Your switching dashboard</h1>
        <p>Fast decision first. Details are available for each fund.</p>
      </div>
      <SummaryCard results={results} onReview={() => setShowDetails(true)} />
      <div className={showDetails ? 'fund-list visible' : 'fund-list'}>
        {results.funds.map((fund) => (
          <FundCard key={fund.id} fund={fund} onView={() => viewFund(fund)} />
        ))}
      </div>
    </section>
  );
}

function FundDetail() {
  const { results, selectedFund } = useAppState();
  const pathId = decodeURIComponent(window.location.pathname.replace('/fund/', ''));
  const fund = results?.funds.find((item) => item.id === pathId) || selectedFund;
  if (!fund) return null;

  return (
    <section className="flow-screen">
      <button className="back-link" onClick={() => navigate('/results')}><ArrowLeft size={16} /> Back to results</button>
      <div className="detail-hero">
        <div>
          <span className="eyebrow">Fund detail</span>
          <h1>{fund.fundName}</h1>
          <p>You may lose {formatInr(fund.lifetimeLoss)} over {fund.years} years if you keep the current variant.</p>
        </div>
        <RecommendationBadge value={fund.recommendation} />
      </div>
      <div className="detail-grid">
        <Card className="chart-card">
          <h2>Growth Comparison</h2>
          <GrowthChart fund={fund} />
        </Card>
        <BreakdownPanel fund={fund} />
        <Card className="constraints">
          <h2>Risk & Constraints</h2>
          <p><strong>Exit load:</strong> {fund.exitLoad}</p>
          <p><strong>Tax note:</strong> Switching may trigger capital gains tax. Verify holding period and gains before execution.</p>
        </Card>
        <Card className="ai-explanation">
          <h2>AI Explanation</h2>
          <p>{generateExplanation(fund)}</p>
        </Card>
      </div>
      <div className="single-cta">
        <Button>Simulate Switch <ArrowRight size={18} /></Button>
      </div>
    </section>
  );
}

function Root() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
