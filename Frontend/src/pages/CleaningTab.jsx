import { useState } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { processDuplicates, processDropColumn, processOutliers } from '../api/datasetApi.js';

export default function CleaningTab() {
  const { datasetId, columns, numericColumns, shape, applyProcessResult } = useDataset();
  const { addToast } = useToast();

  const [dupLoading, setDupLoading] = useState(false);
  const [outlierCol, setOutlierCol] = useState('');
  const [outlierMethod, setOutlierMethod] = useState('iqr');
  const [outlierAction, setOutlierAction] = useState('remove');
  const [threshold, setThreshold] = useState(3.0);
  const [outlierLoading, setOutlierLoading] = useState(false);

  const [dropCol, setDropCol] = useState('');
  const [dropColLoading, setDropColLoading] = useState(false);

  async function handleRemoveDups() {
    setDupLoading(true);
    try {
      const result = await processDuplicates({ dataset_id: datasetId });
      applyProcessResult(result);
      addToast({ type: 'success', title: 'Duplicates removed', message: `${result.rows_removed ?? 0} rows removed → v${result.version}` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err.message });
    } finally { setDupLoading(false); }
  }

  async function handleDropColumn() {
    if (!dropCol) return;
    setDropColLoading(true);
    try {
      const result = await processDropColumn({ dataset_id: datasetId, column: dropCol });
      applyProcessResult(result);
      addToast({ type: 'success', title: 'Column dropped', message: `'${dropCol}' removed completely → v${result.version}` });
      setDropCol(''); // reset after successful drop
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err.message });
    } finally { setDropColLoading(false); }
  }

  async function handleOutliers() {
    if (!outlierCol) return;
    setOutlierLoading(true);
    try {
      const result = await processOutliers({
        dataset_id: datasetId,
        column: outlierCol,
        method: outlierMethod,
        action: outlierAction,
        threshold: Number(threshold),
      });
      applyProcessResult(result);
      addToast({ type: 'success', title: 'Outliers handled', message: `${result.rows_affected ?? 0} rows affected → v${result.version}` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err.message });
    } finally { setOutlierLoading(false); }
  }

  return (
    <div className="fade-in">
      {/* Duplicate Removal */}
      <div className="card fade-in" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">Duplicate Row Removal</span>
        </div>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Current dataset: <span style={{ color: 'var(--amber)' }}>{shape.rows.toLocaleString()}</span> rows
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              All exact duplicate rows will be dropped. A new versioned snapshot will be created.
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleRemoveDups} disabled={dupLoading}>
            {dupLoading ? <span className="spinner" /> : '✦'} Remove Duplicates
          </button>
        </div>
      </div>

      {/* Drop Column */}
      <div className="card fade-in" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">Drop Column</span>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Select Column</label>
              <select className="form-select" value={dropCol} onChange={e => setDropCol(e.target.value)}>
                <option value="">— Select column —</option>
                {columns?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-danger" style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }} onClick={handleDropColumn} disabled={!dropCol || dropColLoading}>
                {dropColLoading ? <span className="spinner" /> : '🗑'} Drop Target Column
              </button>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '12px' }}>
            Warning: Dropping a column completely removes it from your dataset. This creates a new version snapshot.
          </div>
        </div>
      </div>

      {/* Outlier Detection */}
      <div className="card fade-in fade-in-delay-1">
        <div className="card-header">
          <span className="card-title">Outlier Detection & Removal</span>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Column (numeric)</label>
              <select className="form-select" value={outlierCol} onChange={e => setOutlierCol(e.target.value)}>
                <option value="">— Select column —</option>
                {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="form-select" value={outlierMethod} onChange={e => setOutlierMethod(e.target.value)}>
                <option value="iqr">IQR (Interquartile Range)</option>
                <option value="zscore">Z-Score</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Action</label>
              <select className="form-select" value={outlierAction} onChange={e => setOutlierAction(e.target.value)}>
                <option value="remove">Remove outlier rows</option>
                <option value="cap">Cap to boundary</option>
              </select>
            </div>
            {outlierMethod === 'zscore' && (
              <div className="form-group">
                <label className="form-label">Threshold (σ)</label>
                <input
                  type="number" min="0.5" max="10" step="0.5"
                  className="form-input"
                  value={threshold}
                  onChange={e => setThreshold(e.target.value)}
                />
              </div>
            )}
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleOutliers} disabled={!outlierCol || outlierLoading}>
                {outlierLoading ? <span className="spinner" /> : '⬡'} Apply
              </button>
            </div>
          </div>

          {/* Method explanations */}
          <div className="divider" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { name: 'IQR Method', desc: 'Defines outliers as values below Q1 − 1.5×IQR or above Q3 + 1.5×IQR. Robust to skewed distributions.' },
              { name: 'Z-Score Method', desc: 'Defines outliers as values with |z| > threshold. Assumes normal distribution. Default threshold: 3σ.' },
            ].map(({ name, desc }) => (
              <div key={name} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--blue)', fontWeight: 600, marginBottom: '6px' }}>{name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
