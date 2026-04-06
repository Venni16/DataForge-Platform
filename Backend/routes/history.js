import express from 'express';
import axios from 'axios';
import { saveDatasetMeta, getDatasetMeta } from '../db/store.js';

const router = express.Router();
const ENGINE = process.env.DATA_ENGINE_URL || 'http://localhost:8000';

// GET /api/history/:dataset_id
router.get('/:datasetId', async (req, res, next) => {
  try {
    const { data } = await axios.get(
      `${ENGINE}/history/${req.params.datasetId}`,
      { timeout: 10_000 }
    );
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/history/:dataset_id/:version  — preview specific version
router.get('/:datasetId/:version', async (req, res, next) => {
  try {
    const { data } = await axios.get(
      `${ENGINE}/version/${req.params.datasetId}/${req.params.version}`,
      { timeout: 10_000 }
    );
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/history/rollback
router.post('/rollback', async (req, res, next) => {
  try {
    const { data } = await axios.post(`${ENGINE}/rollback`, req.body, {
      timeout: 30_000,
    });
    // Update stored current version
    const meta = await getDatasetMeta(req.body.dataset_id);
    if (meta) {
      await saveDatasetMeta({ ...meta, current_version: data.version });
    }
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
