import { useState } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { processMissing } from '../api/datasetApi.js';

export default function MissingValuesTab() {
  const { datasetId, columns, missing, missingPct, applyProcessResult } = useDataset();
  const { addToast } = useToast();

  const [selectedCol, setSelectedCol] = useState('');
  const [method, setMethod] = useState('mean');
  const [customVal, setCustomVal] = useState('');
  const [loading, setLoading] = useState(false);

  const colsWithMissing = columns.filter(c => (missing[c] || 0) > 0);
  const totalMissing = Object.values(missing).reduce((a, b) => a + b, 0);

  async function handleApply() {
    if (!selectedCol || !method) return;
    setLoading(true);
    try {
      const result = await processMissing({
        dataset_id: datasetId,
        column: selectedCol,
        method,
        value: method === 'custom' ? customVal : undefined,
      });
      applyProcessResult(result);
      addToast({ type: 'success', title: 'Applied', message: `${method} on "${selectedCol}" → v${result.version}` });
      setSelectedCol('');
    } catch (err) {
      addToast({ type: 'error', title: 'Operation failed', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const barColor = (pct) => pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low';

  return (
    <div className="fade-in">
      {/* Summary stat */}
      <div className="stat-grid fade-in" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card red">
          <div className="stat-label">Total Missing</div>
          <div className="stat-value" style={{ color: totalMissing ? 'var(--red)' : 'var(--cyan)' }}>{totalMissing.toLocaleString()}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Cols with Nulls</div>
          <div className="stat-value amber">{colsWithMissing.length}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Complete Cols</div>
          <div className="stat-value blue">{columns.length - colsWithMissing.length}</div>
        </div>
      </div>

      {/* Missing heatmap */}
      <div className="card fade-in fade-in-delay-1" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">Missing Value Map</span>
        </div>
        <div className="card-body">
          {columns.length === 0 ? (
            <div className="empty-state"><span className="empty-state-desc">No columns found.</span></div>
          ) : (
            <div>
              <div className="missing-bar-row" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>COLUMN</span><span>MISSING %</span><span style={{ textAlign: 'right' }}>COUNT</span><span style={{ textAlign: 'right' }}>PERCENT</span>
              </div>
              {columns.map(col => {
                const cnt = missing[col] || 0;
                const pct = missingPct[col] || 0;
                return (
                  <div key={col} className="missing-bar-row">
                    <span className="missing-col-name" title={col}>{col}</span>
                    <div className="missing-bar-track">
                      <div className={`missing-bar-fill ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="missing-count">{cnt}</span>
                    <span className="missing-pct">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Panel */}
      <div className="card fade-in fade-in-delay-2">
        <div className="card-header">
          <span className="card-title">Apply Treatment</span>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Column</label>
              <select className="form-select" value={selectedCol} onChange={e => setSelectedCol(e.target.value)}>
                <option value="">— Select column —</option>
                {columns.map(c => (
                  <option key={c} value={c}>{c} {missing[c] ? `(${missing[c]} nulls)` : '✓'}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="mean">Fill — Mean</option>
                <option value="median">Fill — Median</option>
                <option value="mode">Fill — Mode</option>
                <option value="custom">Fill — Custom value</option>
                <option value="drop_rows">Drop rows with nulls</option>
                <option value="drop_column">Drop entire column</option>
              </select>
            </div>
            {method === 'custom' && (
              <div className="form-group">
                <label className="form-label">Custom Value</label>
                <input className="form-input" value={customVal} onChange={e => setCustomVal(e.target.value)} placeholder="e.g. 0 or N/A" />
              </div>
            )}
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleApply}
                disabled={!selectedCol || loading}
              >
                {loading ? <span className="spinner" /> : '▶'} Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
