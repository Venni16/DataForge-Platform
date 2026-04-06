import express from 'express';
import axios from 'axios';
import { getAllDatasets, getDatasetMeta, deleteDataset, updateDataset } from '../db/store.js';

const router = express.Router();
const ENGINE = process.env.DATA_ENGINE_URL || 'http://localhost:8000';

// GET /api/datasets — list all datasets (most recent first)
router.get('/', async (req, res, next) => {
  try {
    const datasets = await getAllDatasets();
    res.json({ datasets });
  } catch (err) { next(err); }
});

// GET /api/datasets/:id — get dataset + latest version preview from data-engine
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get operation history to find the latest version
    const { data: histData } = await axios.get(`${ENGINE}/history/${id}`, { timeout: 10_000 });
    const history = histData.history || [];

    if (history.length === 0) {
      return res.status(404).json({ error: 'Dataset has no history. It may have been deleted.' });
    }

    const latestVersion = history[history.length - 1].version;

    // Get latest version data preview
    const { data: versionData } = await axios.get(
      `${ENGINE}/version/${id}/${latestVersion}`,
      { timeout: 15_000 }
    );

    // Also fetch metadata from store  
    const meta = await getDatasetMeta(id);

    res.json({
      dataset_id: id,
      name: meta?.name || 'Unknown',
      version: latestVersion,
      created_at: meta?.created_at,
      ...versionData,
    });
  } catch (err) { next(err); }
});

// PATCH /api/datasets/:id — rename or update metadata
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await updateDataset(id, { name });
    res.json({ success: true, name });
  } catch (err) { next(err); }
});

// DELETE /api/datasets/:id — full deletion
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Delete from storage (Supabase/Local JSON)
    await deleteDataset(id);

    // 2. Notify data-engine to wipe physical CSV files
    try {
      await axios.delete(`${ENGINE}/rollback/${id}/wipe`, { timeout: 5000 });
    } catch (e) {
      console.warn(`[Cleanup] Failed to wipe engine files for ${id}:`, e.message);
    }

    res.json({ success: true, dataset_id: id });
  } catch (err) { next(err); }
});

export default router;
