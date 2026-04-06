import express from 'express';
import axios from 'axios';

const router = express.Router();
const ENGINE = process.env.DATA_ENGINE_URL || 'http://localhost:8000';

// POST /api/visualize
router.post('/', async (req, res, next) => {
  try {
    const { data } = await axios.post(`${ENGINE}/visualize`, req.body, {
      timeout: 60_000,
    });
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
