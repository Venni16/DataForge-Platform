import { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { trainModel, listModels, deleteModel, evaluateModel, predict } from '../api/modelApi.js';

export default function ModelTab() {
  const { datasetId, columns, numericColumns } = useDataset();
  const { addToast } = useToast();

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('train'); // train, evaluate, predict

  // Training form state
  const [taskType, setTaskType] = useState('classification');
  const [targetColumn, setTargetColumn] = useState('');
  const [algorithm, setAlgorithm] = useState('random forest');
  const [testSize, setTestSize] = useState(0.2);

  // Evaluation & Prediction state
  const [selectedModel, setSelectedModel] = useState(null);
  const [evalPlots, setEvalPlots] = useState(null);
  const [formInput, setFormInput] = useState({});
  const [predictResult, setPredictResult] = useState(null);

  useEffect(() => {
    if (selectedModel?.feature_columns) {
      const initial = {};
      selectedModel.feature_columns.forEach(c => initial[c] = '');
      setFormInput(initial);
    }
  }, [selectedModel]);

  const algorithms = {
    classification: ['Logistic Regression', 'Decision Tree', 'Random Forest', 'KNN', 'SVM', 'Naive Bayes'],
    regression: ['Linear Regression', 'Decision Tree Regressor', 'Random Forest Regressor', 'SVR']
  };

  useEffect(() => {
    if (datasetId) loadModels();
  }, [datasetId]);

  async function loadModels() {
    try {
      const res = await listModels(datasetId);
      setModels(res.models || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Fetch failed', message: err.message });
    }
  }

  async function handleTrain() {
    if (!targetColumn) {
      addToast({ type: 'warning', title: 'Target required', message: 'Please select a target column' });
      return;
    }
    setLoading(true);
    try {
      const body = {
        dataset_id: datasetId,
        target_column: targetColumn,
        task_type: taskType,
        algorithm,
        test_size: Number(testSize)
      };
      await trainModel(body);
      addToast({ type: 'success', title: 'Training Complete', message: 'Model trained successfully' });
      loadModels();
      setActiveTab('evaluate');
    } catch (err) {
      addToast({ type: 'error', title: 'Training failed', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(modelId) {
    try {
      await deleteModel(datasetId, modelId);
      addToast({ type: 'success', title: 'Deleted', message: 'Model deleted' });
      if (selectedModel?.model_id === modelId) setSelectedModel(null);
      loadModels();
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  }

  async function handleEvaluate(model) {
    setSelectedModel(model);
    setEvalPlots(null);
    setPredictResult(null);
    setActiveTab('evaluate');
    try {
      const res = await evaluateModel({ dataset_id: datasetId, model_id: model.model_id });
      setEvalPlots(res.plots);
    } catch (err) {
      addToast({ type: 'error', title: 'Evaluation failed', message: err.message });
    }
  }

  async function handlePredict() {
    if (!selectedModel) return;
    try {
      // Auto-cast numeric-looking string values to actual numbers for the backend
      const castedData = {};
      Object.keys(formInput).forEach(k => {
        const val = formInput[k];
        castedData[k] = !isNaN(val) && val !== '' ? Number(val) : val;
      });

      const res = await predict({ dataset_id: datasetId, model_id: selectedModel.model_id, data: [castedData] });
      setPredictResult(res.predictions);
    } catch (err) {
      addToast({ type: 'error', title: 'Prediction failed', message: 'API error or invalid data types.' });
    }
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '20px' }}>
        
        {/* Left Sidebar - Model List & Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card">
            <div className="card-header">
              <span className="card-title">Train New Model</span>
            </div>
            <div className="card-body">
              <div className="form-group mb-3">
                <label className="form-label">Task Type</label>
                <select className="form-select" value={taskType} onChange={e => { setTaskType(e.target.value); setAlgorithm(algorithms[e.target.value][0]); }}>
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                </select>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Algorithm</label>
                <select className="form-select" value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
                  {algorithms[taskType].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Target Column</label>
                <select className="form-select" value={targetColumn} onChange={e => setTargetColumn(e.target.value)}>
                  <option value="">— Select Target —</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Test Size (0 to 1)</label>
                <input type="number" step="0.05" min="0.05" max="0.5" className="form-input" value={testSize} onChange={e => setTestSize(e.target.value)} />
              </div>

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleTrain} disabled={loading}>
                {loading ? <span className="spinner" /> : '⚡'} Train Model
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Trained Models</span>
            </div>
            <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {models.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>No models found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {models.map(m => (
                    <div key={m.model_id} style={{ padding: '12px', background: 'var(--bg-lighter)', borderRadius: '8px', border: selectedModel?.model_id === m.model_id ? '1px solid var(--blue)' : '1px solid var(--border-default)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{m.algorithm}</strong>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(m.model_id)}>🗑</button>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <div>Target: {m.target_column} ({m.task_type})</div>
                        {m.task_type === 'classification' ? (
                          <div style={{ color: 'var(--green)' }}>Acc: {(m.metrics.accuracy * 100).toFixed(1)}%</div>
                        ) : (
                          <div style={{ color: 'var(--green)' }}>R²: {(m.metrics.r2_score).toFixed(3)}</div>
                        )}
                      </div>
                      <button className="btn btn-sm btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={() => handleEvaluate(m)}>
                        📊 Evaluate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Evaluation & Prediction */}
        <div className="card" style={{ minHeight: '600px' }}>
          <div className="card-header" style={{ display: 'flex', gap: '10px' }}>
            <button className={`btn ${activeTab === 'evaluate' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('evaluate')} disabled={!selectedModel}>Evaluation</button>
            <button className={`btn ${activeTab === 'predict' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('predict')} disabled={!selectedModel}>Prediction Test</button>
          </div>
          
          <div className="card-body">
            {!selectedModel ? (
              <div className="chart-placeholder">
                <span className="chart-placeholder-icon">🧠</span>
                <span className="chart-placeholder-text">Select or Train a model to begin</span>
              </div>
            ) : activeTab === 'evaluate' ? (
              <div className="fade-in">
                <h3 style={{ marginBottom: '20px' }}>Model Metrics: {selectedModel.algorithm}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                  {Object.entries(selectedModel.metrics).map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--bg-lighter)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px' }}>{k.replace('_', ' ')}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--blue)' }}>{typeof v === 'number' ? v.toFixed(4) : v}</div>
                    </div>
                  ))}
                </div>

                {evalPlots ? (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <img src={`data:image/png;base64,${evalPlots.confusion_matrix || evalPlots.residual_plot}`} alt="Evaluation Plot" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <span className="spinner" /> Loading plots...
                  </div>
                )}
              </div>
            ) : (
              <div className="fade-in">
                <h3 style={{ marginBottom: '20px' }}>Test Prediction</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Fill in the feature values below to test a live prediction.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                  {selectedModel.feature_columns?.map(col => (
                    <div key={col} className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>{col}</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder={numericColumns.includes(col) ? '0.0' : 'Text value'}
                        value={formInput[col] !== undefined ? formInput[col] : ''} 
                        onChange={e => setFormInput({...formInput, [col]: e.target.value})}
                      />
                    </div>
                  ))}
                </div>
                
                <button className="btn btn-primary" onClick={handlePredict}>🏃‍♂️ Run Prediction</button>

                {predictResult && predictResult.length > 0 && (
                  <div className="fade-in" style={{ marginTop: '24px', background: 'var(--bg-lighter)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-default)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                      Live Prediction Result
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>
                        {predictResult[0]?.prediction !== undefined ? String(predictResult[0].prediction) : JSON.stringify(predictResult[0])}
                      </div>
                      {predictResult[0]?.probability !== undefined && (
                        <div style={{ fontSize: '1rem', color: 'var(--green)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }}></span>
                          {(predictResult[0].probability * 100).toFixed(1)}% Artificial Confidence
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
