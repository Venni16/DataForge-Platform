import { useEffect, useState } from 'react';
import { DatasetProvider, useDataset } from './context/DatasetContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import UploadTab from './pages/UploadTab.jsx';
import OverviewTab from './pages/OverviewTab.jsx';
import MissingValuesTab from './pages/MissingValuesTab.jsx';
import CleaningTab from './pages/CleaningTab.jsx';
import FeatureEngineeringTab from './pages/FeatureEngineeringTab.jsx';
import VisualizationTab from './pages/VisualizationTab.jsx';
import HistoryTab from './pages/HistoryTab.jsx';
import ExportTab from './pages/ExportTab.jsx';
import DatasetsTab from './pages/DatasetsTab.jsx';

const TAB_META = {
  datasets:  { title: 'My Datasets',          subtitle: 'Browse and switch between all datasets' },
  upload:    { title: 'Upload Dataset',        subtitle: 'Import CSV or Excel files' },
  overview:  { title: 'Dataset Overview',      subtitle: 'Statistics, types, and preview' },
  missing:   { title: 'Missing Values',        subtitle: 'Detect and treat null data' },
  cleaning:  { title: 'Data Cleaning',         subtitle: 'Remove duplicates and outliers' },
  features:  { title: 'Feature Engineering',   subtitle: 'Encoding and scaling' },
  visualize: { title: 'Visualization',         subtitle: 'Charts and correlation analysis' },
  history:   { title: 'Version History',       subtitle: 'Browse operations and rollback' },
  export:    { title: 'Export',                subtitle: 'Download dataset and pipeline script' },
};

function AppContent() {
  const { activeTab } = useDataset();
  const [engineOnline, setEngineOnline] = useState(false);
  const meta = TAB_META[activeTab] || {};

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok ? setEngineOnline(true) : setEngineOnline(false))
      .catch(() => setEngineOnline(false));
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'datasets':  return <DatasetsTab />;
      case 'upload':    return <UploadTab />;
      case 'overview':  return <OverviewTab />;
      case 'missing':   return <MissingValuesTab />;
      case 'cleaning':  return <CleaningTab />;
      case 'features':  return <FeatureEngineeringTab />;
      case 'visualize': return <VisualizationTab />;
      case 'history':   return <HistoryTab />;
      case 'export':    return <ExportTab />;
      default:          return <UploadTab />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar engineOnline={engineOnline} />
      <main className="main-content">
        <header className="content-header">
          <div>
            <div className="content-title">{meta.title}</div>
            {meta.subtitle && <div className="content-subtitle">{meta.subtitle}</div>}
          </div>
        </header>
        <div className="content-body">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DatasetProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </DatasetProvider>
  );
}
