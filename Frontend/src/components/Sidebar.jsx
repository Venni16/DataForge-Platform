import { useDataset } from '../context/DatasetContext.jsx';

const NAV = [
  { id: 'datasets',  icon: '▤', label: 'My Datasets',         section: 'LIBRARY' },
  { id: 'upload',    icon: '⬆', label: 'Upload',              section: 'DATA'    },
  { id: 'overview',  icon: '◉', label: 'Overview',            section: null      },
  { id: 'missing',   icon: '⬚', label: 'Missing Values',      section: 'CLEAN'   },
  { id: 'cleaning',  icon: '✦', label: 'Cleaning',            section: null      },
  { id: 'features',  icon: '⬡', label: 'Feature Engineering', section: null      },
  { id: 'visualize', icon: '▣', label: 'Visualization',       section: 'EXPLORE' },
  { id: 'history',   icon: '⌀', label: 'History',             section: null      },
  { id: 'export',    icon: '⬇', label: 'Export',              section: 'OUTPUT'  },
];

const REQUIRES_DATASET = ['overview','missing','cleaning','features','visualize','history','export'];

export default function Sidebar({ engineOnline }) {
  const { activeTab, setTab, datasetId, datasetName, shape, currentVersion } = useDataset();
  const shortId = datasetId ? datasetId.slice(0, 8) + '…' : null;
  const displayName = datasetName || shortId;

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <img src="/logo.png" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
        <div>
          <div className="sidebar-brand-name">Data<span>Forge</span></div>
          <div className="sidebar-brand-sub">DataPrep Pro v1.0</div>
        </div>
      </div>

      {/* Active Dataset Info */}
      {datasetId ? (
        <div className="sidebar-dataset-info">
          <div className="dataset-id-label">Active Dataset</div>
          <div className="dataset-id-value" title={datasetId}>{displayName}</div>
          <div className="dataset-meta-row">
            <div className="dataset-meta-chip"><span>{shape.rows?.toLocaleString()}</span> rows</div>
            <div className="dataset-meta-chip"><span>{shape.columns}</span> cols</div>
            <div className="dataset-meta-chip">v<span>{currentVersion}</span></div>
          </div>
        </div>
      ) : null}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const needsDs = REQUIRES_DATASET.includes(item.id);
          const disabled = needsDs && !datasetId;
          return (
            <div key={item.id}>
              {item.section && (
                <div className="nav-section-label">{item.section}</div>
              )}
              <div
                className={`nav-item ${activeTab === item.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setTab(item.id)}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => e.key === 'Enter' && !disabled && setTab(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="engine-status">
          <span className={`status-dot ${engineOnline ? 'online' : 'offline'}`} />
          <span>{engineOnline ? 'Engine online' : 'Engine offline'}</span>
        </div>
      </div>
    </aside>
  );
}
