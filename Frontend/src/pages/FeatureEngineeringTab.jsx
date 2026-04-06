import { useState } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { processEncoding, processScaling } from '../api/datasetApi.js';

export default function FeatureEngineeringTab() {
  const { datasetId, columns, numericColumns, categoricalColumns, applyProcessResult } = useDataset();
  const { addToast } = useToast();

  const [encCol, setEncCol] = useState('');
  const [encMethod, setEncMethod] = useState('onehot');
  const [encLoading, setEncLoading] = useState(false);

  const [scaleSelected, setScaleSelected] = useState([]);
  const [scaleMethod, setScaleMethod] = useState('minmax');
  const [scaleLoading, setScaleLoading] = useState(false);

  async function handleEncoding() {
    if (!encCol) return;
    setEncLoading(true);
    try {
      const result = await processEncoding({ dataset_id: datasetId, column: encCol, method: encMethod });
      applyProcessResult(result);
      addToast({ type: 'success', title: 'Encoding applied', message: `${encMethod} on "${encCol}" → v${result.version}` });
      setEncCol('');
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err.message });
    } finally { setEncLoading(false); }
  }

  async function handleScaling() {
    if (!scaleSelected.length) return;
    setScaleLoading(true);
    try {
      const result = await processScaling({ dataset_id: datasetId, columns: scaleSelected, method: scaleMethod });
      applyProcessResult(result);
      addToast({ type: 'success', title: 'Scaling applied', message: `${scaleMethod} on ${scaleSelected.length} cols → v${result.version}` });
      setScaleSelected([]);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err.message });
    } finally { setScaleLoading(false); }
  }

  const toggleScale = (col) => {
    setScaleSelected(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  return (
    <div className="fade-in">
      {/* Encoding */}
      <div className="card fade-in" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">Categorical Encoding</span>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Column</label>
              <select className="form-select" value={encCol} onChange={e => setEncCol(e.target.value)}>
                <option value="">— Select column —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="form-select" value={encMethod} onChange={e => setEncMethod(e.target.value)}>
                <option value="onehot">One-Hot Encoding</option>
                <option value="label">Label Encoding</option>
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleEncoding} disabled={!encCol || encLoading}>
                {encLoading ? <span className="spinner" /> : '⬡'} Encode
              </button>
            </div>
          </div>
          <div className="divider" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { name: 'One-Hot', desc: 'Creates a binary column per unique value. Expands column count. Good for non-ordinal categories.' },
              { name: 'Label', desc: 'Maps each unique value to an integer 0…N-1. Compact. Good for ordinal or tree-based models.' },
            ].map(({ name, desc }) => (
              <div key={name} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--amber)', fontWeight: 600, marginBottom: '6px' }}>{name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scaling */}
      <div className="card fade-in fade-in-delay-1">
        <div className="card-header">
          <span className="card-title">Feature Scaling</span>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Select Numeric Columns</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {numericColumns.map(col => (
                <button
                  key={col}
                  className={`btn btn-sm ${scaleSelected.includes(col) ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleScale(col)}
                >
                  {col}
                </button>
              ))}
              {numericColumns.length === 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>No numeric columns available.</span>
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Scaler</label>
              <select className="form-select" value={scaleMethod} onChange={e => setScaleMethod(e.target.value)}>
                <option value="minmax">Min-Max Scaler (0–1)</option>
                <option value="standard">Standard Scaler (z-score)</option>
                <option value="robust">Robust Scaler (IQR-based)</option>
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleScaling} disabled={!scaleSelected.length || scaleLoading}>
                {scaleLoading ? <span className="spinner" /> : '▣'} Scale ({scaleSelected.length} cols)
              </button>
            </div>
          </div>
          <div className="divider" style={{ margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              { name: 'Min-Max', desc: 'Rescales to [0, 1]. Best for features with fixed ranges. Sensitive to outliers.' },
              { name: 'Standard', desc: 'Removes mean, scales to unit variance. Good for normal dist. Sensitive to outliers.' },
              { name: 'Robust', desc: 'Uses median and IQR. Ignores outliers. Best for skewed or noisy data.' },
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

