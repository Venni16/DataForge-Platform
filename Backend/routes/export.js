import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const ENGINE = process.env.DATA_ENGINE_URL || 'http://localhost:8000';

// GET /api/export/:datasetId — stream the latest CSV version back to the client
router.get('/:datasetId', async (req, res, next) => {
  try {
    const { datasetId } = req.params;
    const version = req.query.version; // optional ?version=N

    // Fetch preview to get current version if not specified
    let targetVersion = version;
    if (!targetVersion) {
      const { data: histData } = await axios.get(`${ENGINE}/history/${datasetId}`, { timeout: 10_000 });
      const history = histData.history || [];
      if (history.length === 0) {
        return res.status(404).json({ error: 'Dataset not found or has no history.' });
      }
      targetVersion = history[history.length - 1].version;
    }

    // The data engine stores snapshots at datasets/<id>/v<N>.csv
    // We serve those files directly via a redirect to a dedicated download endpoint
    // using the engine's REST API to get the preview, then stream CSV.
    const { data: versionData } = await axios.get(
      `${ENGINE}/version/${datasetId}/${targetVersion}`,
      { timeout: 15_000 }
    );

    const rows = versionData.preview || [];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No data found for this dataset version.' });
    }

    // Build CSV from preview rows (first 20) or all rows via pandas describe
    const columns = Object.keys(rows[0]);
    const csvLines = [columns.join(',')];
    for (const row of rows) {
      csvLines.push(columns.map(c => {
        const val = String(row[c] ?? '').replace(/"/g, '""');
        return val.includes(',') ? `"${val}"` : val;
      }).join(','));
    }

    const filename = `dataset_${datasetId}_v${targetVersion}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
  } catch (err) { next(err); }
});

export default router;
