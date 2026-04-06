import { useState, useEffect, useCallback } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getAllDatasets, getDatasetById, deleteDataset, renameDataset } from '../api/datasetApi.js';
import DeleteConfirmModal from '../components/DeleteConfirmModal.jsx';

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DatasetCard({ ds, isCurrent, onSwitch, onDelete, onRename, loading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(ds.name || '');

  const handleRename = () => {
    if (newName.trim() && newName !== ds.name) {
      onRename(ds.id, newName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      style={{
        background: isCurrent ? 'var(--amber-glow)' : 'var(--bg-surface)',
        border: `1px solid ${isCurrent ? 'var(--amber)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Active indicator stripe */}
      {isCurrent && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '3px', background: 'var(--amber)',
        }} />
      )}

      {/* Left: info */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: isCurrent ? '8px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ height: '28px', fontSize: '0.85rem', width: '240px' }}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                onBlur={handleRename}
              />
            </div>
          ) : (
            <>
              <span 
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '280px',
                }}
                onDoubleClick={() => setIsEditing(true)}
                title="Double click to rename"
              >
                {ds.name || 'Unnamed Dataset'}
              </span>
              <button 
                style={{ fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                onClick={() => setIsEditing(true)}
              >✎</button>
            </>
          )}

          {isCurrent && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem', padding: '1px 6px',
              background: 'var(--amber)', color: 'var(--bg-base)', borderRadius: '3px',
              fontWeight: 700, letterSpacing: '0.08em',
            }}>ACTIVE</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'ID', val: ds.id?.slice(0, 8) + '…', color: 'var(--text-muted)' },
            { label: 'Rows', val: (ds.rows ?? '?').toLocaleString?.() ?? ds.rows, color: 'var(--amber)' },
            { label: 'Cols', val: ds.columns ?? '?', color: 'var(--blue)' },
            { label: 'Version', val: `v${ds.current_version ?? 1}`, color: 'var(--cyan)' },
            { label: 'Uploaded', val: timeAgo(ds.created_at), color: 'var(--text-muted)' },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color, fontWeight: 600, marginTop: '1px' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {!isCurrent && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDelete(ds.id)}
            style={{ padding: '6px 10px' }}
            title="Delete dataset"
          >
            🗑
          </button>
        )}
        
        {isCurrent ? (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
            color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245, 158, 11, 0.05)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--amber-glow)',
          }}>
            <span>●</span> Working here
          </div>
        ) : (
          <button
            className="btn btn-secondary"
            onClick={() => onSwitch(ds.id)}
            disabled={loading === ds.id}
            style={{ minWidth: '94px' }}
          >
            {loading === ds.id ? <span className="spinner" /> : '⇄ Switch'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DatasetsTab() {
  const { datasetId, switchDataset, setTab, reset, datasetName } = useDataset();
  const { addToast } = useToast();

  const [datasets, setDatasets] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [switchLoading, setSwitchLoading] = useState(null); // ds id being loaded
  const [search, setSearch] = useState('');
  
  // Custom Deletion Popup State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState(null); // { id, name }

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await getAllDatasets();
      setDatasets(data.datasets || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load datasets', message: err.message });
    } finally {
      setListLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  async function handleSwitch(id) {
    setSwitchLoading(id);
    try {
      const data = await getDatasetById(id);
      switchDataset(data);
      addToast({
        type: 'success',
        title: 'Dataset switched',
        message: `Loaded "${data.name || id.slice(0, 8)}" v${data.version}`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Switch failed', message: err.message });
    } finally {
      setSwitchLoading(null);
    }
  }

  function handleDelete(id) {
    const ds = datasets.find(d => d.id === id);
    setDatasetToDelete({ id, name: ds?.name || 'Unnamed Dataset' });
    setIsDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!datasetToDelete) return;
    const { id } = datasetToDelete;
    
    try {
      await deleteDataset(id);
      setDatasets(prev => prev.filter(d => d.id !== id));
      addToast({ type: 'success', title: 'Deleted', message: 'Dataset permanently removed.' });
      
      if (id === datasetId) {
        reset();
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.message });
    } finally {
      setIsDeleteModalOpen(false);
      setDatasetToDelete(null);
    }
  }

  async function handleRename(id, name) {
    try {
      await renameDataset(id, name);
      setDatasets(prev => prev.map(d => d.id === id ? { ...d, name } : d));
      addToast({ type: 'success', title: 'Renamed', message: 'Dataset updated.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Rename failed', message: err.message });
    }
  }

  const filtered = datasets.filter(ds =>
    !search || (ds.name || '').toLowerCase().includes(search.toLowerCase()) || ds.id?.includes(search)
  );

  return (
    <div className="fade-in">
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <input
            className="form-input"
            placeholder="Search by name or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '360px' }}
          />
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={listLoading}>
          {listLoading ? <span className="spinner" /> : '↻'} Refresh
        </button>
        <button className="btn btn-primary" onClick={() => setTab('upload')}>
          ⬆ Upload New
        </button>
      </div>

      {/* Stats row */}
      <div className="stat-grid fade-in" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card amber">
          <div className="stat-label">Total Datasets</div>
          <div className="stat-value">{datasets.length}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Active Dataset</div>
          <div className="stat-value blue" style={{ fontSize: '0.9rem', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {datasets.find(d => d.id === datasetId)?.name || '—'}
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">Showing</div>
          <div className="stat-value cyan">{filtered.length}</div>
        </div>
      </div>

      {/* Dataset list */}
      {listLoading ? (
        <div className="empty-state" style={{ padding: '48px' }}>
          <span className="spinner lg" />
          <span className="empty-state-desc" style={{ marginTop: '16px' }}>Loading datasets…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px' }}>
          <span className="empty-state-icon">📂</span>
          <span className="empty-state-title">
            {datasets.length === 0 ? 'No datasets yet' : 'No matches found'}
          </span>
          <span className="empty-state-desc">
            {datasets.length === 0
              ? 'Upload your first dataset using the Upload tab.'
              : 'Try a different search term.'}
          </span>
          {datasets.length === 0 && (
            <button className="btn btn-primary" onClick={() => setTab('upload')} style={{ marginTop: '16px' }}>
              ⬆ Upload Dataset
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(ds => (
            <DatasetCard
              key={ds.id}
              ds={ds}
              isCurrent={ds.id === datasetId}
              onSwitch={handleSwitch}
              onDelete={handleDelete}
              onRename={handleRename}
              loading={switchLoading}
            />
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        datasetName={datasetToDelete?.name}
      />
    </div>
  );
}
