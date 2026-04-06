import client from './client.js';

// ── Upload ─────────────────────────────────────────────────────────────────────
export async function uploadDataset(file) {
  const form = new FormData();
  form.append('file', file);
  return client.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ── Processing ─────────────────────────────────────────────────────────────────
export const processMissing      = (body) => client.post('/process/missing',       body);
export const processMissingBatch = (body) => client.post('/process/missing/batch', body);
export const processDuplicates   = (body) => client.post('/process/duplicates',    body);
export const processDropColumn   = (body) => client.post('/process/drop_column',   body);
export const processOutliers  = (body) => client.post('/process/outliers',   body);
export const processEncoding  = (body) => client.post('/process/encoding',   body);
export const processScaling   = (body) => client.post('/process/scaling',    body);

// ── Visualization ──────────────────────────────────────────────────────────────
export const visualize = (params) => client.post('/visualize', params);

// ── History ────────────────────────────────────────────────────────────────────
export const getHistory       = (id)       => client.get(`/history/${id}`);
export const getVersionPreview= (id, ver)  => client.get(`/history/${id}/${ver}`);
export const rollback         = (body)     => client.post('/history/rollback', body);

// ── Dataset Library ────────────────────────────────────────────────────────────
export const getAllDatasets  = ()   => client.get('/datasets');
export const getDatasetById  = (id) => client.get(`/datasets/${id}`);
export const deleteDataset   = (id) => client.delete(`/datasets/${id}`);
export const renameDataset   = (id, name) => client.patch(`/datasets/${id}`, { name });

// ── Export ─────────────────────────────────────────────────────────────────────
export function getExportUrl(datasetId) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return `${base}/export/${datasetId}`;
}
