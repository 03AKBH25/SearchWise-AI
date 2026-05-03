import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  AlertCircle,
  BadgeIndianRupee,
  Bell,
  Bot,
  ChartNoAxesCombined,
  CircleCheckBig,
  CircleUserRound,
  FileSearch,
  Flame,
  LayoutDashboard,
  Landmark,
  Linkedin,
  LockKeyhole,
  MessageCircle,
  Moon,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  WalletCards
} from 'lucide-react';
import { AppStateProvider, useAppState } from './state/AppState';
import { fundDataset, samplePortfolio } from './data/fundDataset';
import {
  Button,
  Card,
  CopilotPanel,
  FilterPill,
  FundCard,
  GrowthComparisonChart,
  InsightCard,
  LineChart,
  Metric,
  PieChart,
  PortfolioCard,
  RecommendationBadge,
  SummaryCard
} from './components/ui';
import { analyzeHolding, analyzePortfolio, findFundById, formatInr, formatPercent, generateCopilotResponse, getFundAlternatives } from './utils/analysisEngine';
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

function routeName(path) {
  if (path.startsWith('/analysis-preview') || path.startsWith('/sample-analysis')) return 'Analysis';
  if (path.startsWith('/portfolio')) return 'Portfolio';
  if (path.startsWith('/explore')) return 'Explore';
  if (path.startsWith('/fund/')) return 'Fund';
  if (path.startsWith('/watchlist')) return 'Watchlist';
  if (path.startsWith('/profile')) return 'Profile';
  return 'Dashboard';
}

function AppShell() {
  const path = useRoute();
  const [theme, setTheme] = useTheme();
  const isGuestRoute = ['/portfolio-input', '/processing', '/analysis-preview', '/sample-analysis'].includes(path);
  const { results, selectedFund } = useAppState();
  const userName = 'Aniket';

  if (path === '/') return <LandingPage theme={theme} setTheme={setTheme} />;
  if (isGuestRoute) return <GuestExperience path={path} theme={theme} setTheme={setTheme} />;

  return (
    <div className="app-frame">
      <Navbar theme={theme} setTheme={setTheme} active={routeName(path)} userName={userName} />
      <CopilotPanel page={routeName(path)} results={results} selectedFund={selectedFund} userName={userName} />
      <main className="page-shell route-transition" key={path}>
        <Router path={path} />
      </main>
    </div>
  );
}

