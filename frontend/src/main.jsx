import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  IndianRupee,
  Moon,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp
} from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const formatInr = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('switchwise-theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('switchwise-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function App() {
  const [theme, setTheme] = useTheme();
  const [goalType, setGoalType] = useState('wealth');
  const [riskComfort, setRiskComfort] = useState(3);
  const [horizonYears, setHorizonYears] = useState(10);
  const [amount, setAmount] = useState(300000);
  const [monthlyContribution, setMonthlyContribution] = useState(10000);
  const [currentVariant, setCurrentVariant] = useState('regular');
  const [query, setQuery] = useState('hdfc');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [chat, setChat] = useState([
    {
      role: 'assistant',
      text: 'Tell me your goal and current fund. I will diagnose whether to switch, what to buy next, and what needs verification before acting.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  const selectedRecommendation = advice?.recommendations?.[0];
  const candidates = advice?.discovery?.candidates || [];

  useEffect(() => {
    fetch(`${API_BASE}/api/health`).then((res) => res.json()).then(setHealth).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const response = await fetch(`${API_BASE}/api/funds/search?q=${encodeURIComponent(query)}&limit=12`);
      const data = await response.json();
      setSearchResults(data.funds || []);
      if (!selectedHolding && data.funds?.[0]) setSelectedHolding(data.funds[0]);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, selectedHolding]);

  async function runCopilot() {
    setLoading(true);
    try {
      const payload = {
        goalType,
        riskComfort,
        horizonYears,
        amount,
        monthlyContribution,
        currentVariant,
        holdings: selectedHolding
          ? [{ slug: selectedHolding.slug, amount, monthlyContribution, currentVariant }]
          : []
      };
      const response = await fetch(`${API_BASE}/api/advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setAdvice(await response.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedHolding) runCopilot();
  }, [selectedHolding, goalType, currentVariant]);

  async function sendMessage(message = chatInput) {
    if (!message.trim()) return;
    setChat((items) => [...items, { role: 'user', text: message }]);
    setChatInput('');
    const response = await fetch(`${API_BASE}/api/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context: advice })
    });
    const data = await response.json();
    setChat((items) => [...items, { role: 'assistant', text: data.response || data.message }]);
  }

  const exposureRows = useMemo(() => {
    const exposure = selectedRecommendation?.fund.exposure || {};
    return [
      ['Equity', exposure.equity],
      ['Debt', exposure.debt],
      ['Cash', exposure.cash],
      ['Large cap', exposure.largeCap],
      ['Mid cap', exposure.midCap],
      ['Small cap', exposure.smallCap]
    ].filter(([, value]) => value !== undefined);
  }, [selectedRecommendation]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Indian mutual fund decision co-pilot</span>
          <h1>SwitchWise AI</h1>
        </div>
        <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      <section className="workspace">
        <aside className="planner">
          <div className="panel-title">
            <Bot size={20} />
            <div>
              <h2>Investor brief</h2>
              <p>Give the co-pilot enough context to make the decision useful.</p>
            </div>
          </div>

          <div className="field">
            <span>Primary goal</span>
            <div className="segmented four">
              {[
                ['wealth', 'Wealth'],
                ['retirement', 'Retire'],
                ['balanced', 'Balanced'],
                ['tax_review', 'Review']
              ].map(([value, label]) => (
                <button key={value} className={goalType === value ? 'active' : ''} onClick={() => setGoalType(value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Current fund or AMC</span>
            <label className="search-box">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search HDFC Flexi, SBI Small..." />
            </label>
            <div className="fund-results">
              {searchResults.map((fund) => (
                <button
                  key={fund.slug}
                  className={selectedHolding?.slug === fund.slug ? 'fund-result active' : 'fund-result'}
                  onClick={() => setSelectedHolding(fund)}
                >
                  <strong>{fund.displayName}</strong>
                  <span>{fund.category} · NAV {fund.variants?.[0]?.nav ? `₹${fund.variants[0].nav.toFixed(2)}` : 'pending'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Plan you currently hold</span>
            <div className="segmented">
              <button className={currentVariant === 'regular' ? 'active' : ''} onClick={() => setCurrentVariant('regular')}>Regular</button>
              <button className={currentVariant === 'direct' ? 'active' : ''} onClick={() => setCurrentVariant('direct')}>Direct</button>
            </div>
          </div>

          <NumberField label="Current value" value={amount} onChange={setAmount} prefix="₹" step={10000} />
          <NumberField label="Monthly investment" value={monthlyContribution} onChange={setMonthlyContribution} prefix="₹" step={1000} />
          <NumberField label="Horizon" value={horizonYears} onChange={setHorizonYears} suffix="years" step={1} min={1} />

          <div className="field">
            <span>Risk comfort: {riskComfort}/5</span>
            <input type="range" min="1" max="5" value={riskComfort} onChange={(event) => setRiskComfort(Number(event.target.value))} />
          </div>

          <button className="primary-button" onClick={runCopilot} disabled={loading}>
            <Sparkles size={18} />
            {loading ? 'Thinking through it' : 'Ask co-pilot for advice'}
          </button>
        </aside>

        <section className="decision-area">
          <div className="hero-decision">
            <div>
              <span className="eyebrow">Next best action</span>
              <h2>{advice?.summary?.headline || 'Select a fund to get a decision'}</h2>
              <p>{advice?.summary?.nextAction?.reason || 'The co-pilot will compare your existing plan, suggest suitable Direct-plan alternatives and show the checks before acting.'}</p>
            </div>
            <div className="trust-badge">
              <ShieldCheck size={18} />
              {health?.mongo === 'connected' ? 'Mongo connected' : 'AMFI + prototype metadata'}
            </div>
          </div>

          <div className="answer-grid">
            <InsightCard icon={<IndianRupee />} label="Modeled switch benefit" value={advice?.summary?.totalSavingsLabel || '₹0'} helper="Before tax and exit load" />
            <InsightCard icon={<CheckCircle2 />} label="Confidence" value={`${selectedRecommendation?.score.confidence || 0}%`} helper="Based on same-scheme switch certainty" />
            <InsightCard icon={<TrendingUp />} label="Best new fund fit" value={candidates[0]?.fitScore ? `${candidates[0].fitScore}/100` : 'N/A'} helper={candidates[0]?.displayName || 'Run co-pilot'} />
          </div>

          <section className="section-block">
            <div className="section-heading">
              <h3>Recommended new funds</h3>
              <p>Ranked for your goal, horizon, risk comfort and Direct-plan cost.</p>
            </div>
            <div className="fund-cards">
              {candidates.map((fund) => (
                <article className="fund-card" key={fund.slug}>
                  <div>
                    <strong>{fund.displayName}</strong>
                    <span>{fund.category} · {fund.riskLabel}</span>
                  </div>
                  <b>{fund.fitScore}/100</b>
                  <ul>
                    {fund.why.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <p>{fund.caution}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="two-column">
            <VariantPanel recommendation={selectedRecommendation} />
            <ExposurePanel rows={exposureRows} sectors={selectedRecommendation?.fund.exposure.sectors || []} />
          </section>

          <section className="section-block risk-strip">
            <AlertTriangle size={20} />
            <div>
              <h3>Checks before the user acts</h3>
              {(advice?.assumptions || []).map((item) => <p key={item}>{item}</p>)}
            </div>
          </section>
        </section>

        <aside className="chat-panel">
          <div className="panel-title">
            <Bot size={20} />
            <div>
              <h2>Talk to co-pilot</h2>
              <p>Ask why, what to buy next, tax impact, or risk.</p>
            </div>
          </div>
          <div className="prompt-row">
            {['Why this recommendation?', 'Suggest new funds', 'What about tax?', 'What is the risk?'].map((prompt) => (
              <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}</button>
            ))}
          </div>
          <div className="messages">
            {chat.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`bubble ${item.role}`}>{item.text}</div>
            ))}
          </div>
          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask a follow-up..." />
            <button title="Send"><Send size={18} /></button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function InsightCard({ icon, label, value, helper }) {
  return (
    <article className="insight-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function NumberField({ label, value, onChange, prefix = '', suffix = '', step = 1, min = 0 }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="number-input">
        {prefix && <small>{prefix}</small>}
        <input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}

function VariantPanel({ recommendation }) {
  const direct = recommendation?.variants.direct;
  const regular = recommendation?.variants.regular;
  return (
    <article className="section-block">
      <div className="section-heading">
        <h3>Regular vs Direct diagnosis</h3>
        <p>{recommendation?.fund.displayName || 'Select a holding to compare variants.'}</p>
      </div>
      {[regular, direct].filter(Boolean).map((variant) => (
        <div className={recommendation?.variants.recommended.variant === variant.variant ? 'variant-line selected' : 'variant-line'} key={variant.variant}>
          <div>
            <strong>{variant.variant === 'direct' ? 'Direct plan' : 'Regular plan'}</strong>
            <span>{variant.source}</span>
          </div>
          <b>{variant.expenseRatio.toFixed(2)}%</b>
          <small>NAV {variant.nav ? `₹${variant.nav.toFixed(2)}` : 'N/A'}</small>
        </div>
      ))}
      <div className="check-list">
        {(recommendation?.checks || []).map((check) => <p key={check}><ArrowRight size={15} />{check}</p>)}
      </div>
    </article>
  );
}

function ExposurePanel({ rows, sectors }) {
  return (
    <article className="section-block">
      <div className="section-heading">
        <h3>Exposure view</h3>
        <p>Direct vs Regular keeps the same scheme exposure.</p>
      </div>
      <div className="bars">
        {rows.map(([label, value]) => (
          <div className="bar-row" key={label}>
            <span>{label}</span>
            <div><i style={{ width: `${Math.min(100, Number(value || 0))}%` }} /></div>
            <b>{Number(value || 0).toFixed(1)}%</b>
          </div>
        ))}
      </div>
      <div className="chips">
        {sectors.map((sector) => <span key={sector}>{sector}</span>)}
      </div>
    </article>
  );
}

createRoot(document.getElementById('root')).render(<App />);
