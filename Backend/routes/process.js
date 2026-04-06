import express from 'express';
import axios from 'axios';
import { saveDatasetMeta, getDatasetMeta } from '../db/store.js';

const router = express.Router();
const ENGINE = process.env.DATA_ENGINE_URL || 'http://localhost:8000';

async function forwardToEngine(endpoint, body) {
  const { data } = await axios.post(`${ENGINE}${endpoint}`, body, {
    timeout: 60_000,
  });
  return data;
}

async function updateVersion(datasetId, version) {
  const meta = await getDatasetMeta(datasetId);
  if (meta) {
    await saveDatasetMeta({ ...meta, current_version: version });
  }
}

// ── Missing Values ─────────────────────────────────────────────────────────────
router.post('/missing', async (req, res, next) => {
  try {
    const result = await forwardToEngine('/process/missing', req.body);
    await updateVersion(req.body.dataset_id, result.version);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/missing/batch', async (req, res, next) => {
  try {
    const result = await forwardToEngine('/process/missing/batch', req.body);
    await updateVersion(req.body.dataset_id, result.version);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Duplicate Removal ──────────────────────────────────────────────────────────
router.post('/duplicates', async (req, res, next) => {
  try {
    const result = await forwardToEngine('/process/duplicates', req.body);
    await updateVersion(req.body.dataset_id, result.version);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Drop Column ────────────────────────────────────────────────────────────────
router.post('/drop_column', async (req, res, next) => {
  try {
    const result = await forwardToEngine('/process/drop_column', req.body);
    await updateVersion(req.body.dataset_id, result.version);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Outliers ───────────────────────────────────────────────────────────────────
router.post('/outliers', async (req, res, next) => {
  try {
    const result = await forwardToEngine('/process/outliers', req.body);
    await updateVersion(req.body.dataset_id, result.version);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Encoding ───────────────────────────────────────────────────────────────────
router.post('/encoding', async (req, res, next) => {
  try {
    const result = await forwardToEngine('/process/encoding', req.body);
    await updateVersion(req.body.dataset_id, result.version);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Scaling ────────────────────────────────────────────────────────────────────
router.post('/scaling', async (req, res, next) => {
  try {
    const result = await forwardToEngine('/process/scaling', req.body);
    await updateVersion(req.body.dataset_id, result.version);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