function Navbar({ theme, setTheme, active, userName }) {
  const { results, setSelectedFundId } = useAppState();
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);

  const filteredFunds = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.toLowerCase();
    
    // Contextual source selection
    const isPortfolioContext = active === 'Portfolio' || active === 'Dashboard';
    const source = isPortfolioContext ? results.funds : fundDataset;
    
    return source
      .filter(f => {
        const name = (f.fundName || f.name || '').toLowerCase();
        const cat = (f.category || '').toLowerCase();
        return name.includes(query) || cat.includes(query);
      })
      .slice(0, 6);
  }, [search, active, results.funds]);

  function handleSelect(fund) {
    const id = fund.baseFundId || fund.id;
    setSelectedFundId(id);
    navigate(`/fund/${id}`);
    setSearch('');
    setShowResults(false);
  }

  const links = [
    ['Dashboard', '/dashboard'],
    ['Portfolio', '/portfolio'],
    ['Explore', '/explore'],
    ['Watchlist', '/watchlist']
  ];

  return (
    <header className="top-navbar">
      <button className="brand" onClick={() => navigate('/dashboard')}>
        <span>SW</span>
        SwitchWise AI
      </button>
      <nav className="nav-links">
        {links.map(([label, href]) => (
          <button key={label} className={active === label ? 'active' : ''} onClick={() => navigate(href)}>
            {label}
          </button>
        ))}
      </nav>
      
      <div className="search-container">
        <form className="global-search" onSubmit={e => e.preventDefault()}>
          <Search size={17} />
          <input 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder={active === 'Portfolio' ? "Search your portfolio..." : "Search all funds..."} 
          />
        </form>

        {showResults && filteredFunds.length > 0 && (
          <>
            <div className="search-backdrop" onClick={() => setShowResults(false)} />
            <div className="search-results-overlay">
              <div className="search-header">
                {active === 'Portfolio' ? 'Searching Portfolio' : 'Global Fund Search'}
              </div>
              {filteredFunds.map(fund => (
                <button key={fund.id || fund.baseFundId} className="search-result-card" onClick={() => handleSelect(fund)}>
                  <div className="result-info">
                    <span className="result-name">{fund.fundName || fund.name}</span>
                    <span className="result-meta">{fund.category} · {fund.assetClass || 'Equity'}</span>
                  </div>
                  <div className="result-stats">
                    <div className="stat-item">
                      <span className="stat-label">Expense</span>
                      <span className="stat-value">{formatPercent(fund.directExpense || fund.currentExpense)}</span>
                    </div>
                    {fund.fiveYearReturn && (
                      <div className="stat-item">
                        <span className="stat-label">5Y Return</span>
                        <span className="stat-value">{fund.fiveYearReturn.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="nav-actions">
        <button className="icon-button-clean" title="Notifications">
          <Bell size={20} strokeWidth={1.5} />
        </button>
        <button className="avatar-button" onClick={() => navigate('/profile')} title="User settings">
          {userName.charAt(0)}
        </button>
      </div>
    </header>
  );
}

function Router({ path }) {
  if (path === '/dashboard') return <DashboardPage />;
  if (path === '/portfolio') return <PortfolioPage />;
  if (path === '/explore') return <ExplorePage />;
  if (path.startsWith('/fund/')) return <FundDetailPage path={path} />;
  if (path === '/watchlist') return <WatchlistPage />;
  if (path === '/profile') return <ProfilePage />;
  return <DashboardPage />;
}

function LandingPage({ theme, setTheme }) {
  const sampleFunds = fundDataset.slice(0, 3);
  const proofStats = [
    ['₹1.42L', 'hidden loss detected', TrendingDown, 'danger'],
    ['3', 'funds need action', FileSearch, 'warn'],
    ['0', 'changes to your investments', LockKeyhole, 'good'],
    ['AMFI', 'real mutual fund data reference', ShieldCheck, 'neutral']
  ];
  const steps = [
    [UploadCloud, 'Add', 'Bring your portfolio into one clean view'],
    [FileSearch, 'Analyze', 'We detect expense leaks, plan inefficiencies, and allocation risks'],
    [TrendingUp, 'Improve', 'Get clear, prioritized actions to fix your portfolio']
  ];
  const outcomes = [
    [BadgeIndianRupee, 'Hidden loss in ₹', 'See avoidable cost drag as rupee impact, not abstract percentages.'],
    [Scale, 'Direct vs Regular comparison', 'Compare your current plan against lower-cost Direct alternatives.'],
    [Flame, 'Funds needing action', 'Identify which holdings deserve attention before everything else.'],
    [CircleCheckBig, 'Priority recommendations', 'Get a ranked action list built for faster decisions.']
  ];

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <button className="brand" onClick={() => navigate('/')}>
          <span>SW</span>
          SwitchWise AI
        </button>
        <nav className="landing-links" aria-label="Landing navigation">
          <button onClick={() => scrollToSection('how-it-works')}>How it Works</button>
          <button onClick={() => scrollToSection('explore')}>Explore</button>
          <button onClick={() => scrollToSection('about')}>About</button>
        </nav>
        <div className="landing-nav-actions">
          <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>Sign In</Button>
          <Button onClick={() => navigate('/portfolio-input')}>Get Started</Button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-panel landing-reveal">
          <span className="eyebrow">Mutual fund intelligence for better decisions</span>
          <h1>You might be losing money in your mutual funds—without knowing it.</h1>
          <p>SwitchWise AI analyzes your portfolio, detects hidden costs, and tells you exactly what to fix.</p>
          <div className="hero-actions">
            <Button className="btn-hero btn-hero-primary" onClick={() => navigate('/portfolio-input')}>Analyze My Portfolio <Sparkles size={18} /></Button>
            <Button className="btn-hero btn-hero-secondary" variant="ghost" onClick={() => navigate('/sample-analysis')}>Try Sample Portfolio</Button>
          </div>
          <div className="hero-assurance">
            <span><LockKeyhole size={15} /> No transactions</span>
            <span><ShieldCheck size={15} /> Data-driven insights</span>
            <span><RefreshCw size={15} /> Reversible decisions</span>
          </div>
        </div>

        <Card className="hero-visual landing-reveal">
          <div className="visual-head">
            <div>
              <span>Hidden loss</span>
              <strong>₹1.42L</strong>
            </div>
            <span className="status-chip danger">3 funds needing action</span>
          </div>
          <div className="loss-meter">
            <span style={{ width: '72%' }} />
          </div>
          <div className="preview-fund-list">
            {sampleFunds.map((fund, index) => (
              <div className="preview-fund-card" key={fund.id}>
                <div>
                  <strong>{fund.fundName}</strong>
                  <span>{fund.category}</span>
                </div>
                <div>
                  <em>{formatPercent(fund.regularExpense)}</em>
                  <span>{index === 1 ? 'Review' : 'Switch'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="visual-footer">
            <span>Priority action</span>
            <strong>Move highest-loss Regular plan first</strong>
          </div>
        </Card>
      </section>

      <section className="proof-grid" aria-label="SwitchWise proof points">
        {proofStats.map(([value, label, Icon, tone]) => (
          <Card key={label} className={`proof-card ${tone}`}>
            <Icon size={20} />
            <strong>{value}</strong>
            <span>{label}</span>
          </Card>
        ))}
      </section>

      <section className="landing-section" id="how-it-works">
        <SectionIntro eyebrow="How it works" title="A cleaner way to diagnose your portfolio" description="SwitchWise turns scattered fund details into a practical decision view." />
        <div className="steps-band">
          {steps.map(([Icon, title, copy]) => (
            <Card key={title} className="step-card">
              <span className="step-icon"><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <SectionIntro eyebrow="What you get" title="Numbers that make the next move obvious" description="The page is designed around rupee impact, plan quality, and priority actions." />
        <div className="outcome-grid">
          {outcomes.map(([Icon, title, copy]) => (
            <Card key={title} className="outcome-card">
              <Icon size={21} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="landing-section explore-showcase" id="explore">
        <div>
          <SectionIntro eyebrow="Explore" title="Compare funds before you act" description="Use sample fund cards to inspect category, expense ratio, and returns in one focused view." />
          <div className="button-row explore-actions">
            <Button onClick={() => navigate('/explore')}>Explore Funds <ArrowRight size={16} /></Button>
            <Button variant="ghost" onClick={() => navigate('/sample-analysis')}>Try Sample Portfolio</Button>
          </div>
        </div>
        <div className="landing-fund-grid">
          {sampleFunds.map((fund) => (
            <Card key={fund.id} className="landing-fund-card">
              <div>
                <h3>{fund.fundName}</h3>
                <p>{fund.category}</p>
              </div>
              <div className="landing-fund-stats">
                <span>Expense <strong>{formatPercent(fund.directExpense)}</strong></span>
                <span>5Y return <strong>{fund.fiveYearReturn.toFixed(1)}%</strong></span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="landing-section copilot-teaser">
        <div>
          <span className="eyebrow">Copilot</span>
          <h2>Ask anything about your portfolio</h2>
          <div className="query-chips">
            <button onClick={() => navigate('/dashboard')}>Where am I losing money?</button>
            <button onClick={() => navigate('/dashboard')}>What should I fix first?</button>
          </div>
        </div>
        <Card className="chat-mock">
          <div className="chat-row user">Where am I losing money?</div>
          <div className="chat-row assistant">
            <MessageCircle size={17} />
            Your largest avoidable drag is in HDFC Flexi Cap Regular. Estimated hidden loss: ₹64,800.
          </div>
          <div className="chat-input"><span>Ask about risk, costs, or switches...</span><ArrowRight size={16} /></div>
        </Card>
      </section>

      <section className="landing-section about-section" id="about">
        <Card className="mission-card">
          <span className="eyebrow">About SwitchWise AI</span>
          <h2>We help investors make better decisions without bias.</h2>
          <p>We don’t help you invest. We help you invest correctly.</p>
        </Card>
        <div className="about-points">
          {[
            [FileSearch, 'Data-driven insights'],
            [LockKeyhole, 'No transactions'],
            [Landmark, 'No commissions']
          ].map(([Icon, label]) => (
            <Card key={label} className="about-point">
              <Icon size={20} />
              <strong>{label}</strong>
            </Card>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <button className="brand" onClick={() => navigate('/')}>
            <span>SW</span>
            SwitchWise AI
          </button>
          <p>Decision support for mutual fund investors. Data sources include AMFI references and public fund information.</p>
        </div>
        <nav>
          <button onClick={() => scrollToSection('about')}>About</button>
          <button>Contact</button>
          <button>Privacy Policy</button>
          <button>Terms</button>
          <button>Data sources</button>
        </nav>
        <div className="social-links" aria-label="Social links">
          <button title="LinkedIn"><Linkedin size={18} /></button>
          <button title="Community"><CircleUserRound size={18} /></button>
          <button title="Updates"><Bell size={18} /></button>
        </div>
      </footer>
    </main>
  );
}

function SectionIntro({ eyebrow, title, description }) {
  return (
    <div className="section-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function GuestExperience({ path, theme, setTheme }) {
  return (
    <div className="guest-frame">
      <header className="guest-nav">
        <button className="brand" onClick={() => navigate('/')}>
          <span>SW</span>
          SwitchWise AI
        </button>
        <div className="landing-nav-actions">
          <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Button variant="ghost" onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </header>
      <main className="guest-shell route-transition" key={path}>
        {path === '/portfolio-input' ? <PortfolioInputPage /> : null}
        {path === '/processing' ? <ProcessingPage /> : null}
        {path === '/analysis-preview' ? <AnalysisPreviewPage mode="guest" /> : null}
        {path === '/sample-analysis' ? <AnalysisPreviewPage mode="sample" /> : null}
      </main>
    </div>
  );
}

function PortfolioInputPage() {
  const { setGuestPortfolio, setGuestResults } = useAppState();
  const [rows, setRows] = useState([
    { id: crypto.randomUUID(), fundId: 'hdfc-flexi-cap', fundName: 'HDFC Flexi Cap Fund', amount: 250000, years: 8, plan: 'Regular' },
    { id: crypto.randomUUID(), fundId: 'parag-parikh-flexi-cap', fundName: 'Parag Parikh Flexi Cap Fund', amount: 180000, years: 5, plan: 'Direct' }
  ]);
  const [error, setError] = useState('');

  function updateRow(id, field, value) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function updateFundName(id, value) {
    const matched = fundDataset.find((fund) => fund.fundName === value);
    setRows((current) => current.map((row) => row.id === id ? { ...row, fundName: value, fundId: matched?.id || '' } : row));
  }

  function addRow() {
    setRows((current) => [...current, { id: crypto.randomUUID(), fundId: '', fundName: '', amount: '', years: 5, plan: 'Regular' }]);
  }

  function removeRow(id) {
    setRows((current) => current.length === 1 ? current : current.filter((row) => row.id !== id));
  }

  function buildPortfolio() {
    return rows.map((row) => {
      const fund = findFundById(row.fundId) || fundDataset[0];
      const plan = row.plan || 'Regular';
      return {
        fundId: fund.id,
        fundName: `${fund.fundName} ${plan}`,
        amount: Number(row.amount),
        currentValue: Number(row.amount),
        years: Number(row.years || 5),
        plan
      };
    });
  }

  function submit(event) {
    event.preventDefault();
    const invalid = rows.some((row) => !row.fundId || Number(row.amount) <= 0 || Number(row.years || 0) <= 0);
    if (invalid) {
      setError('Choose a fund from the search list, then add amount and years held for every row.');
      return;
    }
    setError('');
    setGuestPortfolio(buildPortfolio());
    setGuestResults(null);
    navigate('/processing');
  }

  return (
    <section className="guest-stack">
      <PageHeader eyebrow="Guest mode" title="Add Your Portfolio" description="Enter a few holdings to get a private preview. Nothing is saved until you create an account." />
      <form className="portfolio-input-form" onSubmit={submit}>
        <datalist id="fund-options">
          {fundDataset.map((fund) => <option key={fund.id} value={fund.fundName} />)}
        </datalist>
        <div className="input-row-head">
          <span>Fund</span>
          <span>Plan</span>
          <span>Amount invested</span>
          <span>Years held</span>
          <span />
        </div>
        {rows.map((row) => (
          <Card className="holding-input-row" key={row.id}>
            <label>
              <span>Fund name</span>
              <input list="fund-options" value={row.fundName} onChange={(event) => updateFundName(row.id, event.target.value)} placeholder="Search fund name" />
            </label>
            <label>
              <span>Plan</span>
              <select value={row.plan} onChange={(event) => updateRow(row.id, 'plan', event.target.value)}>
                <option>Regular</option>
                <option>Direct</option>
              </select>
            </label>
            <label>
              <span>Amount invested</span>
              <input type="number" min="1" value={row.amount} onChange={(event) => updateRow(row.id, 'amount', event.target.value)} placeholder="250000" />
            </label>
            <label>
              <span>Years held</span>
              <input type="number" min="1" max="40" value={row.years} onChange={(event) => updateRow(row.id, 'years', event.target.value)} placeholder="5" />
            </label>
            <button type="button" className="icon-button remove-row" onClick={() => removeRow(row.id)} title="Remove fund">
              <Trash2 size={17} />
            </button>
          </Card>
        ))}
        {error ? <p className="form-error"><AlertCircle size={16} />{error}</p> : null}
        <div className="portfolio-form-actions">
          <Button type="button" variant="secondary" onClick={addRow}><Plus size={17} /> Add Fund</Button>
          <Button type="submit">Analyze Portfolio <ArrowRight size={17} /></Button>
        </div>
      </form>
    </section>
  );
}

function ProcessingPage() {
  const { guestPortfolio, setGuestResults } = useAppState();

  useEffect(() => {
    if (!guestPortfolio.length) {
      navigate('/portfolio-input');
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setGuestResults(analyzePortfolio(guestPortfolio));
      navigate('/analysis-preview');
    }, 1450);
    return () => window.clearTimeout(timer);
  }, [guestPortfolio, setGuestResults]);

  return (
    <section className="processing-page">
      <div className="analysis-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="processing-copy">
        <span className="eyebrow">Analyzing portfolio</span>
        <h1>Building your decision preview</h1>
        <p>SwitchWise is checking fund variants, expense gaps, and priority actions.</p>
      </div>
      <Card className="processing-steps">
        {['Detecting fund variants', 'Calculating hidden costs', 'Generating insights'].map((step, index) => (
          <div key={step} className="processing-step">
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </Card>
    </section>
  );
}

function AnalysisPreviewPage({ mode }) {
  const { guestResults, guestPortfolio, setGuestPortfolio, setGuestResults, setSelectedFundId } = useAppState();
  const sampleResults = useMemo(() => analyzePortfolio(samplePortfolio), []);
  const results = mode === 'sample' ? sampleResults : guestResults;
  const portfolio = mode === 'sample' ? samplePortfolio : guestPortfolio;

  useEffect(() => {
    if (mode === 'sample') {
      setGuestPortfolio(samplePortfolio);
      setGuestResults(sampleResults);
    } else if (!results) {
      navigate('/portfolio-input');
    }
  }, [mode, results, sampleResults, setGuestPortfolio, setGuestResults]);

  if (!results) return null;

  const priorityFunds = [...results.funds]
    .filter((fund) => fund.status !== 'Optimized')
    .sort((a, b) => b.lifetimeLoss - a.lifetimeLoss)
    .slice(0, 3);
  const isGoodPortfolio = results.actionCount === 0 && results.totalLoss < Math.max(12000, results.totalInvested * 0.025);
  const healthScore = Math.max(58, Math.min(96, Math.round(92 - (results.totalLoss / Math.max(1, results.totalInvested)) * 180 - results.actionCount * 7)));
  const optimizedGain = results.optimizedGain || results.totalLoss;

  function openFund(fund) {
    setSelectedFundId(fund.baseFundId);
    navigate(`/fund/${fund.baseFundId}`);
  }

  return (
    <section className="guest-stack">
      <div className="preview-header">
        <PageHeader
          eyebrow={mode === 'sample' ? 'Sample analysis' : 'Analysis preview'}
          title={isGoodPortfolio ? 'Your portfolio is well optimized' : `You are losing ${formatInr(results.totalLoss)} due to high expense ratios`}
          description="This is a guest preview. You can inspect the full analysis now, then create an account to save and keep improving it."
        />
        <Button onClick={() => navigate('/portfolio-input')} variant="secondary">Edit Inputs</Button>
      </div>

      <div className="summary-grid">
        <SummaryCard label="Total invested" value={formatInr(results.totalInvested)} detail="Across entered holdings" icon={WalletCards} />
        <SummaryCard label="Current value" value={formatInr(results.currentValue)} detail="Estimated from your inputs" tone="good" icon={ChartNoAxesCombined} />
        <SummaryCard label="Hidden loss" value={formatInr(results.totalLoss)} detail="Potential expense drag over time" tone={results.totalLoss ? 'danger' : 'good'} icon={Flame} />
        <SummaryCard label="Funds needing action" value={results.actionCount} detail="Ranked by priority" tone={results.actionCount ? 'warn' : 'good'} icon={Sparkles} />
      </div>

      <Card className={`health-card ${isGoodPortfolio ? 'good' : 'warn'}`}>
        <div>
          <span className="eyebrow">{isGoodPortfolio ? 'Good portfolio' : 'Issues detected'}</span>
          <h2>{healthScore}/100 health score</h2>
          <p>{isGoodPortfolio ? 'Your visible holdings are already cost-aware. Keep monitoring overlap, tax impact, and category concentration.' : 'The biggest decision is to review high-cost Regular variants before optimizing anything else.'}</p>
        </div>
        <div className="health-list">
          {(isGoodPortfolio
            ? ['Most holdings look cost-efficient', 'No urgent switches detected', 'Expense drag appears controlled']
            : ['Regular plan leakage found', 'High expense gaps compound over time', 'Priority fixes are concentrated in a few funds']
          ).map((item) => <span key={item}><CircleCheckBig size={15} />{item}</span>)}
        </div>
      </Card>

      <div className="preview-grid">
        <Card className="panel">
          <SectionTitle title="Priority Fixes" />
          <div className="priority-list">
            {(priorityFunds.length ? priorityFunds : results.funds.slice(0, 3)).map((fund) => (
              <button key={fund.id} className="priority-fund" onClick={() => openFund(fund)}>
                <div>
                  <strong>{fund.fundName}</strong>
                  <span>{fund.category} · {fund.currentPlan}</span>
                </div>
                <div>
                  <strong>{formatInr(fund.lifetimeLoss)}</strong>
                  <RecommendationBadge value={fund.recommendation} />
                </div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="panel projection-card">
          <SectionTitle title="Future Projection" />
          <h2>If optimized → {formatInr(optimizedGain)} gain over time</h2>
          <p>Based on switching high-drag Regular variants to comparable Direct expense assumptions. Review tax and exit load before acting.</p>
        </Card>
      </div>

      <GuestCopilot results={results} portfolio={portfolio} />

      <div className="portfolio-list">
        {results.funds.map((fund) => (
          <Card key={fund.id} className="portfolio-card">
            <div className="portfolio-main">
              <div>
                <h3>{fund.fundName}</h3>
                <p>{fund.category} · {fund.assetClass}</p>
              </div>
              <RecommendationBadge value={fund.status} />
            </div>
            <div className="portfolio-metrics">
              <Metric label="Amount" value={formatInr(fund.amount)} />
              <Metric label="Plan" value={fund.currentPlan} />
              <Metric label="Expense ratio" value={formatPercent(fund.currentExpense)} />
              <Metric label="Lifetime loss" value={formatInr(fund.lifetimeLoss)} strong={fund.lifetimeLoss > 0} />
            </div>
            <div className="portfolio-actions">
              <span>{fund.recommendation === 'Switch' ? 'Review this first' : fund.recommendation === 'Wait' ? 'Check exit load and tax impact' : 'Hold and monitor'}</span>
              <Button variant="secondary" onClick={() => openFund(fund)}>Review & Fix <ArrowRight size={16} /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="conversion-card">
        <div>
          <span className="eyebrow">Keep improving</span>
          <h2>Want to track and improve your portfolio over time?</h2>
          <p>Create a free account to save this analysis, monitor changes, and unlock extended Copilot questions.</p>
        </div>
        <Button onClick={() => navigate('/dashboard')}>Create Free Account</Button>
      </Card>
    </section>
  );
}

function GuestCopilot({ results, portfolio }) {
  const [questionCount, setQuestionCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: {
        insight: 'I can answer up to 3 guest questions about this preview.',
        evidence: `${results.funds.length} funds analyzed with ${formatInr(results.totalLoss)} estimated hidden loss.`,
        action: 'Ask where money is leaking, what to fix first, or whether a fund should be held.'
      }
    }
  ]);
  const [showLimit, setShowLimit] = useState(false);
  const limit = 3;

  function submit(text = draft) {
    const query = text.trim();
    if (!query) return;
    if (questionCount >= limit) {
      setShowLimit(true);
      return;
    }
    const response = generateCopilotResponse(query, { page: 'Portfolio', results, portfolio });
    setMessages((current) => [...current, { role: 'user', text: query }, { role: 'assistant', content: response }]);
    setDraft('');
    setQuestionCount((count) => count + 1);
  }

  return (
    <Card className="guest-copilot">
      <div className="guest-copilot-head">
        <div>
          <span className="eyebrow">Copilot · Guest mode</span>
          <h2>Ask anything about your portfolio</h2>
        </div>
        <span>{Math.max(0, limit - questionCount)} questions left</span>
      </div>
      <div className="guest-copilot-body">
        <div className="guest-messages">
          {messages.map((message, index) => (
            <div key={index} className={`guest-message ${message.role}`}>
              {message.role === 'user' ? <p>{message.text}</p> : <GuestCopilotAnswer content={message.content} />}
            </div>
          ))}
        </div>
        <div className="quick-prompts guest-quick-prompts">
          {['Where am I losing money?', 'What should I fix first?', 'Which funds should I hold?'].map((item) => (
            <button key={item} onClick={() => submit(item)}>{item}</button>
          ))}
        </div>
        <form className="guest-copilot-compose" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <Bot size={18} />
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about losses, risk, or priority fixes..." />
          <button type="submit" title="Ask guest copilot"><Send size={17} /></button>
        </form>
      </div>
      {showLimit ? (
        <div className="modal-backdrop">
          <Card className="upgrade-modal">
            <span className="eyebrow">Guest limit reached</span>
            <h2>Create an account to continue exploring your portfolio</h2>
            <p>Saving your analysis unlocks extended Copilot, tracking, and deeper fund reviews.</p>
            <div className="button-row">
              <Button onClick={() => navigate('/dashboard')}>Create Free Account</Button>
              <Button variant="ghost" onClick={() => setShowLimit(false)}>Keep Preview Open</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}

function GuestCopilotAnswer({ content }) {
  return (
    <div className="guest-answer">
      <p><strong>Insight</strong>{content.insight || content.summary || 'Review the highest-loss fund first.'}</p>
      <p><strong>Evidence</strong>{content.evidence || 'This is based on your entered portfolio and computed expense drag.'}</p>
      <p><strong>Action</strong>{content.action || 'Open the priority fund and check plan, tax, and exit-load impact.'}</p>
    </div>
  );
}

function DashboardPage() {
  const { results } = useAppState();
  return (
    <section className="stack">
      <PageHeader eyebrow="Dashboard" title="Your portfolio situation, instantly" description="The biggest cost leaks, allocation picture, and next action are visible before you scroll." />
      <div className="summary-grid">
        <SummaryCard label="Total invested" value={formatInr(results.totalInvested)} detail="Principal across tracked funds" icon={WalletCards} />
        <SummaryCard label="Current value" value={formatInr(results.currentValue)} detail={`${formatInr(results.totalReturns)} total returns`} tone="good" icon={ChartNoAxesCombined} />
        <SummaryCard label="Estimated hidden loss" value={formatInr(results.totalLoss)} detail="Cost drag from plan variants" tone="danger" icon={Flame} />
        <SummaryCard label="Funds needing action" value={results.actionCount} detail="Ranked by switching priority" tone="warn" icon={Sparkles} />
      </div>
      <div className="dashboard-grid">
        <Card className="panel insights-panel">
          <SectionTitle title="Key Insights" action="Open Portfolio" onAction={() => navigate('/portfolio')} />
          <div className="insight-list">
            {results.insights.map((insight) => <InsightCard key={insight.id} insight={insight} onClick={() => navigate('/portfolio')} />)}
          </div>
        </Card>
        <Card className="panel">
          <SectionTitle title="Allocation" />
          <PieChart data={results.allocation} />
        </Card>
        <Card className="panel wide">
          <SectionTitle title="Portfolio Growth" />
          <LineChart points={results.performance} />
        </Card>
        <Card className="panel highlights-panel">
          <SectionTitle title="Fund Highlights" />
          <Highlight label="Best performer" fund={results.highlights.best} value={`${results.highlights.best.fiveYearReturn.toFixed(1)}%`} />
          <Highlight label="Worst performer" fund={results.highlights.worst} value={`${results.highlights.worst.fiveYearReturn.toFixed(1)}%`} />
          <Highlight label="Most expensive" fund={results.highlights.expensive} value={formatPercent(results.highlights.expensive.currentExpense)} />
        </Card>
        <Card className="panel action-center">
          <span className="eyebrow">Action Center</span>
          <h2>{results.actionCount} funds need switching</h2>
          <p>Fix Regular plan drag before optimizing anything else. The highest hidden loss is already ranked on the portfolio page.</p>
          <Button onClick={() => navigate('/portfolio')}>Review Priority Funds <ArrowRight size={16} /></Button>
        </Card>
      </div>
    </section>
  );
}

function PortfolioPage() {
  const { results, setSelectedFundId } = useAppState();
  const [filter, setFilter] = useState('Needs action');
  const sorted = [...results.funds].sort((a, b) => {
    if (filter === 'High expense') return b.currentExpense - a.currentExpense;
    if (filter === 'High loss') return b.lifetimeLoss - a.lifetimeLoss;
    return Number(b.status === 'Needs Action') - Number(a.status === 'Needs Action') || b.lifetimeLoss - a.lifetimeLoss;
  });

  function openFund(fund) {
    setSelectedFundId(fund.baseFundId);
    navigate(`/fund/${fund.baseFundId}`);
  }

  return (
    <section className="stack">
      <PageHeader eyebrow="Portfolio" title="Manage and improve your funds" description="A decision-first view of every fund, ranked by hidden loss, plan cost, and required action." />
      <Card className="bulk-banner">
        <div>
          <span className="eyebrow">Bulk Insight</span>
          <h2>You are losing {formatInr(results.totalLoss)} across {results.regularCount} Regular funds</h2>
        </div>
        <div className="button-row">
          <Button variant="secondary">Analyze All</Button>
          <Button>Fix Priority Funds</Button>
        </div>
      </Card>
      <div className="filter-row">
        {['Needs action', 'High loss', 'High expense'].map((item) => (
          <FilterPill key={item} active={filter === item} onClick={() => setFilter(item)}>{item}</FilterPill>
        ))}
      </div>
      <div className="portfolio-list">
        {sorted.map((fund) => <PortfolioCard key={fund.id} fund={fund} onView={() => openFund(fund)} />)}
      </div>
    </section>
  );
}

function ExplorePage() {
  const { watchlist, setWatchlist, setSelectedFundId } = useAppState();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [risk, setRisk] = useState('All');
  const [expense, setExpense] = useState(1);
  const funds = fundDataset.filter((fund) => {
    const matchesQuery = fund.fundName.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'All' || fund.assetClass === category || fund.category === category;
    const matchesRisk = risk === 'All' || fund.risk === risk;
    return matchesQuery && matchesCategory && matchesRisk && fund.directExpense <= expense;
  });

  function openFund(id) {
    setSelectedFundId(id);
    navigate(`/fund/${id}`);
  }

  function toggleWatch(id) {
    setWatchlist((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section className="stack">
      <PageHeader eyebrow="Explore" title="Discover funds intelligently" description="Search, filter, and compare funds using cost, category, risk, and portfolio fit." />
      <Card className="explore-filters">
        <label><span>Fund name</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by fund name" /></label>
        <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option><option>Equity</option><option>Debt</option><option>Hybrid</option><option>Flexi Cap</option><option>Index Fund</option></select></label>
        <label><span>Risk level</span><select value={risk} onChange={(event) => setRisk(event.target.value)}><option>All</option><option>Low</option><option>Moderate</option><option>High</option><option>Very High</option></select></label>
        <label><span>Max expense {expense.toFixed(2)}%</span><input type="range" min="0.2" max="1.8" step="0.05" value={expense} onChange={(event) => setExpense(Number(event.target.value))} /></label>
      </Card>
      <div className="rail-grid">
        <SuggestionRail title="Trending" funds={[...fundDataset].sort((a, b) => b.popularity - a.popularity).slice(0, 3)} onView={openFund} />
        <SuggestionRail title="Low-cost funds" funds={[...fundDataset].sort((a, b) => a.directExpense - b.directExpense).slice(0, 3)} onView={openFund} />
        <SuggestionRail title="Suggested for you" funds={fundDataset.filter((fund) => fund.directExpense < 0.75 && fund.risk !== 'Very High').slice(0, 3)} onView={openFund} />
      </div>
      <div className="fund-grid">
        {funds.map((fund) => (
          <FundCard key={fund.id} fund={fund} onView={() => openFund(fund.id)} watched={watchlist.includes(fund.id)} onToggleWatch={() => toggleWatch(fund.id)} />
        ))}
      </div>
    </section>
  );
}

function FundDetailPage({ path }) {
  const { results, guestResults, setSelectedFundId } = useAppState();
  const id = decodeURIComponent(path.replace('/fund/', ''));
  const fund = findFundById(id) || fundDataset[0];
  const activeResults = guestResults || results;
  const portfolioFund = activeResults.funds.find((item) => item.baseFundId === id);
  const analyzed = portfolioFund || analyzeHolding({ fundId: id, fundName: `${fund.fundName} Regular`, amount: 250000, currentValue: 286000, years: 8 });
  const alternatives = getFundAlternatives(fund.id, 3);

  useEffect(() => setSelectedFundId(id), [id, setSelectedFundId]);

  return (
    <section className="stack">
      <PageHeader eyebrow="Fund Detail" title={fund.fundName} description={`${fund.category} · ${fund.assetClass} · ${fund.risk} risk`} />
      <div className="fund-detail-grid">
        <Card className="panel wide">
          <SectionTitle title="Performance" />
          <div className="return-strip">
            <Metric label="1Y" value={`${fund.oneYearReturn.toFixed(1)}%`} />
            <Metric label="3Y" value={`${fund.threeYearReturn.toFixed(1)}%`} />
            <Metric label="5Y" value={`${fund.fiveYearReturn.toFixed(1)}%`} />
          </div>
          <GrowthComparisonChart fund={analyzed} />
        </Card>
        <Card className="panel">
          <SectionTitle title="Cost" />
          <Metric label="Direct expense" value={formatPercent(fund.directExpense)} />
          <Metric label="Regular expense" value={formatPercent(fund.regularExpense)} />
          <Metric label="Exit load" value={fund.exitLoad} />
        </Card>
        <Card className="panel">
          <SectionTitle title="Variant Comparison" />
          <div className="comparison-row"><span>Current variant</span><strong>{analyzed.currentPlan}</strong></div>
          <div className="comparison-row"><span>Lower-cost variant</span><strong>Direct</strong></div>
          <div className="comparison-row"><span>Estimated cost drag</span><strong>{formatInr(analyzed.lifetimeLoss)}</strong></div>
          <RecommendationBadge value={analyzed.recommendation} />
        </Card>
        <Card className="panel">
          <SectionTitle title="Top Holdings" />
          <div className="tag-list">{fund.holdings.map((item) => <span key={item}>{item}</span>)}</div>
        </Card>
        <Card className="panel">
          <SectionTitle title="Sector Allocation" />
          <PieChart data={fund.sectors} />
        </Card>
        <Card className="panel recommendation-panel">
          <SectionTitle title="Recommendation" />
          <h2>{portfolioFund ? 'Better than your current variant?' : 'Should you shortlist it?'}</h2>
          <p>{portfolioFund ? `Direct plan can reduce long-term drag by ${formatInr(analyzed.lifetimeLoss)} before tax and exit-load effects.` : 'This fund is worth comparing if it improves cost without increasing your risk level.'}</p>
          <div className="button-row">
            {alternatives.map((item) => <Button key={item.id} variant="secondary" onClick={() => navigate(`/fund/${item.id}`)}>{item.fundName}</Button>)}
          </div>
        </Card>
      </div>
    </section>
  );
}

function WatchlistPage() {
  const { watchedFunds, setSelectedFundId } = useAppState();
  return (
    <section className="stack">
      <PageHeader eyebrow="Watchlist" title="Saved funds and quick comparison" description="Keep promising alternatives ready for the moment a portfolio decision needs them." />
      <Card className="panel comparison-table-card">
        <table>
          <thead>
            <tr><th>Fund</th><th>Category</th><th>5Y return</th><th>Expense</th><th>Risk</th><th></th></tr>
          </thead>
          <tbody>
            {watchedFunds.map((fund) => (
              <tr key={fund.id}>
                <td>{fund.fundName}</td>
                <td>{fund.category}</td>
                <td>{fund.fiveYearReturn.toFixed(1)}%</td>
                <td>{formatPercent(fund.directExpense)}</td>
                <td>{fund.risk}</td>
                <td><Button variant="secondary" onClick={() => { setSelectedFundId(fund.id); navigate(`/fund/${fund.id}`); }}>Open</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function ProfilePage() {
  const { results } = useAppState();
  const [theme, setTheme] = useTheme();
  
  return (
    <section className="stack">
      <PageHeader eyebrow="Profile" title="Your SwitchWise settings" description="Theme preference is saved locally. Portfolio data in this prototype stays in the browser session." />
      <div className="profile-grid">
        <Card className="panel">
          <SectionTitle title="Investor Profile" />
          <Metric label="Primary goal" value="Lower avoidable costs" />
          <Metric label="Risk comfort" value="Moderate to High" />
          <Metric label="Tracked funds" value={results.funds.length} />
        </Card>
        <Card className="panel">
          <SectionTitle title="Preferences" />
          <div className="setting-row">
            <span>Interface Theme</span>
            <button className="theme-toggle-large" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <><Moon size={18} /> Switch to Dark Mode</> : <><Sun size={18} /> Switch to Light Mode</>}
            </button>
          </div>
        </Card>
        <Card className="panel">
          <SectionTitle title="Decision Rules" />
          <p className="muted-copy">SwitchWise prioritizes Regular plan leakage, high expense ratios, and category concentration. It does not place trades or execute transactions.</p>
        </Card>
      </div>
    </section>
  );
}

function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="page-header">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function SectionTitle({ title, action, onAction }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action ? <button onClick={onAction}>{action}</button> : null}
    </div>
  );
}

function Highlight({ label, fund, value }) {
  return (
    <div className="highlight-row">
      <span>{label}</span>
      <strong>{fund.fundName}</strong>
      <em>{value}</em>
    </div>
  );
}

function SuggestionRail({ title, funds, onView }) {
  return (
    <Card className="suggestion-rail">
      <SectionTitle title={title} />
      {funds.map((fund) => (
        <button key={fund.id} onClick={() => onView(fund.id)}>
          <span>{fund.fundName}</span>
          <strong>{formatPercent(fund.directExpense)}</strong>
        </button>
      ))}
    </Card>
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
