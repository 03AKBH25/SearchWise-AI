import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  CircleUserRound,
  Flame,
  LayoutDashboard,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  WalletCards
} from 'lucide-react';
import { AppStateProvider, useAppState } from './state/AppState';
import { fundDataset } from './data/fundDataset';
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
import { analyzeHolding, findFundById, formatInr, formatPercent, getFundAlternatives } from './utils/analysisEngine';
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
  const loggedIn = path !== '/';
  const { results, selectedFund } = useAppState();
  const userName = 'Aniket';

  if (!loggedIn) return <LandingPage theme={theme} setTheme={setTheme} />;

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
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <button className="brand" onClick={() => navigate('/')}>
          <span>SW</span>
          SwitchWise AI
        </button>
        <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>
      <section className="landing-hero">
        <div className="hero-panel">
          <span className="eyebrow">Mutual fund intelligence</span>
          <h1>You might be losing money in your mutual funds</h1>
          <p>SwitchWise AI detects hidden expense drag, Regular plan leakage, and priority fixes without touching your transactions.</p>
          <div className="hero-actions">
            <Button onClick={() => navigate('/dashboard')}>Analyze My Portfolio <Sparkles size={18} /></Button>
            <Button variant="ghost" onClick={() => navigate('/explore')}>Explore Funds</Button>
          </div>
        </div>
        <Card className="loss-preview">
          <Flame size={22} />
          <span>Estimated hidden loss</span>
          <strong>₹1.42L</strong>
          <p>Detected across Regular plans in the sample portfolio.</p>
        </Card>
      </section>
      <section className="steps-band">
        {[
          ['Add', 'Bring your holdings into one clean portfolio view.'],
          ['Analyze', 'See costs, allocation, plan variants, and hidden loss.'],
          ['Improve', 'Act on the highest-impact switches first.']
        ].map(([title, copy]) => (
          <Card key={title} className="step-card">
            <span>{title}</span>
            <p>{copy}</p>
          </Card>
        ))}
      </section>
      <div className="trust-note">
        <ShieldCheck size={18} />
        Uses public fund data and deterministic calculations. SwitchWise AI is a decision-support platform, not a trading platform.
      </div>
    </main>
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
  const { results, setSelectedFundId } = useAppState();
  const id = decodeURIComponent(path.replace('/fund/', ''));
  const fund = findFundById(id) || fundDataset[0];
  const portfolioFund = results.funds.find((item) => item.baseFundId === id);
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
