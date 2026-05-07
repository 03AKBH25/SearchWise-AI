import React, { useMemo, useState } from 'react';
import { ArrowRight, Bot, Check, MessageSquare, Plus, Send, SlidersHorizontal, Star, Trash2, X } from 'lucide-react';
import { fundDataset } from '../data/fundDataset';
import { formatInr, formatPercent, generateCopilotResponse } from '../utils/analysisEngine';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const amcLogoMap = [
  { match: ['hdfc'], name: 'HDFC Mutual Fund', initials: 'HDFC', logo: 'https://logo.clearbit.com/hdfcfund.com' },
  { match: ['axis'], name: 'Axis Mutual Fund', initials: 'Axis', logo: 'https://logo.clearbit.com/axismf.com' },
  { match: ['sbi'], name: 'SBI Mutual Fund', initials: 'SBI', logo: 'https://logo.clearbit.com/sbimf.com' },
  { match: ['icici prudential', 'icici'], name: 'ICICI Prudential Mutual Fund', initials: 'ICICI', logo: 'https://logo.clearbit.com/icicipruamc.com' },
  { match: ['parag parikh', 'ppfas'], name: 'Parag Parikh Mutual Fund', initials: 'PPFAS', logo: 'https://logo.clearbit.com/ppfas.com' },
  { match: ['nippon'], name: 'Nippon India Mutual Fund', initials: 'Nippon', logo: 'https://logo.clearbit.com/nipponindiaim.com' },
  { match: ['mirae'], name: 'Mirae Asset Mutual Fund', initials: 'Mirae', logo: 'https://logo.clearbit.com/miraeassetmf.co.in' },
  { match: ['kotak'], name: 'Kotak Mutual Fund', initials: 'Kotak', logo: 'https://logo.clearbit.com/kotakmf.com' },
  { match: ['canara robeco', 'canara'], name: 'Canara Robeco Mutual Fund', initials: 'Canara', logo: 'https://logo.clearbit.com/canararobeco.com' }
];

function getAmcLogo(fund) {
  const name = `${fund?.fundName || ''} ${fund?.displayName || ''} ${fund?.slug || ''}`.toLowerCase();
  return amcLogoMap.find((item) => item.match.some((token) => name.includes(token))) || {
    name: 'Mutual fund company',
    initials: 'MF',
    logo: null
  };
}

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

