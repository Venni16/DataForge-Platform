export default function DataTable({ rows = [], maxRows = 50, className = '' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className={`table-wrapper ${className}`}>
        <div className="empty-state" style={{ padding: '32px' }}>
          <span className="empty-state-icon">⬚</span>
          <span className="empty-state-desc">No data to display.</span>
        </div>
      </div>
    );
  }

  const columns = Object.keys(rows[0]);
  const displayRows = rows.slice(0, maxRows);

  // Detect likely numeric values
  const isNumeric = (val) => val !== '' && val !== null && val !== undefined && !isNaN(Number(val));

  return (
    <div className={`table-wrapper ${className}`}>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            {columns.map((col) => (
              <th key={col} title={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, ri) => (
            <tr key={ri}>
              <td>{ri + 1}</td>
              {columns.map((col) => {
                const val = row[col];
                const isEmpty = val === '' || val === null || val === undefined;
                const numeric = !isEmpty && isNumeric(val);
                return (
                  <td
                    key={col}
                    className={isEmpty ? 'null-cell' : numeric ? 'num-cell' : ''}
                    title={isEmpty ? 'null' : String(val)}
                  >
                    {isEmpty ? 'null' : String(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
