import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bot, Check, MessageSquare, Send, SlidersHorizontal, Star, X } from 'lucide-react';
import { formatInr, formatPercent, generateCopilotResponse } from '../utils/analysisEngine';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }) {
  return <article className={`card ${className}`}>{children}</article>;
}

export function SummaryCard({ label, value, detail, tone = 'neutral', icon: Icon }) {
  return (
    <Card className={`summary-card ${tone}`}>
      <div className="summary-icon">{Icon ? <Icon size={18} /> : null}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </Card>
  );
}

export function RecommendationBadge({ value }) {
  const className = String(value || '').toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge ${className}`}>{value}</span>;
}

export function InsightCard({ insight, onClick }) {
  return (
    <button className={`insight-card ${insight.severity}`} onClick={onClick}>
      <span>{insight.title}</span>
      <p>{insight.detail}</p>
    </button>
  );
}

export function PortfolioCard({ fund, onView }) {
  return (
    <Card className="portfolio-card">
      <div className="portfolio-main">
        <div>
          <h3>{fund.fundName}</h3>
          <p>{fund.category} · {fund.assetClass}</p>
        </div>
        <RecommendationBadge value={fund.status} />
      </div>
      <div className="portfolio-metrics">
        <Metric label="Invested" value={formatInr(fund.amount)} />
        <Metric label="Current value" value={formatInr(fund.currentValue)} />
        <Metric label="Plan" value={fund.currentPlan} />
        <Metric label="Expense" value={formatPercent(fund.currentExpense)} />
        <Metric label="Hidden loss" value={formatInr(fund.lifetimeLoss)} strong />
      </div>
      <div className="portfolio-actions">
        <span>{fund.recommendation === 'Switch' ? 'Switch candidate' : fund.recommendation === 'Wait' ? 'Review later' : 'No urgent action'}</span>
        <Button variant="secondary" onClick={onView}>Open <ArrowRight size={16} /></Button>
      </div>
    </Card>
  );
}

export function FundCard({ fund, onView, onToggleWatch, watched }) {
  return (
    <Card className="fund-card">
      <div className="fund-card-top">
        <div>
          <h3>{fund.fundName}</h3>
          <p>{fund.category} · {fund.risk} risk</p>
        </div>
        {onToggleWatch ? (
          <button className={`icon-button small ${watched ? 'active' : ''}`} onClick={onToggleWatch} title="Save fund">
            <Star size={17} />
          </button>
        ) : null}
      </div>
      <div className="fund-stats">
        <Metric label="5Y return" value={`${fund.fiveYearReturn.toFixed(1)}%`} />
        <Metric label="Direct expense" value={formatPercent(fund.directExpense)} />
        <Metric label="Regular expense" value={formatPercent(fund.regularExpense)} />
        <Metric label="Risk" value={fund.risk} />
      </div>
      <Button variant="secondary" onClick={onView}>View fund <ArrowRight size={16} /></Button>
    </Card>
  );
}

export function Metric({ label, value, strong = false }) {
  return (
    <div className={strong ? 'metric strong' : 'metric'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function LineChart({ points, valueKey = 'value', label = 'Performance chart' }) {
  const width = 720;
  const height = 260;
  const padding = 34;
  const maxValue = Math.max(...points.map((point) => point[valueKey]));
  const minValue = Math.min(...points.map((point) => point[valueKey]));
  const range = Math.max(1, maxValue - minValue);
  const x = (index) => padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
  const y = (value) => height - padding - ((value - minValue) / range) * (height - padding * 2);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point[valueKey])}`).join(' ');

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <path className="chart-primary" d={path} />
      </svg>
    </div>
  );
}

export function GrowthComparisonChart({ fund }) {
  const width = 720;
  const height = 260;
  const padding = 34;
  const points = fund.chart;
  const maxValue = Math.max(...points.flatMap((point) => [point.current, point.switched]));
  const x = (index) => padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
  const y = (value) => height - padding - (value / maxValue) * (height - padding * 2);
  const pathFor = (key) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point[key])}`).join(' ');

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Direct versus current variant growth chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <path className="chart-muted" d={pathFor('current')} />
        <path className="chart-primary" d={pathFor('switched')} />
      </svg>
      <div className="chart-legend">
        <span><i className="muted-line" />Current</span>
        <span><i className="primary-line" />Direct</span>
      </div>
    </div>
  );
}

export function PieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 25;
  const colors = ['var(--accent)', 'var(--blue)', 'var(--amber)', 'var(--muted)'];
  const slices = data.map((item, index) => {
    const value = (item.value / total) * 100;
    const slice = <circle key={item.label} r="36" cx="50" cy="50" stroke={colors[index % colors.length]} strokeDasharray={`${value} ${100 - value}`} strokeDashoffset={offset} />;
    offset -= value;
    return slice;
  });

  return (
    <div className="pie-layout">
      <svg className="pie-chart" viewBox="0 0 100 100" role="img" aria-label="Allocation chart">
        <circle r="36" cx="50" cy="50" className="pie-track" />
        {slices}
      </svg>
      <div className="pie-legend">
        {data.map((item, index) => (
          <span key={item.label}><i style={{ background: colors[index % colors.length] }} />{item.label} {Math.round((item.value / total) * 100)}%</span>
        ))}
      </div>
    </div>
  );
}

export function CopilotPanel({ page, results, selectedFund }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: generateCopilotResponse('dashboard summary', { page, results, selectedFund })
    }
  ]);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: generateCopilotResponse('page summary', { page, results, selectedFund })
      }
    ]);
  }, [page, results, selectedFund]);

  function submit(text = draft) {
    const query = text.trim();
    if (!query) return;
    const response = generateCopilotResponse(query, { page, results, selectedFund });
    setMessages((current) => [...current, { role: 'user', text: query }, { role: 'assistant', content: response }]);
    setDraft('');
    setOpen(true);
  }

  const prompt = useMemo(() => {
    if (page === 'Explore') return 'Ask for low-cost funds...';
    if (page === 'Fund') return 'Ask about this fund...';
    if (page === 'Portfolio') return 'Ask what to fix first...';
    return 'Ask about your portfolio...';
  }, [page]);

  return (
    <>
      <form className="copilot-bar" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <Bot size={18} />
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={prompt} />
        <button type="submit" title="Ask copilot"><Send size={17} /></button>
      </form>
      <button className="floating-copilot" onClick={() => setOpen(true)} title="Open copilot">
        <MessageSquare size={22} />
      </button>
      <aside className={`copilot-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="copilot-head">
          <div>
            <span>SwitchWise Copilot</span>
            <strong>{page} context</strong>
          </div>
          <button className="icon-button small" onClick={() => setOpen(false)} title="Close copilot"><X size={18} /></button>
        </div>
        <div className="copilot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              {message.role === 'user' ? (
                <p>{message.text}</p>
              ) : (
                <div className="structured-answer">
                  <p><strong>Insight</strong>{message.content.insight}</p>
                  <p><strong>Evidence</strong>{message.content.evidence}</p>
                  <p><strong>Action</strong>{message.content.action}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="quick-prompts">
          {['Where am I losing money?', 'What should I fix first?', 'Compare these funds'].map((item) => (
            <button key={item} onClick={() => submit(item)}>{item}</button>
          ))}
        </div>
      </aside>
    </>
  );
}

export function FilterPill({ active, children, onClick }) {
  return (
    <button className={`filter-pill ${active ? 'active' : ''}`} onClick={onClick}>
      {active ? <Check size={14} /> : <SlidersHorizontal size={14} />}
      {children}
    </button>
  );
}
