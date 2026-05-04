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
  WalletCards,
  Info,
  ChevronDown,
  CheckCircle2,
  Calculator
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
import { analyzeHolding, analyzePortfolio, calculateLumpsum, findFundById, formatInr, formatPercent, futureValue, generateCopilotResponse, getFundAlternatives, ratioLabel } from './utils/analysisEngine';
import AuthPage from './components/AuthPage';
import OnboardingPage from './components/OnboardingPage';
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
  if (path.startsWith('/calculator')) return 'Calculator';
  if (path.startsWith('/watchlist')) return 'Watchlist';
  if (path.startsWith('/profile')) return 'Profile';
  return 'Dashboard';
}

function AppShell() {
  const path = useRoute();
  const [theme, setTheme] = useTheme();
  const { user, isAuthenticated, isLoading, results, selectedFund, calculatorState } = useAppState();
  
  const isGuestRoute = ['/', '/portfolio-input', '/processing', '/analysis-preview', '/sample-analysis', '/login'].includes(path);
  const userName = user?.name || 'Guest';

  if (isLoading) {
    return <div className="loading-screen"><div className="analysis-loader"><span></span><span></span><span></span></div></div>;
  }

  if (path === '/login') return <AuthPage theme={theme} setTheme={setTheme} />;
  if (path === '/') return <LandingPage theme={theme} setTheme={setTheme} />;
  if (isGuestRoute) return <GuestExperience path={path} theme={theme} setTheme={setTheme} />;

  // Protected route check
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  // Mandatory onboarding check
  if (user && !user.onboardingCompleted && path !== '/onboarding') {
    navigate('/onboarding');
    return null;
  }
  
  // Prevent returning to onboarding if already completed
  if (user && user.onboardingCompleted && path === '/onboarding') {
    navigate('/dashboard');
    return null;
  }


  return (
    <div className="app-frame">
      <Navbar theme={theme} setTheme={setTheme} active={routeName(path)} userName={userName} />
      <CopilotPanel 
        page={routeName(path)} 
        results={results} 
        selectedFund={selectedFund} 
        userName={userName} 
        calculatorState={calculatorState}
      />
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
    ['Calculator', '/calculator/lumpsum'],
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
                    <span className="result-meta">{fund.category} | {fund.assetClass || 'Equity'}</span>
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

        <div className="user-profile-menu">
          <button className="avatar-button" title={userName}>
            {userName.charAt(0)}
          </button>
          <div className="profile-dropdown">
            <div className="dropdown-user-info">
              <strong>{userName}</strong>
              <span>Pro Member</span>
            </div>
            <button onClick={() => navigate('/profile')}>Profile Settings</button>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="theme-toggle-btn">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />} 
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
            <button onClick={() => useAppState().logout()} className="logout-btn">Logout</button>

          </div>
        </div>
      </div>

    </header>
  );
}

function Router({ path }) {
  if (path === '/dashboard') return <DashboardPage />;
  if (path.startsWith('/analysis/')) return <AnalysisDetailPage path={path} />;
  if (path === '/portfolio') return <PortfolioPage />;
  if (path === '/explore') return <ExplorePage />;
  if (path === '/calculator/lumpsum') return <LumpsumCalculatorPage />;
  if (path.startsWith('/fund/')) return <FundDetailPage path={path} />;
  if (path === '/watchlist') return <WatchlistPage />;
  if (path === '/profile') return <ProfilePage />;
  if (path === '/onboarding') return <OnboardingPage />;
  return <DashboardPage />;
}


