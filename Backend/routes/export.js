import express from 'express';
import axios from 'axios';

const router = express.Router();
const ENGINE = process.env.DATA_ENGINE_URL || 'http://localhost:8000';

// GET /api/export/:datasetId — stream the full CSV file back from the data engine
router.get('/:datasetId', async (req, res, next) => {
  try {
    const { datasetId } = req.params;
    const version = req.query.version; // optional ?version=N

    // 1. Determine target version if not specified
    let targetVersion = version;
    if (!targetVersion) {
      const { data: histData } = await axios.get(`${ENGINE}/history/${datasetId}`, { timeout: 10_000 });
      const history = histData.history || [];
      if (history.length === 0) {
        return res.status(404).json({ error: 'Dataset not found or has no history.' });
      }
      targetVersion = history[history.length - 1].version;
    }

    // 2. Stream the file from the data engine
    const downloadUrl = `${ENGINE}/version/${datasetId}/${targetVersion}/download`;
    console.log(`[Export] Requesting stream from: ${downloadUrl}`);
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 30_000,
    });

    // 3. Set headers and pipe the stream directly to the client
    const filename = `dataset_${datasetId.slice(0, 8)}_v${targetVersion}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    response.data.pipe(res);
    
    // Ensure we handle stream errors
    response.data.on('error', (streamErr) => {
      console.error('[Export] Stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream dataset.' });
      }
    });

  } catch (err) {
    console.error('[Export] Error during CSV export:', err.message);
    if (err.response && err.response.data) {
      // Stream error data from engine back to client if possible
      res.status(err.response.status).json({ 
        error: `Data Engine reported: ${err.response.status}`,
        detail: err.message
      });
    } else {
      next(err);
    }
  }
});

export default router;
