import { useState, useRef } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { uploadDataset } from '../api/datasetApi.js';
import DataTable from '../components/DataTable.jsx';

export default function UploadTab() {
  const { setDataset, setTab } = useDataset();
  const { addToast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    const allowed = /\.(csv|xlsx|xls)$/i;
    if (!allowed.test(file.name)) {
      addToast({ type: 'error', title: 'Invalid file', message: 'Only CSV and Excel files are accepted.' });
      return;
    }
    setUploading(true);
    setProgress(30);
    try {
      const data = await uploadDataset(file);
      setProgress(100);
      setDataset({
        datasetId: data.dataset_id,
        currentVersion: data.version || 1,
        columns: data.columns || [],
        dtypes: data.dtypes || {},
        missing: data.missing || {},
        missingPct: data.missing_pct || {},
        numericColumns: data.numeric_columns || [],
        categoricalColumns: data.categorical_columns || [],
        shape: data.shape || { rows: 0, columns: 0 },
        preview: data.preview || [],
        describe: data.describe || {},
      });
      addToast({ type: 'success', title: 'Dataset loaded', message: `${data.shape?.rows} rows × ${data.shape?.columns} columns` });
      setTimeout(() => setTab('overview'), 600);
    } catch (err) {
      setProgress(0);
      addToast({ type: 'error', title: 'Upload failed', message: err.message });
    } finally {
      setUploading(false);
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="fade-in">
      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{ marginBottom: '32px' }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div className="upload-icon">📊</div>
        <div className="upload-title">{uploading ? 'Processing dataset…' : 'Drop your dataset here'}</div>
        <div className="upload-subtitle">or click to browse files</div>
        <div className="upload-formats">
          <span className="format-chip">CSV</span>
          <span className="format-chip">XLSX</span>
          <span className="format-chip">XLS</span>
        </div>
        {uploading && (
          <div className="progress-bar-wrap" style={{ marginTop: '24px', width: '60%', margin: '24px auto 0' }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Format Guide */}
      <div className="card fade-in fade-in-delay-1">
        <div className="card-header">
          <span className="card-title">Supported Formats</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { fmt: 'CSV', desc: 'Comma-separated values. UTF-8 or ASCII encoding.' },
              { fmt: 'XLSX', desc: 'Excel 2007+ format. First sheet is loaded.' },
              { fmt: 'XLS', desc: 'Legacy Excel format. First sheet is loaded.' },
            ].map(({ fmt, desc }) => (
              <div key={fmt} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 600, marginBottom: '6px' }}>{fmt}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
