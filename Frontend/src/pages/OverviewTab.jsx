import { useDataset } from '../context/DatasetContext.jsx';
import DataTable from '../components/DataTable.jsx';

function typeBadge(dtype) {
  if (!dtype) return null;
  const isNum = dtype.includes('int') || dtype.includes('float');
  const isBool = dtype.includes('bool');
  const cls = isNum ? 'numeric' : isBool ? 'bool' : 'object';
  return <span className={`type-badge ${cls}`}>{dtype}</span>;
}

export default function OverviewTab() {
  const { shape, columns, dtypes, missing, missingPct, describe, preview } = useDataset();

  const totalMissing = Object.values(missing).reduce((a, b) => a + b, 0);
  const numericCols = columns.filter(c => {
    const d = dtypes[c] || '';
    return d.includes('int') || d.includes('float');
  });

  return (
    <div className="fade-in">
      {/* Stats row */}
      <div className="stat-grid fade-in">
        <div className="stat-card amber">
          <div className="stat-label">Total Rows</div>
          <div className="stat-value">{shape.rows.toLocaleString()}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Columns</div>
          <div className="stat-value blue">{shape.columns}</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">Numeric Cols</div>
          <div className="stat-value cyan">{numericCols.length}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Missing Cells</div>
          <div className="stat-value" style={{ color: totalMissing ? 'var(--red)' : 'var(--cyan)' }}>{totalMissing.toLocaleString()}</div>
        </div>
      </div>

      {/* Column Info */}
      <div className="card fade-in fade-in-delay-1" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">Column Summary</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{columns.length} columns</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Column</th>
                <th>Type</th>
                <th>Missing</th>
                <th>Missing %</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col, i) => (
                <tr key={col}>
                  <td>{i + 1}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{col}</td>
                  <td>{typeBadge(dtypes[col])}</td>
                  <td className={missing[col] > 0 ? 'null-cell' : ''}>{missing[col] ?? 0}</td>
                  <td style={{ color: missingPct[col] > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>
                    {(missingPct[col] ?? 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Descriptive Stats */}
      {describe && Object.keys(describe).length > 0 && (
        <div className="card fade-in fade-in-delay-2" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <span className="card-title">Descriptive Statistics</span>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stat</th>
                  {Object.keys(describe).map(col => <th key={col}>{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {['count','mean','std','min','25%','50%','75%','max'].map(stat => (
                  <tr key={stat}>
                    <td style={{ color: 'var(--amber)', fontWeight: 600 }}>{stat}</td>
                    {Object.keys(describe).map(col => (
                      <td key={col} className="num-cell">
                        {describe[col][stat] !== undefined && describe[col][stat] !== ''
                          ? (typeof describe[col][stat] === 'number'
                              ? describe[col][stat].toFixed(4)
                              : describe[col][stat])
                          : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Preview */}
      <div className="card fade-in fade-in-delay-3">
        <div className="card-header">
          <span className="card-title">Data Preview</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>First 10 rows</span>
        </div>
        <div style={{ padding: 0 }}>
          <DataTable rows={preview} />
        </div>
      </div>
    </div>
  );
}
