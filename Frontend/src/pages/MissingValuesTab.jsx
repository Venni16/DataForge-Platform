import { useState } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { processMissing, processMissingBatch } from '../api/datasetApi.js';

export default function MissingValuesTab() {
  const { datasetId, columns, missing, missingPct, numericColumns, categoricalColumns, applyProcessResult } = useDataset();
  const { addToast } = useToast();

  const [selectedCol, setSelectedCol] = useState('');
  const [method, setMethod] = useState('mean');
  const [customVal, setCustomVal] = useState('');
  const [loading, setLoading] = useState(false);

  // Bulk state
  const [bulkType, setBulkType] = useState('numeric'); // numeric | categorical
  const [bulkMethod, setBulkMethod] = useState('mean');
  const [bulkLoading, setBulkLoading] = useState(false);

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

  async function handleBulkApply() {
    const targetCols = (bulkType === 'numeric' ? numericColumns : categoricalColumns)
      .filter(c => (missing[c] || 0) > 0);
      
    if (targetCols.length === 0) {
      addToast({ type: 'info', title: 'Skipped', message: `No missing values found in ${bulkType} columns.` });
      return;
    }

    setBulkLoading(true);
    try {
      const operations = targetCols.map(col => ({
        column: col,
        method: bulkMethod
      }));

      const result = await processMissingBatch({
        dataset_id: datasetId,
        operations
      });

      applyProcessResult(result);
      addToast({ 
        type: 'success', 
        title: 'Bulk Applied', 
        message: `Applied "${bulkMethod}" to ${targetCols.length} columns.` 
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Bulk fail', message: err.message });
    } finally {
      setBulkLoading(false);
    }
  }

  const barColor = (pct) => pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low';

  return (
    <div className="fade-in">
      {/* Summary stats */}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Table */}
        <div className="card fade-in fade-in-delay-1">
          <div className="card-header">
            <span className="card-title">Detailed Analysis</span>
          </div>
          <div className="card-body">
            {columns.length === 0 ? (
              <div className="empty-state"><span className="empty-state-desc">No columns found.</span></div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <div className="missing-bar-row" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>COLUMN</span><span>MAP</span><span style={{ textAlign: 'right' }}>COUNT</span><span style={{ textAlign: 'right' }}>%</span>
                </div>
                {columns.map(col => {
                  const cnt = missing[col] || 0;
                  const pct = missingPct[col] || 0;
                  return (
                    <div key={col} className="missing-bar-row">
                      <span className="missing-col-name" style={{ fontSize: '0.68rem' }} title={col}>{col}</span>
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

        {/* Right: Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Individual Panel */}
          <div className="card fade-in fade-in-delay-2">
            <div className="card-header">
              <span className="card-title">Single Column Treatment</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Target Column</label>
                <select className="form-select" value={selectedCol} onChange={e => setSelectedCol(e.target.value)}>
                  <option value="">— Select column —</option>
                  {columns.map(c => (
                    <option key={c} value={c}>{c} {missing[c] ? `(${missing[c]} nulls)` : '✓'}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Strategy</label>
                <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="mean">Mean (Numeric only)</option>
                  <option value="median">Median (Numeric only)</option>
                  <option value="mode">Most Frequent (Mode)</option>
                  <option value="knn">KNN Imputer (Advanced)</option>
                  <option value="iterative">Iterative Imputer (Bayesian)</option>
                  <option value="custom">Custom value</option>
                  <option value="drop_rows">Drop rows with nulls</option>
                  <option value="drop_column">Drop entire column</option>
                </select>
              </div>
              {method === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Value</label>
                  <input className="form-input" value={customVal} onChange={e => setCustomVal(e.target.value)} placeholder="0 or 'Unknown'" />
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={handleApply}
                disabled={!selectedCol || loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? <span className="spinner" /> : '▶'} Apply Change
              </button>
            </div>
          </div>

          {/* Bulk Panel */}
          <div className="card fade-in fade-in-delay-3" style={{ border: '1px solid var(--blue-glow)' }}>
            <div className="card-header" style={{ background: 'rgba(56, 189, 248, 0.03)' }}>
              <span className="card-title" style={{ color: 'var(--blue)' }}>Bulk Operations</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Group</label>
                <select className="form-select" value={bulkType} onChange={e => setBulkType(e.target.value)}>
                  <option value="numeric">All Numeric columns ({numericColumns.length})</option>
                  <option value="categorical">All Categorical columns ({categoricalColumns.length})</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-select" value={bulkMethod} onChange={e => setBulkMethod(e.target.value)}>
                  {bulkType === 'numeric' ? (
                    <>
                      <option value="mean">Mean</option>
                      <option value="median">Median</option>
                      <option value="knn">KNN Imputer</option>
                    </>
                  ) : null}
                   <option value="mode">Most Frequent (Mode)</option>
                   <option value="drop_rows">Drop Rows</option>
                </select>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleBulkApply}
                disabled={bulkLoading}
                style={{ marginTop: '8px', border: '1px solid var(--blue-dim)', color: 'var(--blue)' }}
              >
                {bulkLoading ? <span className="spinner" /> : '⚡ Batch Process'}
              </button>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                Note: Will only affect columns with missing data.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