export function SummaryCard({ label, value, detail, tone = 'neutral', icon: Icon, tooltip, onClick, children }) {
  return (
    <Card className={`summary-card ${tone} ${onClick ? 'interactive-summary' : ''}`}>
      {onClick ? <button className="summary-card-hitbox" onClick={onClick} aria-label={`Open ${label} analysis`} /> : null}
      <div className="summary-icon">{Icon ? <Icon size={18} /> : null}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
      {children}
      {tooltip ? <div className="summary-tooltip">{tooltip}</div> : null}
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

export function PortfolioCard({ fund, onView, onRemove }) {
  return (
    <Card className="portfolio-card">
      <div className="portfolio-main">
        <div>
          <h3>{fund.fundName || fund.displayName || fund.name || fund.schemeName}</h3>
          <p>{fund.category} · {fund.assetClass || 'Equity'}</p>
        </div>
        <RecommendationBadge value={fund.status} />
      </div>
      <div className="portfolio-metrics">
        <Metric label="Invested" value={formatInr(fund.amount)} />
        <Metric label="Units" value={fund.units?.toFixed(2) || '0.00'} />
        <Metric label="Current value" value={formatInr(fund.currentValue)} />
        <Metric label="Returns" value={
          <span className={fund.currentValue >= fund.amount ? 'text-good' : 'text-danger'}>
            {fund.currentValue >= fund.amount ? '+' : ''}{formatInr(fund.currentValue - fund.amount)}
          </span>
        } />
        <Metric label="Plan" value={fund.currentPlan} />
        <Metric label="Expense" value={formatPercent(fund.currentExpense)} />
      </div>
      <div className="portfolio-actions">
        <span>{fund.recommendation === 'Explore' ? 'Cost review area' : fund.recommendation === 'Wait' ? 'Review later' : 'No urgent action'}</span>
        <div className="button-row">
          {onRemove && (
            <Button variant="danger-ghost" onClick={onRemove} title="Remove from portfolio">
              <Trash2 size={16} />
            </Button>
          )}
          <Button variant="secondary" onClick={onView}>Open <ArrowRight size={16} /></Button>
        </div>
      </div>
    </Card>
  );
}

export function FundCard({ fund, onView, onToggleWatch, onAdd, watched }) {
  return (
    <Card className="fund-card">
      <div className="fund-card-top">
        <div>
          <h3>{fund.fundName || fund.displayName || fund.name || fund.schemeName}</h3>
          <p>{fund.category} · {(fund.risk || fund.riskLabel || 'Moderate')} risk</p>
        </div>
        {onToggleWatch ? (
          <button className={`icon-button small ${watched ? 'active' : ''}`} onClick={onToggleWatch} title="Save fund">
            <Star size={17} />
          </button>
        ) : null}
      </div>
      <div className="fund-stats">
        <Metric 
          label="5Y return" 
          value={fund.fiveYearReturn ? `${fund.fiveYearReturn.toFixed(1)}%` : 'Explore history'} 
        />
        <Metric 
          label="Direct expense" 
          value={formatPercent(fund.directExpense || fund.variants?.direct?.expenseRatio)} 
        />
        <Metric 
          label="Regular expense" 
          value={formatPercent(fund.regularExpense || fund.variants?.regular?.expenseRatio)} 
        />
        <Metric label="Risk" value={fund.risk || fund.riskLabel || 'Moderate'} />
      </div>
      <div className="fund-card-actions">
        <Button variant="secondary" onClick={onView}>View fund <ArrowRight size={16} /></Button>
        {onAdd && <Button onClick={onAdd} className="btn-add-fund"><Plus size={16} /> Add</Button>}
      </div>
    </Card>
  );
}

export function TrendingCard({ fund, onClick }) {
  const latestNav = fund?.latestNav || fund?.variants?.direct?.nav || 0;
  const returnVal = fund?.fiveYearReturn || 12.5;
  const logo = getAmcLogo(fund);
  
  return (
    <Card className="trending-card-wrapper">
      <button className="trending-card-hitbox" onClick={onClick} />
      <div className="trending-logo" aria-label={logo.name}>
        {logo.logo ? <img src={logo.logo} alt="" loading="lazy" onError={(event) => event.currentTarget.remove()} /> : null}
        <span>{logo.initials}</span>
      </div>
      <div className="trending-info">
        <strong>{fund?.fundName || fund?.displayName}</strong>
        <div className="trending-metrics">
          <span>₹{latestNav.toFixed(2)}</span>
          <span className="trend-up">+{returnVal.toFixed(1)}%</span>
        </div>
      </div>
    </Card>
  );
}

export function PortfolioMiniCard({ fund, onClick }) {
  return (
    <Card className="mini-holding-card-wrapper">
      <button className="mini-card-hitbox" onClick={onClick} />
      <div className="mini-card-info">
        <strong>{fund?.fundName || fund?.displayName}</strong>
        <span>{formatInr(fund?.amount || fund?.investedAmount)}</span>
      </div>
      <ArrowRight size={14} className="mini-card-arrow" />
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

function getTimeBasedGreeting(name = 'there') {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  return `Good ${period}, ${name}`;
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1) return null;
    
    let slice = raw.slice(start);
    if (end !== -1 && end > start) {
      slice = raw.slice(start, end + 1);
    }
    
    try {
      return JSON.parse(slice);
    } catch {
      // Very basic attempt to close JSON if truncated
      try {
        let fixed = slice;
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        if (openBraces > closeBraces) {
          fixed += '}'.repeat(openBraces - closeBraces);
        }
        return JSON.parse(fixed);
      } catch {
        return null;
      }
    }
  }
}

function splitLines(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.replace(/^[•\-\d.\s]+/, '').trim())
    .filter(Boolean);
}

function normalizeBlock(block) {
  if (!block) return null;
  if (typeof block === 'string') return { type: 'paragraph', text: block };
  if (block.type === 'table') {
    const columns = Array.isArray(block.columns) ? block.columns.map(String) : [];
    const rows = Array.isArray(block.rows) ? block.rows.map((row) => (Array.isArray(row) ? row.map(String) : columns.map((column) => String(row?.[column] ?? '')))) : [];
    return columns.length && rows.length ? { type: 'table', title: block.title || '', columns, rows } : null;
  }
  if (block.type === 'bullets' || block.type === 'steps') {
    const items = Array.isArray(block.items) ? block.items.map(String).filter(Boolean) : splitLines(block.text || block.content);
    return items.length ? { type: block.type, title: block.title || '', items } : null;
  }
  if (block.type === 'chart') {
    return {
      type: 'chart',
      title: block.title || '',
      chartType: block.chartType || 'bar',
      labels: Array.isArray(block.labels) ? block.labels : [],
      datasets: Array.isArray(block.datasets) ? block.datasets : []
    };
  }
  if (block.type === 'flow') {
    return {
      type: 'flow',
      title: block.title || '',
      steps: Array.isArray(block.steps) ? block.steps : []
    };
  }
  if (block.type === 'callout') {
    const text = String(block.text || '').trim();
    return text ? { type: 'callout', tone: block.tone || 'info', text } : null;
  }
  const text = String(block.text || block.content || '').trim();
  return text ? { type: 'paragraph', text } : null;
}

function legacyBlocks(answer) {
  const blocks = [];
  if (answer.insight) blocks.push({ type: 'paragraph', text: answer.insight });
  if (answer.evidence) blocks.push({ type: 'bullets', title: 'Evidence', items: splitLines(answer.evidence) });
  if (answer.action) blocks.push({ type: 'steps', title: 'Suggested next steps', items: splitLines(answer.action) });
  return blocks;
}

function CopilotAnswer({ content }) {
  const blocks = (content.blocks?.length ? content.blocks : legacyBlocks(content)).map(normalizeBlock).filter(Boolean);
  return (
    <div className={`copilot-answer ${content.type || 'answer'}`}>
      {content.title ? <h3>{content.title}</h3> : null}
      {content.summary ? <p className="answer-summary">{content.summary}</p> : null}
      {blocks.map((block, index) => {
        if (block.type === 'table') {
          return (
            <div className="answer-table-wrap" key={index}>
              {block.title ? <h4>{block.title}</h4> : null}
              <table className="answer-table">
                <thead>
                  <tr>{block.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>{block.columns.map((column, columnIndex) => <td key={column}>{row[columnIndex]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'chart') {
          const maxVal = Math.max(1, ...block.datasets.flatMap(ds => ds.data || []));
          return (
            <div className="answer-chart" key={index}>
              {block.title ? <h4>{block.title}</h4> : null}
              <div className="chart-bars">
                {block.labels.map((label, i) => (
                  <div className="chart-group" key={i}>
                    <div className="bars">
                      {block.datasets.map((ds, j) => (
                        <div 
                          className="bar" 
                          key={j} 
                          title={`${ds.label}: ${ds.data[i]}`}
                          style={{ height: `${(ds.data[i] / maxVal) * 100}%` }}
                        />
                      ))}
                    </div>
                    <span className="chart-label">{label}</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                {block.datasets.map((ds, i) => (
                  <span key={i}><i className={`color-${i}`} /> {ds.label}</span>
                ))}
              </div>
            </div>
          );
        }
        if (block.type === 'flow') {
          return (
            <div className="answer-flow" key={index}>
              {block.title ? <h4>{block.title}</h4> : null}
              <div className="flow-steps">
                {block.steps.map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flow-node">{step}</div>
                    {i < block.steps.length - 1 && <div className="flow-arrow">→</div>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        }
        if (block.type === 'bullets') {
          return (
            <section className="answer-section" key={index}>
              {block.title ? <h4>{block.title}</h4> : null}
              <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          );
        }
        if (block.type === 'steps') {
          return (
            <section className="answer-section" key={index}>
              {block.title ? <h4>{block.title}</h4> : null}
              <ol>{block.items.map((item) => <li key={item}>{item}</li>)}</ol>
            </section>
          );
        }
        if (block.type === 'callout') return <p className={`answer-callout ${block.tone}`} key={index}>{block.text}</p>;
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}

export function CopilotPanel({ page, results, selectedFund, userName = 'Aniket', calculatorState }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [panelDraft, setPanelDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState([]);

  function buildContext() {
    return {
      page,
      results,
      selectedFund,
      fundUniverse: fundDataset,
      calculator: calculatorState
    };
  }

  function normalizeAnswer(answer) {
    if (!answer) return null;
    if (typeof answer === 'string') {
      const parsed = extractJsonObject(answer);
      if (parsed) return normalizeAnswer(parsed);
      return { type: 'answer', title: '', summary: answer, blocks: [{ type: 'paragraph', text: answer }] };
    }
    const nestedInsight = typeof answer.insight === 'string' && answer.insight.trim().startsWith('{')
      ? extractJsonObject(answer.insight)
      : null;
    if (nestedInsight) return normalizeAnswer({ ...answer, ...nestedInsight });
    const blocks = (Array.isArray(answer.blocks) ? answer.blocks : legacyBlocks(answer)).map(normalizeBlock).filter(Boolean);
    return {
      type: answer.type || 'answer',
      title: answer.title || '',
      summary: answer.summary || (!answer.blocks ? answer.insight : ''),
      blocks: blocks.length ? blocks : [{ type: 'paragraph', text: 'I need a little more context to answer this well.' }]
    };
  }

  async function askCopilot(query, options = {}) {
    try {
      if (!options.silent) {
        setLoading(true);
        setStatus('Thinking...');
      }
      const response = await fetch(`${API_BASE_URL}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, context: buildContext() })
      });

      if (!response.ok) throw new Error('Copilot request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalResponse = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'status') {
                setStatus(data.status);
              } else if (data.type === 'final') {
                finalResponse = data.response;
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      if (finalResponse) return normalizeAnswer(finalResponse);
      throw new Error('No final response received from AI');
    } catch (error) {
      console.warn('Copilot API unavailable, using local fallback:', error);
      return generateCopilotResponse(query, { page, results, selectedFund });
    } finally {
      if (!options.silent) {
        setLoading(false);
        setStatus('');
      }
    }
  }

  async function submit(text = draft, source = 'bar') {
    const query = text.trim();
    if (!query) return;
    setMessages((current) => [...current, { role: 'user', text: query }]);
    if (source === 'panel') {
      setPanelDraft('');
    } else {
      setDraft('');
    }
    setOpen(true);
    const response = await askCopilot(query);
    setMessages((current) => [...current, { role: 'assistant', content: response }]);
  }

  const prompt = useMemo(() => {
    if (page === 'Explore') return 'Ask for low-cost funds...';
    if (page === 'Fund') return 'Ask about this fund...';
    if (page === 'Portfolio') return 'Ask what to fix first...';
    return 'Ask about your portfolio...';
  }, [page]);
  const greeting = useMemo(() => getTimeBasedGreeting(userName), [userName]);
  const quickPrompts = ['Where am I losing money?', 'What should I fix first?', 'Compare these funds'];

  return (
    <>
      <form className="copilot-bar" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <Bot size={18} />
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={prompt} />
        <button type="submit" title="Ask copilot" disabled={loading}><Send size={17} /></button>
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
          {messages.length === 0 && !loading ? (
            <div className="copilot-welcome">
              <p>{greeting}</p>
              <div className="quick-prompts">
                {quickPrompts.map((item) => (
                  <button key={item} onClick={() => submit(item, 'panel')}>{item}</button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              {message.role === 'user' ? (
                <p>{message.text}</p>
              ) : (
                <CopilotAnswer content={message.content} />
              )}
            </div>
          ))}
          {loading ? (
            <div className="message assistant">
              <div className="copilot-answer">
                <p className="answer-summary">{status || 'Thinking...'}</p>
              </div>
            </div>
          ) : null}
        </div>
        <form className="copilot-compose" onSubmit={(event) => { event.preventDefault(); submit(panelDraft, 'panel'); }}>
          <input
            value={panelDraft}
            onChange={(event) => setPanelDraft(event.target.value)}
            placeholder={prompt}
            disabled={loading}
          />
          <button type="submit" title="Send message" disabled={loading || !panelDraft.trim()}>
            <Send size={17} />
          </button>
        </form>
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