function LandingPage({ theme, setTheme }) {
  const sampleFunds = fundDataset.slice(0, 3);
  const proofStats = [
    ['Rs. 1.42L', 'hidden loss detected', TrendingDown, 'danger'],
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
          <Button variant="ghost" onClick={() => navigate('/login')}>Sign In</Button>
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
              <strong>Rs. 1.42L</strong>
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
  const { isAuthenticated, guestResults, guestPortfolio, setGuestPortfolio, setGuestResults, setSelectedFundId } = useAppState();
  const [showAuthModal, setShowAuthModal] = useState(false);
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
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setSelectedFundId(fund.baseFundId);
    navigate(`/fund/${fund.baseFundId}`);
  }

  return (
    <section className="guest-stack">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
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
                  <span>{fund.category} | {fund.currentPlan}</span>
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
          <h2>If optimized to {formatInr(optimizedGain)} gain over time</h2>
          <p>Based on switching high-drag Regular variants to comparable Direct expense assumptions. Review tax and exit load before acting.</p>
        </Card>
      </div>

      <GuestCopilot results={results} portfolio={portfolio} />

      <div className="portfolio-list">
        {results.funds.map((fund) => (
          <Card key={fund.id} className="portfolio-card clickable-card" onClick={() => openFund(fund)}>

            <div className="portfolio-main">
              <div>
                <h3>{fund.fundName}</h3>
                <p>{fund.category} | {fund.assetClass}</p>
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
        <Button onClick={() => navigate('/login')}>Create Free Account</Button>
      </Card>
    </section>
  );
}

function AuthModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <Card className="auth-modal landing-reveal">
        <div className="modal-close-bar">
          <button onClick={onClose} className="icon-button-clean">×</button>
        </div>
        <div className="modal-header">
          <div className="modal-icon-ring">
            <Sparkles size={28} />
          </div>
          <h2>Unlock Full Intelligence</h2>
          <p>You've seen the preview. Create an account to unlock deep fund forensics, track your portfolio health 24/7, and get unlimited AI Copilot insights.</p>
        </div>
        <div className="modal-actions">
          <Button onClick={() => navigate('/login')}>Continue to Create Account <ArrowRight size={18} /></Button>
          <Button variant="ghost" onClick={onClose}>Stay on Preview</Button>
        </div>
        <div className="modal-footer">
          <span><ShieldCheck size={14} /> Bank-grade security</span>
          <span><LockKeyhole size={14} /> No transactions</span>
        </div>
      </Card>
    </div>
  );
}

function GuestCopilot({ results, portfolio }) {
  const { isAuthenticated } = useAppState();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const limit = 2;
  const [draft, setDraft] = useState('');

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: {
        insight: `I can answer up to ${limit} guest questions about this preview.`,
        evidence: `${results.funds.length} funds analyzed with ${formatInr(results.totalLoss)} estimated hidden loss.`,
        action: 'Ask where money is leaking, what to fix first, or whether a fund should be held.'
      }

    }
  ]);
  const [showLimit, setShowLimit] = useState(false);


  function submit(text = draft) {
    const query = text.trim();
    if (!query) return;
    if (questionCount >= limit) {
      setShowAuthModal(true);
      return;
    }

    const response = generateCopilotResponse(query, { page: 'Portfolio', results, portfolio });
    setMessages((current) => [...current, { role: 'user', text: query }, { role: 'assistant', content: response }]);
    setDraft('');
    setQuestionCount((count) => count + 1);
  }

  return (
    <Card className="guest-copilot">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <div className="guest-copilot-head">

        <div>
          <span className="eyebrow">Copilot | Guest mode</span>
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
  const { results, user, setSelectedFundId } = useAppState();
  const [expandedInsight, setExpandedInsight] = useState(null);

  // Derived decision data
  const healthScore = Math.max(58, Math.min(96, Math.round(92 - (results.totalLoss / Math.max(1, results.totalInvested)) * 180 - results.actionCount * 7)));
  
  const priorityFunds = [...results.funds]
    .filter(f => f.status === 'Needs Action')
    .sort((a, b) => b.lifetimeLoss - a.lifetimeLoss)
    .slice(0, 3);

  const nextSteps = [
    results.regularCount > 0 ? `Review ${results.regularCount} Regular-plan cost gaps` : null,
    results.actionCount > 0 ? `Open ${priorityFunds.length} high impact areas` : null,
    'Set up cost-tracking alerts'
  ].filter(Boolean);

  const equityAllocation = results.allocationPercentages.find(a => a.label === 'Equity')?.percent || 0;
  const allocationInsight = results.allocationInsight;

  return (
    <section className="stack dashboard-stack">
      <div className="dashboard-hero">
        <PageHeader 
          eyebrow={`Welcome back, ${user?.firstName || 'Investor'}`} 
          title="Your Portfolio Intelligence" 
          description="We've analyzed your costs, risk, and efficiency. Here is your situation today." 
        />
        <PortfolioHealthCard score={healthScore} results={results} />
      </div>

      <div className="summary-grid">
        <SummaryCard
          label="Total invested"
          value={formatInr(results.totalInvested)}
          detail={`${equityAllocation}% equity allocation`}
          icon={WalletCards}
          tooltip="Allocation shows how your portfolio is spread across equity, debt, and hybrid funds. Equity can bring more volatility."
          onClick={() => navigate('/analysis/allocation')}
        >
          <AllocationMiniBar data={results.allocationPercentages} />
        </SummaryCard>
        <SummaryCard
          label="Current value"
          value={formatInr(results.currentValue)}
          detail={`Based on latest NAV${results.latestNavDate ? ` (${results.latestNavDate})` : ''}`}
          tone="good"
          icon={ChartNoAxesCombined}
          tooltip="NAV is the per-unit value published by the fund. Portfolio value changes when NAV changes."
          onClick={() => navigate('/analysis/value')}
        />
        <SummaryCard
          label="Cost Impact"
          value={formatInr(results.totalLoss)}
          detail={`${formatPercent(results.weightedExpense)} current weighted cost`}
          tone="danger"
          icon={Flame}
          tooltip="Higher expense ratios reduce long-term returns because costs are reflected in daily NAV."
          onClick={() => navigate('/analysis/cost')}
        />
        <SummaryCard
          label="Action required"
          value={results.actionCount}
          detail="High impact areas"
          tone="warn"
          icon={Sparkles}
          tooltip="Flagged areas include high expense, benchmark difference, and category concentration."
          onClick={() => navigate('/analysis/actions')}
        />
      </div>

      <div className="dashboard-intelligence-grid">
        {/* PRIORITY ACTIONS */}
        <Card className="panel priority-panel">
          <SectionTitle title="High Impact Areas" action="View All" onAction={() => navigate('/analysis/actions')} />
          <div className="priority-list">
            {priorityFunds.length > 0 ? priorityFunds.map((fund, idx) => (
              <div key={fund.id} className="priority-action-item">
                <div className="priority-badge" data-priority={idx === 0 ? 'High' : 'Medium'}>
                  {idx === 0 ? 'High Impact' : 'Medium'}
                </div>
                <div className="priority-info">
                  <strong>{fund.fundName}</strong>
                  <span>{formatInr(fund.lifetimeLoss)} cost impact | {fund.currentPlan}</span>
                </div>
                <Button variant="ghost" onClick={() => { setSelectedFundId(fund.baseFundId); navigate(`/fund/${fund.baseFundId}`); }}>
                  Explore
                </Button>
              </div>
            )) : (
              <div className="empty-state">
                <CheckCircle2 className="good" />
                <p>No urgent high impact areas detected in this model.</p>
              </div>
            )}
          </div>
        </Card>

        {/* IMPACT PROJECTION */}
        <Card className="panel impact-card">
          <SectionTitle title="Cost Context" />
          <div className="impact-projection-content">
            <div className="impact-stat">
              <span className="impact-label">Long-term Cost Impact</span>
              <strong className="impact-value good">{formatInr(results.totalLoss)}</strong>
            </div>
            <div className="impact-stat">
              <span className="impact-label">Direct Weighted Cost</span>
              <strong className="impact-value">{formatPercent(results.directExpense)}</strong>
            </div>
            <p className="impact-copy">
              Direct variants have lower expense ratios in this dataset. Lower costs may improve net outcomes, before tax and exit-load effects.
            </p>
            <div className="impact-badge">
              <TrendingUp size={16} /> Educational estimate, not guaranteed
            </div>
          </div>
        </Card>

        {/* INSIGHTS WITH WHY LAYER */}
        <Card className="panel insights-panel wide">
          <SectionTitle title="Critical Observations" />
          <div className="insight-expandable-list">
            {results.insights.map((insight) => (
              <div 
                key={insight.id} 
                className={`insight-expandable-item ${expandedInsight === insight.id ? 'expanded' : ''}`}
                onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
              >
                <div className="insight-main">
                  <div className="insight-icon-wrap"><Flame size={18} /></div>
                  <div className="insight-text">
                    <strong>{insight.title}</strong>
                    <p>{insight.description}</p>
                  </div>
                  <ChevronDown className="expand-chevron" size={18} />
                </div>
                {expandedInsight === insight.id && (
                  <div className="insight-details landing-reveal">
                    <div className="why-layer">
                      <h4>Why this is happening?</h4>
                      <p>Regular plans usually include distribution costs. Those costs are reflected through NAV and can reduce long-term net returns.</p>
                    </div>
                    <div className="risk-cost-layer">
                      <h4>Cost of Action</h4>
                      <div className="risk-pills">
                        <span><Scale size={14} /> Exit Load: 1% if &lt; 1yr</span>
                        <span><BadgeIndianRupee size={14} /> Tax: 10-15% on gains</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* RATIOS + INTERPRETATION */}
        <Card className="panel ratios-panel">
          <SectionTitle title="Financial Ratios" action="Deep dive" onAction={() => navigate('/analysis/ratios')} />
          <div className="ratio-grid">
            <RatioTile label="Sharpe Ratio" value={results.ratioSummary.sharpe.value} badge={results.ratioSummary.sharpe.label} tooltip="Sharpe compares return with total volatility. Higher is generally better for risk-adjusted performance." />
            <RatioTile label="Beta" value={results.ratioSummary.beta.value} badge={results.ratioSummary.beta.label} tooltip="Beta shows sensitivity to the market. Above 1 means more movement than the benchmark." />
            <RatioTile label="Sortino" value={results.ratioSummary.sortino.value} badge={results.ratioSummary.sortino.label} tooltip="Sortino focuses on downside volatility, so it highlights harmful fluctuations." />
          </div>
        </Card>

        {/* ALLOCATION + INTERPRETATION */}
        <Card className="panel">
          <SectionTitle title="Asset Mix" />
          <PieChart data={results.allocation} />
          <div className="allocation-interpretation">
            <Info size={16} />
            <p>{allocationInsight}</p>
          </div>
        </Card>

        {/* FUND HIGHLIGHTS & COMPARISON */}
        <Card className="panel highlights-panel">
          <SectionTitle title="Performance Snapshot" />
          <div className="snapshot-list">
            <div className="snapshot-item">
              <div className="item-label">Best Fund</div>
              <div className="item-content">
                <strong>{results.highlights.best.fundName}</strong>
                <span className="status-chip good">Outperforming</span>
              </div>
            </div>
            <div className="snapshot-item">
              <div className="item-label">Worst Fund</div>
              <div className="item-content">
                <strong>{results.highlights.worst.fundName}</strong>
                <span className="status-chip danger">Underperforming</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ACTION SUMMARY */}
        <Card className="panel action-summary-card">
          <SectionTitle title="Your Next Steps" />
          <div className="steps-list">
            {nextSteps.map((step, idx) => (
              <div key={idx} className="step-item">
                <span className="step-num">{idx + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => navigate('/portfolio')} className="w-full mt-16">
            Explore Priority Areas
          </Button>
        </Card>
      </div>
    </section>
  );
}

function AllocationMiniBar({ data }) {
  return (
    <div className="allocation-mini-bar" aria-label="Mini allocation bar">
      {data.map((item, index) => (
        <span key={item.label} className={`allocation-slice slice-${index}`} style={{ width: `${Math.max(2, item.percent)}%` }} title={`${item.label}: ${item.percent}%`} />
      ))}
    </div>
  );
}

function RatioTile({ label, value, badge, tooltip }) {
  return (
    <button className="ratio-tile" onClick={() => navigate('/analysis/ratios')} title={tooltip}>
      <span>{label}</span>
      <strong>{Number(value || 0).toFixed(2)}</strong>
      <em>{badge}</em>
    </button>
  );
}

function PortfolioHealthCard({ score, results }) {
  return (
    <Card className="health-card-premium">
      <div className="health-score-ring">
        <svg viewBox="0 0 36 36">
          <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className="ring-fill" strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div className="score-value">
          <strong>{score}</strong>
          <span>/ 100</span>
        </div>
      </div>
      <div className="health-details">
        <h2>Portfolio Health Score</h2>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span>Cost Efficiency</span>
            <div className="breakdown-bar"><div style={{ width: `${Math.max(40, 100 - (results.totalLoss / 5000))}%` }} /></div>
          </div>
          <div className="breakdown-item">
            <span>Diversification</span>
            <div className="breakdown-bar"><div style={{ width: '82%' }} /></div>
          </div>
          <div className="breakdown-item">
            <span>Performance</span>
            <div className="breakdown-bar"><div style={{ width: '75%' }} /></div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AnalysisDetailPage({ path }) {
  const { results, setSelectedFundId } = useAppState();
  const topic = path.replace('/analysis/', '');
  const titleMap = {
    allocation: ['Allocation Intelligence', 'How your money is spread and what that implies for volatility.'],
    value: ['Current Value Context', 'How NAV updates translate into portfolio value over time.'],
    cost: ['Cost Impact', 'How expense ratios differ between variants and show up through NAV.'],
    actions: ['Action Required', 'Why funds are flagged and where to explore alternatives.'],
    ratios: ['Financial Ratios', 'Risk-adjusted performance, market sensitivity, and downside risk.']
  };
  const [title, description] = titleMap[topic] || titleMap.allocation;
  const flaggedFunds = results.funds.filter((fund) =>
    fund.currentExpense >= 1.35 ||
    fund.fiveYearReturn < (fund.benchmarkReturn || fund.fiveYearReturn) - 1 ||
    fund.status === 'Needs Action'
  );

  return (
    <section className="stack">
      <PageHeader eyebrow="Deep Analysis" title={title} description={description} />
      <p className="compliance-note"><ShieldCheck size={16} /> We provide insights, not investment advice.</p>

      {topic === 'allocation' ? (
        <div className="analysis-grid">
          <Card className="panel">
            <SectionTitle title="Allocation Split" />
            <PieChart data={results.allocation} />
          </Card>
          <Card className="panel">
            <SectionTitle title="What it implies" />
            <p className="muted-copy">{results.allocationInsight}</p>
            <div className="comparison-table-card">
              <table>
                <thead><tr><th>Category</th><th>Value</th><th>Share</th><th>Risk meaning</th></tr></thead>
                <tbody>
                  {results.categoryDistribution.map((item) => (
                    <tr key={item.label}><td>{item.label}</td><td>{formatInr(item.value)}</td><td>{item.percent}%</td><td>{item.percent > 40 ? 'Concentrated area to monitor' : 'Balanced within current mix'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {topic === 'value' ? (
        <div className="analysis-grid">
          <Card className="panel wide">
            <SectionTitle title="Portfolio Growth" />
            <LineChart points={results.performance} />
          </Card>
          <Card className="panel">
            <SectionTitle title="NAV explained" />
            <p className="muted-copy">NAV is the per-unit value of a fund after assets and expenses are reflected. Your current value is estimated from units multiplied by the latest available NAV.</p>
            <Metric label="Latest NAV date" value={results.latestNavDate || 'Daily update'} />
            <Metric label="Current value" value={formatInr(results.currentValue)} />
          </Card>
        </div>
      ) : null}

      {topic === 'cost' ? (
        <div className="analysis-grid">
          <Card className="panel comparison-table-card wide">
            <SectionTitle title="Direct vs Regular Cost View" />
            <table>
              <thead><tr><th>Fund</th><th>Current</th><th>Direct</th><th>Annual gap</th><th>Long-term cost impact</th></tr></thead>
              <tbody>
                {results.costComparison.map((item) => (
                  <tr key={item.id}><td>{item.fundName}</td><td>{formatPercent(item.currentExpense)}</td><td>{formatPercent(item.directExpense)}</td><td>{formatInr(item.annualExpenseGap)}</td><td>{formatInr(item.longTermImpact)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className="panel">
            <SectionTitle title="How cost appears" />
            <p className="muted-copy">Expense ratio is deducted inside the fund’s accounting and reflected in NAV. A higher expense ratio can reduce net return over long periods.</p>
            <p className="answer-callout warning">Example scenario only: lower expense may improve net outcomes, but tax, exit load, and suitability can change the result.</p>
          </Card>
        </div>
      ) : null}

      {topic === 'actions' ? (
        <div className="analysis-grid">
          <Card className="panel">
            <SectionTitle title="Flag Summary" />
            <Metric label="High expense" value={results.actionBreakdown.highExpense} />
            <Metric label="Benchmark difference" value={results.actionBreakdown.underperformance} />
            <Metric label="Concentration" value={results.actionBreakdown.concentration} />
          </Card>
          <Card className="panel comparison-table-card wide">
            <SectionTitle title="Flagged Funds" />
            <table>
              <thead><tr><th>Fund</th><th>Why flagged</th><th>Benchmark</th><th>Explore</th></tr></thead>
              <tbody>
                {flaggedFunds.map((fund) => (
                  <tr key={fund.id}>
                    <td>{fund.fundName}</td>
                    <td>{fund.currentExpense >= 1.35 ? 'Higher expense' : 'Differs from benchmark'}</td>
                    <td>{fund.benchmark}</td>
                    <td><Button variant="secondary" onClick={() => { setSelectedFundId(fund.baseFundId); navigate(`/fund/${fund.baseFundId}`); }}>Explore options</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}

      {topic === 'ratios' ? (
        <div className="analysis-grid">
          {[
            ['Sharpe Ratio', results.ratioSummary.sharpe, 'Compares return with total volatility. Higher values usually mean better compensation for risk.'],
            ['Beta', results.ratioSummary.beta, 'Shows movement versus benchmark. Near 1 is market-like; above 1 moves more.'],
            ['Sortino Ratio', results.ratioSummary.sortino, 'Focuses on downside risk, so it separates harmful volatility from upside movement.']
          ].map(([label, ratio, copy]) => (
            <Card className="panel ratio-explain-card" key={label}>
              <SectionTitle title={label} />
              <strong>{Number(ratio.value || 0).toFixed(2)}</strong>
              <span className="badge review">{ratio.label}</span>
              <p className="muted-copy">{copy}</p>
            </Card>
          ))}
          <Card className="panel comparison-table-card wide">
            <SectionTitle title="Fund vs Benchmark" />
            <table>
              <thead><tr><th>Fund</th><th>Sharpe</th><th>Beta</th><th>Benchmark</th><th>Signal</th></tr></thead>
              <tbody>
                {results.funds.map((fund) => (
                  <tr key={fund.id}><td>{fund.fundName}</td><td>{fund.sharpeRatio.toFixed(2)}</td><td>{fund.beta.toFixed(2)}</td><td>{fund.benchmark}</td><td>{ratioLabel('sharpe', fund.sharpeRatio)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}
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

function LumpsumCalculatorPage() {
  const { setCalculatorState } = useAppState();
  const [principal, setPrincipal] = useState(100000);
  const [annualRate, setAnnualRate] = useState(12);
  const [duration, setDuration] = useState(5);
  const [durationUnit, setDurationUnit] = useState('Years');
  const [includeExpense, setIncludeExpense] = useState(false);
  const [expenseRatio, setExpenseRatio] = useState(0.75);

  const safePrincipal = Math.max(0, Number(principal) || 0);
  const safeRate = Math.min(20, Math.max(5, Number(annualRate) || 5));
  const safeDuration = Math.max(0, Number(duration) || 0);
  const years = durationUnit === 'Months' ? safeDuration / 12 : safeDuration;
  const safeExpense = includeExpense ? Math.min(2.5, Math.max(0, Number(expenseRatio) || 0)) : 0;
  const effectiveRate = Math.max(0, safeRate - safeExpense);
  const result = useMemo(
    () => calculateLumpsum({ principal: safePrincipal, annualRate: effectiveRate, years }),
    [safePrincipal, effectiveRate, years]
  );

  useEffect(() => {
    setCalculatorState({
      type: 'Lumpsum',
      inputs: {
        principal: safePrincipal,
        annualRate: safeRate,
        duration: safeDuration,
        unit: durationUnit,
        expenseIncluded: includeExpense,
        expenseRatio: safeExpense,
        effectiveRate
      },
      result: {
        totalValue: result.totalValue,
        wealthGained: result.wealthGained,
        invested: result.investedAmount
      }
    });
    return () => setCalculatorState(null);
  }, [safePrincipal, safeRate, safeDuration, durationUnit, includeExpense, safeExpense, effectiveRate, result]);
  const sensitivityRate = Math.max(0, effectiveRate - 2);
  const sensitivity = useMemo(
    () => calculateLumpsum({ principal: safePrincipal, annualRate: sensitivityRate, years }),
    [safePrincipal, sensitivityRate, years]
  );
  const validationMessages = [
    safePrincipal <= 0 ? 'Enter an amount greater than zero.' : null,
    safeDuration <= 0 ? 'Enter a time period greater than zero.' : null,
    Number(annualRate) < 5 || Number(annualRate) > 20 ? 'Expected return is kept within the realistic 5% to 20% range.' : null
  ].filter(Boolean);

  function updateRate(value) {
    setAnnualRate(Math.min(20, Math.max(5, Number(value) || 5)));
  }

  return (
    <section className="stack calculator-page">
      <PageHeader
        eyebrow="Calculator"
        title="Mutual Fund Lumpsum Calculator"
        description="Estimate how a one-time amount may grow with annual compounding, clear assumptions, and sensitivity built in."
      />

      <div className="calculator-layout">
        <Card className="panel calculator-input-panel">
          <SectionTitle title="Inputs" />
          <label>
            <span>Investment Amount (₹)</span>
            <input type="number" min="1" step="1000" value={principal} onChange={(event) => setPrincipal(event.target.value)} onBlur={() => setPrincipal(safePrincipal || 100000)} />
          </label>

          <div className="calculator-control">
            <div className="control-head">
              <span>Expected Annual Return (% p.a)</span>
              <input type="number" min="5" max="20" step="0.1" value={annualRate} onChange={(event) => updateRate(event.target.value)} />
            </div>
            <input type="range" min="5" max="20" step="0.1" value={safeRate} onChange={(event) => updateRate(event.target.value)} />
            <p className="muted-copy">Use a realistic expected return range. This is not a promise of future performance.</p>
          </div>

          <div className="time-control">
            <label>
              <span>Time Period</span>
              <input type="number" min="1" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} onBlur={() => setDuration(safeDuration || 5)} />
            </label>
            <label>
              <span>Unit</span>
              <select value={durationUnit} onChange={(event) => setDurationUnit(event.target.value)}>
                <option>Years</option>
                <option>Months</option>
              </select>
            </label>
          </div>

          <label className="expense-toggle">
            <input type="checkbox" checked={includeExpense} onChange={(event) => setIncludeExpense(event.target.checked)} />
            <span>Include expense ratio impact</span>
          </label>

          {includeExpense ? (
            <div className="calculator-control">
              <div className="control-head">
                <span>Expense Ratio (%)</span>
                <input type="number" min="0" max="2.5" step="0.05" value={expenseRatio} onChange={(event) => setExpenseRatio(event.target.value)} />
              </div>
              <input type="range" min="0" max="2.5" step="0.05" value={safeExpense} onChange={(event) => setExpenseRatio(event.target.value)} />
              <p className="muted-copy">Effective return used: {effectiveRate.toFixed(2)}% p.a after expense impact.</p>
            </div>
          ) : null}

          {validationMessages.length ? (
            <div className="calculator-validation">
              {validationMessages.map((message) => <p key={message}><AlertCircle size={15} />{message}</p>)}
            </div>
          ) : null}
        </Card>

        <Card className="panel calculator-output-panel">
          <SectionTitle title="Estimated Output" />
          <div className="calculator-result-grid">
            <Metric label="Invested Amount" value={formatInr(result.invested)} />
            <Metric label="Estimated Returns" value={formatInr(result.returns)} strong />
            <Metric label="Total Value" value={formatInr(result.total)} />
          </div>
          <LumpsumDonut invested={result.invested} returns={result.returns} />
          <div className="formula-card">
            <Calculator size={18} />
            <p><strong>Formula used</strong> FV = P * (1 + r / n) ^ (n * t), where n = 1 for annual compounding.</p>
          </div>
        </Card>
      </div>

      <div className="calculator-learning-grid">
        <Card className="panel">
          <SectionTitle title="How returns are calculated" />
          <p className="muted-copy">Returns are calculated using annual compounding. The time period is converted to years when you select months, so 18 months becomes 1.5 years.</p>
          <p className="answer-callout warning">This is an estimate, not guaranteed returns. Actual returns may vary depending on market performance.</p>
        </Card>
        <Card className="panel sensitivity-card">
          <SectionTitle title="Rate Sensitivity" />
          <p>If return rate decreases by 2%, final value becomes <strong>{formatInr(sensitivity.total)}</strong>.</p>
          <span>Difference from current estimate: {formatInr(Math.max(0, result.total - sensitivity.total))}</span>
        </Card>
      </div>
    </section>
  );
}

function LumpsumDonut({ invested, returns }) {
  const total = Math.max(1, Number(invested || 0) + Number(returns || 0));
  const returnShare = Math.max(0, Math.min(100, (Number(returns || 0) / total) * 100));
  const investedShare = 100 - returnShare;

  return (
    <div className="lumpsum-donut-wrap">
      <svg className="lumpsum-donut" viewBox="0 0 120 120" role="img" aria-label="Invested amount and estimated returns donut chart">
        <circle className="donut-track" cx="60" cy="60" r="42" />
        <circle className="donut-invested" cx="60" cy="60" r="42" strokeDasharray={`${investedShare} ${100 - investedShare}`} strokeDashoffset="25" />
        <circle className="donut-returns" cx="60" cy="60" r="42" strokeDasharray={`${returnShare} ${100 - returnShare}`} strokeDashoffset={`${25 - investedShare}`} />
      </svg>
      <div className="donut-legend">
        <span><i className="invested-dot" />Invested {Math.round(investedShare)}%</span>
        <span><i className="returns-dot" />Returns {Math.round(returnShare)}%</span>
      </div>
    </div>
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
  const [calculator, setCalculator] = useState({ amount: 100000, duration: 5 });
  const projectedValue = futureValue(Number(calculator.amount), fund.expectedReturn, fund.directExpense, Number(calculator.duration));

  useEffect(() => setSelectedFundId(id), [id, setSelectedFundId]);

  return (
    <section className="stack">
      <PageHeader eyebrow="Fund Detail" title={fund.fundName} description={`${fund.category} · ${fund.assetClass} · ${fund.risk} risk`} />
      <div className="fund-detail-grid">
        <Card className="panel wide">
          <SectionTitle title="Performance vs Benchmark" />
          <div className="return-strip">
            <Metric label="1Y" value={`${fund.oneYearReturn.toFixed(1)}%`} />
            <Metric label="3Y" value={`${fund.threeYearReturn.toFixed(1)}%`} />
            <Metric label="5Y" value={`${fund.fiveYearReturn.toFixed(1)}%`} />
          </div>
          <BenchmarkComparisonChart fund={fund} />
          <p className="muted-copy">Benchmark: {fund.benchmark}. Difference from benchmark helps explain whether returns came from fund choices or broader market movement.</p>
        </Card>
        <Card className="panel">
          <SectionTitle title="Cost" />
          <Metric label="Direct expense" value={formatPercent(fund.directExpense)} />
          <Metric label="Regular expense" value={formatPercent(fund.regularExpense)} />
          <Metric label="Exit load" value={fund.exitLoad} />
          <Metric label="AUM" value={`Rs. ${fund.aumCrore?.toLocaleString('en-IN')} Cr`} />
          <p className="muted-copy trust-copy" title="AUM shows the size of assets managed in the fund. Very small or very large funds can behave differently operationally.">AUM: {fund.aumCrore?.toLocaleString('en-IN')} Cr</p>
        </Card>
        <Card className="panel">
          <SectionTitle title="Variant Comparison" />
          <div className="comparison-row"><span>Current variant</span><strong>{analyzed.currentPlan}</strong></div>
          <div className="comparison-row"><span>Lower-cost variant</span><strong>Direct</strong></div>
          <div className="comparison-row"><span>Estimated cost drag</span><strong>{formatInr(analyzed.lifetimeLoss)}</strong></div>
          <RecommendationBadge value={analyzed.recommendation} />
        </Card>
        <Card className="panel">
          <SectionTitle title="Educational Calculator" />
          <label><span>Amount</span><input type="number" min="1000" step="1000" value={calculator.amount} onChange={(event) => setCalculator((current) => ({ ...current, amount: event.target.value }))} /></label>
          <label><span>Duration</span><input type="number" min="1" max="30" value={calculator.duration} onChange={(event) => setCalculator((current) => ({ ...current, duration: event.target.value }))} /></label>
          <Metric label="Projected value" value={formatInr(projectedValue)} />
          <p className="answer-callout warning">This is an estimate, not guaranteed.</p>
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
          <SectionTitle title="Explore Options" />
          <h2>{portfolioFund ? 'How does the lower-cost variant compare?' : 'How does this fund compare?'}</h2>
          <p>{portfolioFund ? `Direct plan has lower expense by ${formatPercent(Math.max(0, analyzed.currentExpense - analyzed.suggestedExpense))}. Estimated cost impact is ${formatInr(analyzed.lifetimeLoss)} before tax and exit-load effects.` : 'This fund can be compared for cost, benchmark fit, and risk level before any decision.'}</p>
          <div className="button-row">
            {alternatives.map((item) => <Button key={item.id} variant="secondary" onClick={() => navigate(`/fund/${item.id}`)}>{item.fundName}</Button>)}
          </div>
          <label><span>Compare with another fund</span><select onChange={(event) => event.target.value && navigate(`/fund/${event.target.value}`)} defaultValue=""><option value="">Select fund</option>{fundDataset.filter((item) => item.id !== fund.id).map((item) => <option key={item.id} value={item.id}>{item.fundName}</option>)}</select></label>
        </Card>
      </div>
    </section>
  );
}

function BenchmarkComparisonChart({ fund }) {
  const width = 720;
  const height = 260;
  const padding = 34;
  const fundRates = [fund.oneYearReturn, fund.threeYearReturn, fund.fiveYearReturn];
  const benchmarkRates = [
    (fund.benchmarkReturn || fund.fiveYearReturn) * 0.78,
    (fund.benchmarkReturn || fund.fiveYearReturn) * 0.9,
    fund.benchmarkReturn || fund.fiveYearReturn
  ];
  const points = ['1Y', '3Y', '5Y'].map((label, index) => ({ label, fund: fundRates[index], benchmark: benchmarkRates[index] }));
  const maxValue = Math.max(...points.flatMap((point) => [point.fund, point.benchmark]));
  const minValue = Math.min(...points.flatMap((point) => [point.fund, point.benchmark]));
  const range = Math.max(1, maxValue - minValue);
  const x = (index) => padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
  const y = (value) => height - padding - ((value - minValue) / range) * (height - padding * 2);
  const pathFor = (key) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point[key])}`).join(' ');

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fund versus benchmark return chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <path className="chart-primary" d={pathFor('fund')} />
        <path className="chart-muted" d={pathFor('benchmark')} />
      </svg>
      <div className="chart-legend">
        <span><i className="primary-line" />Fund</span>
        <span><i className="muted-line" />Benchmark</span>
      </div>
    </div>
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
