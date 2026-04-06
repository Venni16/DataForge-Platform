import { useState } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { visualize } from '../api/datasetApi.js';

const CHART_TYPES = [
  { id: 'histogram', label: 'Histogram', icon: '▬' },
  { id: 'scatter',   label: 'Scatter',   icon: '⁛' },
  { id: 'box',       label: 'Box Plot',  icon: '▭' },
  { id: 'heatmap',   label: 'Heatmap',   icon: '▦' },
  { id: 'pairplot',  label: 'Pairplot',  icon: '⊞' },
];

export default function VisualizationTab() {
  const { datasetId, columns, numericColumns } = useDataset();
  const { addToast } = useToast();

  const [chartType, setChartType] = useState('histogram');
  const [column, setColumn] = useState('');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [pairCols, setPairCols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);

  const togglePairCol = (c) => {
    setPairCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c].slice(0, 5));
  };

  async function handleGenerate() {
    setLoading(true);
    setImage(null);
    try {
      const body = { dataset_id: datasetId, chart_type: chartType };
      if (chartType === 'scatter') { body.x_column = xCol; body.y_column = yCol; }
      else if (chartType === 'pairplot') { body.columns = pairCols.length ? pairCols : undefined; }
      else { body.column = column; }

      const result = await visualize(body);
      setImage(result.image);
    } catch (err) {
      addToast({ type: 'error', title: 'Chart failed', message: err.message });
    } finally { setLoading(false); }
  }

  return (
    <div className="fade-in">
      {/* Chart Type Selector */}
      <div className="card fade-in" style={{ marginBottom: '24px' }}>
        <div className="card-header"><span className="card-title">Configure Chart</span></div>
        <div className="card-body">
          {/* Chart type pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {CHART_TYPES.map(ct => (
              <button
                key={ct.id}
                className={`btn btn-sm ${chartType === ct.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setChartType(ct.id); setImage(null); }}
              >
                {ct.icon} {ct.label}
              </button>
            ))}
          </div>

          {/* Column selectors based on chart type */}
          <div className="form-row">
            {(chartType === 'histogram' || chartType === 'box') && (
              <div className="form-group">
                <label className="form-label">Column</label>
                <select className="form-select" value={column} onChange={e => setColumn(e.target.value)}>
                  <option value="">— Auto-select first numeric —</option>
                  {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            {chartType === 'scatter' && (<>
              <div className="form-group">
                <label className="form-label">X Axis</label>
                <select className="form-select" value={xCol} onChange={e => setXCol(e.target.value)}>
                  <option value="">— Select X —</option>
                  {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Y Axis</label>
                <select className="form-select" value={yCol} onChange={e => setYCol(e.target.value)}>
                  <option value="">— Select Y —</option>
                  {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>)}
            {chartType === 'pairplot' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Columns (max 5) — {pairCols.length} selected</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {numericColumns.map(c => (
                    <button key={c} className={`btn btn-sm ${pairCols.includes(c) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => togglePairCol(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={loading}>
                {loading ? <span className="spinner" /> : '▣'} Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="chart-container fade-in fade-in-delay-1">
        {loading ? (
          <div className="chart-placeholder">
            <span className="spinner lg" />
            <span className="chart-placeholder-text">Rendering chart…</span>
          </div>
        ) : image ? (
          <img src={`data:image/png;base64,${image}`} alt="chart" className="chart-image" />
        ) : (
          <div className="chart-placeholder">
            <span className="chart-placeholder-icon">▦</span>
            <span className="chart-placeholder-text">Select a chart type and click Generate</span>
          </div>
        )}
      </div>
    </div>
  );
}
