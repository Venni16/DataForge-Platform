import client from './client.js';

export const trainModel = (params) => client.post('/model/train', params);
export const listModels = (datasetId) => client.get(`/model/list?dataset_id=${datasetId}`);
export const getModel = (datasetId, modelId) => client.get(`/model/${modelId}?dataset_id=${datasetId}`);
export const deleteModel = (datasetId, modelId) => client.delete(`/model/${modelId}?dataset_id=${datasetId}`);
export const evaluateModel = (params) => client.post('/model/evaluate', params);
export const predict = (params) => client.post('/model/predict', params);
