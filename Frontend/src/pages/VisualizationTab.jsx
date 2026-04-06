import { useState, useMemo } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponentModule from 'react-plotly.js/factory';
const createPlotlyComponent = createPlotlyComponentModule.default || createPlotlyComponentModule;
const Plot = createPlotlyComponent(Plotly);
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
  const { datasetId, numericColumns, shape } = useDataset();
  const { addToast } = useToast();

  const [chartType, setChartType] = useState('histogram');
  const [column, setColumn] = useState('');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [pairCols, setPairCols] = useState([]);
  const [interactive, setInteractive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);

  const togglePairCol = (c) => {
    setPairCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c].slice(0, 5));
  };

  async function handleGenerate() {
    setLoading(true);
    setChartData(null);
    try {
      const body = { 
        dataset_id: datasetId, 
        chart_type: chartType,
        interactive: interactive && chartType !== 'pairplot'
      };
      
      if (chartType === 'scatter') { body.x_column = xCol; body.y_column = yCol; }
      else if (chartType === 'pairplot') { body.columns = pairCols.length ? pairCols : undefined; }
      else { body.column = column; }

      const result = await visualize(body);
      setChartData(result);
    } catch (err) {
      addToast({ type: 'error', title: 'Chart failed', message: err.message });
    } finally { setLoading(false); }
  }

  // Determine if we show static image or plotly
  const isInteractive = chartData?.interactive;
  const plotData = chartData?.plot_data;
  const staticImage = chartData?.image;

  return (
    <div className="fade-in">
      {/* Chart Configuration */}
      <div className="card fade-in" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Configure Visualization</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: interactive ? 'var(--blue)' : 'var(--text-muted)', fontWeight: 600 }}>INTERACTIVE</span>
            <label className="switch">
              <input type="checkbox" checked={interactive} onChange={e => setInteractive(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {CHART_TYPES.map(ct => (
              <button
                key={ct.id}
                className={`btn btn-sm ${chartType === ct.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setChartType(ct.id); setChartData(null); }}
              >
                {ct.icon} {ct.label}
              </button>
            ))}
          </div>

          <div className="form-row">
            {(chartType === 'histogram' || chartType === 'box') && (
              <div className="form-group">
                <label className="form-label">Column</label>
                <select className="form-select" value={column} onChange={e => setColumn(e.target.value)}>
                  <option value="">— Auto-select first —</option>
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
                {loading ? <span className="spinner" /> : '▣'} Generate {interactive ? 'Interactive' : 'Static'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="chart-container fade-in fade-in-delay-1" style={{ minHeight: '500px', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border-default)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <div className="chart-placeholder">
            <span className="spinner lg" />
            <span className="chart-placeholder-text">Processing your data…</span>
          </div>
        ) : isInteractive && plotData ? (
          <Plot
            data={plotData.data}
            layout={{ 
              ...plotData.layout,
              autosize: true,
              margin: { t: 40, b: 40, l: 60, r: 20 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              modebar: {
                bgcolor: 'rgba(30, 32, 40, 0.8)',
                color: 'rgba(255, 255, 255, 0.6)',
                activecolor: '#ffffff'
              }
            }}
            config={{ responsive: true, displayModeBar: true, displaylogo: false }}
            style={{ width: '100%', height: '500px' }}
          />
        ) : staticImage ? (
          <img src={`data:image/png;base64,${staticImage}`} alt="chart" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <div className="chart-placeholder">
            <span className="chart-placeholder-icon">▦</span>
            <span className="chart-placeholder-text">
              {interactive ? 'Interactive Mode Enabled' : 'Static Mode Enabled'} — Click Generate
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

