import React from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { formatInr } from '../utils/analysisEngine';

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

export function RecommendationBadge({ value }) {
  return <span className={`badge ${String(value).toLowerCase()}`}>{value}</span>;
}

export function FundInputRow({ row, index, canRemove, error, onChange, onRemove }) {
  return (
    <div className="fund-input-row">
      <label>
        <span>Fund name</span>
        <input
          value={row.fundName}
          onChange={(event) => onChange(index, { ...row, fundName: event.target.value })}
          placeholder="e.g. HDFC Flexi Cap Fund Regular"
        />
        {error?.fundName && <small className="error">{error.fundName}</small>}
      </label>
      <label>
        <span>Amount</span>
        <input
          type="number"
          min="1"
          value={row.amount}
          onChange={(event) => onChange(index, { ...row, amount: Number(event.target.value) })}
        />
        {error?.amount && <small className="error">{error.amount}</small>}
      </label>
      <label>
        <span>Years</span>
        <input
          type="number"
          min="1"
          value={row.years}
          onChange={(event) => onChange(index, { ...row, years: Number(event.target.value) })}
          placeholder="10"
        />
      </label>
      <button className="icon-action" onClick={() => onRemove(index)} disabled={!canRemove} title="Remove fund">
        <Trash2 size={18} />
      </button>
    </div>
  );
}

export function AddRowButton({ onClick }) {
  return (
    <button className="add-row" onClick={onClick}>
      <Plus size={18} />
      Add another fund
    </button>
  );
}

export function SummaryCard({ results, onReview }) {
  return (
    <Card className="summary-card">
      <div>
        <span className="eyebrow">Portfolio result</span>
        <h2>You may lose {formatInr(results.totalLoss)}</h2>
        <p>{results.actionCount} fund{results.actionCount === 1 ? '' : 's'} need action based on expense drag.</p>
      </div>
      <Button onClick={onReview}>
        Review Details
        <ArrowRight size={18} />
      </Button>
    </Card>
  );
}

export function ComparisonTable({ fund }) {
  return (
    <table className="comparison-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Current</th>
          <th>Suggested</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Plan</td>
          <td>{fund.currentPlan}</td>
          <td>{fund.suggestedPlan}</td>
        </tr>
        <tr>
          <td>Expense Ratio</td>
          <td>{fund.currentExpense.toFixed(2)}%</td>
          <td>{fund.suggestedExpense.toFixed(2)}%</td>
        </tr>
        <tr>
          <td>Expected return</td>
          <td>{fund.expectedReturn.toFixed(1)}%</td>
          <td>{fund.expectedReturn.toFixed(1)}%</td>
        </tr>
      </tbody>
    </table>
  );
}

export function FundCard({ fund, onView }) {
  return (
    <Card className="fund-card">
      <div className="fund-card-header">
        <div>
          <h3>{fund.fundName}</h3>
          <p>{fund.category} · Current plan: {fund.currentPlan}</p>
        </div>
        <RecommendationBadge value={fund.recommendation} />
      </div>
      <ComparisonTable fund={fund} />
      <div className="fund-card-footer">
        <strong>You may lose {formatInr(fund.lifetimeLoss)}</strong>
        <Button variant="secondary" onClick={onView}>
          View Details
          <ArrowRight size={16} />
        </Button>
      </div>
    </Card>
  );
}

export function GrowthChart({ fund }) {
  const width = 680;
  const height = 260;
  const padding = 34;
  const points = fund.chart;
  const maxValue = Math.max(...points.flatMap((point) => [point.current, point.switched]));
  const x = (index) => padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
  const y = (value) => height - padding - (value / maxValue) * (height - padding * 2);
  const pathFor = (key) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point[key])}`).join(' ');

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Growth comparison chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <path className="chart-current" d={pathFor('current')} />
        <path className="chart-switched" d={pathFor('switched')} />
      </svg>
      <div className="chart-legend">
        <span><i className="current" />Current</span>
        <span><i className="switched" />Switched</span>
      </div>
    </div>
  );
}

export function BreakdownPanel({ fund }) {
  const expenseDiff = fund.currentExpense - fund.suggestedExpense;
  return (
    <Card className="breakdown">
      <h3>Calculation Breakdown</h3>
      <div className="breakdown-grid">
        <div>
          <span>Expense difference</span>
          <strong>{expenseDiff.toFixed(2)}%</strong>
        </div>
        <div>
          <span>Current future value</span>
          <strong>{formatInr(fund.currentFV)}</strong>
        </div>
        <div>
          <span>Switched future value</span>
          <strong>{formatInr(fund.switchedFV)}</strong>
        </div>
      </div>
      <p>
        The model applies the same expected return to both variants, then subtracts each plan's expense ratio before compounding.
      </p>
    </Card>
  );
}
