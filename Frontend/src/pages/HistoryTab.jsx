import { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getHistory, getVersionPreview, rollback } from '../api/datasetApi.js';
import DataTable from '../components/DataTable.jsx';

function formatOp(op) {
  return op.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatTs(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryTab() {
  const { datasetId, currentVersion, applyProcessResult } = useDataset();
  const { addToast } = useToast();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  useEffect(() => {
    if (!datasetId) return;
    setLoading(true);
    getHistory(datasetId)
      .then(d => setHistory(d.history || []))
      .catch(err => addToast({ type: 'error', title: 'History load failed', message: err.message }))
      .finally(() => setLoading(false));
  }, [datasetId, currentVersion]);

  async function selectVersion(item) {
    setSelected(item);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const data = await getVersionPreview(datasetId, item.version);
      setPreview(data);
    } catch (err) {
      addToast({ type: 'error', title: 'Preview failed', message: err.message });
    } finally { setPreviewLoading(false); }
  }

  async function handleRollback() {
    if (!selected) return;
    setRollbackLoading(true);
    try {
      const result = await rollback({ dataset_id: datasetId, target_version: selected.version });
      applyProcessResult(result);
      addToast({ type: 'success', title: 'Rolled back', message: `Now on v${result.version} (from v${selected.version})` });
      setSelected(null); setPreview(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Rollback failed', message: err.message });
    } finally { setRollbackLoading(false); }
  }

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', height: 'calc(100vh - 120px)' }}>
      {/* Timeline */}
      <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <span className="card-title">Operations</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{history.length} steps</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {loading ? (
            <div className="empty-state"><span className="spinner" /></div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">⌀</span>
              <span className="empty-state-desc">No operations recorded yet.</span>
            </div>
          ) : (
            <div className="timeline">
              {[...history].reverse().map((item) => (
                <div
                  key={item.id}
                  className={`timeline-item ${selected?.id === item.id ? 'active' : ''}`}
                  onClick={() => selectVersion(item)}
                >
                  <div className="timeline-spine">
                    <div className="timeline-dot" />
                    <div className="timeline-line" />
                  </div>
                  <div className="timeline-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="timeline-op">{formatOp(item.operation)}</div>
                      <span className="timeline-version">v{item.version}</span>
                    </div>
                    <div className="timeline-meta">
                      <span>{formatTs(item.timestamp)}</span>
                      <span>{item.shape?.rows}r × {item.shape?.columns}c</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Version Detail */}
      <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <span className="card-title">
            {selected ? `Version ${selected.version} — ${formatOp(selected.operation)}` : 'Select a version'}
          </span>
          {selected && selected.version !== currentVersion && (
            <button className="btn btn-primary btn-sm" onClick={handleRollback} disabled={rollbackLoading}>
              {rollbackLoading ? <span className="spinner" /> : '↩'} Rollback to v{selected.version}
            </button>
          )}
          {selected && selected.version === currentVersion && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', background: 'var(--cyan-glow)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: '4px', padding: '2px 8px' }}>
              Current
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {!selected ? (
            <div className="empty-state">
              <span className="empty-state-icon">⌀</span>
              <span className="empty-state-title">No version selected</span>
              <span className="empty-state-desc">Click an operation in the timeline to preview that version's data.</span>
            </div>
          ) : previewLoading ? (
            <div className="empty-state"><span className="spinner lg" /></div>
          ) : preview ? (
            <>
              <div className="stat-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card amber"><div className="stat-label">Rows</div><div className="stat-value">{preview.shape?.rows?.toLocaleString()}</div></div>
                <div className="stat-card blue"><div className="stat-label">Columns</div><div className="stat-value blue">{preview.shape?.columns}</div></div>
                <div className="stat-card cyan"><div className="stat-label">Operation</div><div className="stat-value" style={{ fontSize: '0.7rem', color: 'var(--cyan)', marginTop: '4px' }}>{formatOp(selected.operation)}</div></div>
              </div>

              {selected.parameters && Object.keys(selected.parameters).length > 0 && (
                <div className="code-block" style={{ marginBottom: '16px' }}>
                  {JSON.stringify(selected.parameters, null, 2)}
                </div>
              )}

              <DataTable rows={preview.preview || []} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
