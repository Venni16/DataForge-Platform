import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { saveDatasetMeta } from '../db/store.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(csv|xlsx|xls)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Only CSV and Excel files are supported.'));
  },
});

const ENGINE = process.env.DATA_ENGINE_URL || 'http://localhost:8000';

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const datasetId = uuid();

    // Forward file to the data engine
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    form.append('dataset_id', datasetId);

    const { data } = await axios.post(`${ENGINE}/upload`, form, {
      headers: form.getHeaders(),
      timeout: 60_000,
    });

    // Persist metadata
    await saveDatasetMeta({
      id: datasetId,
      name: req.file.originalname,
      current_version: 1,
      rows: data.shape?.rows,
      columns: data.shape?.columns,
      created_at: new Date().toISOString(),
    });

    res.json({ ...data, dataset_id: datasetId });
  } catch (err) {
    next(err);
  }
});

export default router;
