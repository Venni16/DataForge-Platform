import express from 'express';
import axios from 'axios';

const router = express.Router();
const MODEL_ENGINE_URL = process.env.MODEL_ENGINE_URL || 'http://localhost:8001/model';

// Proxy all requests to the Model Engine
router.all('/*', async (req, res, next) => {
  try {
    const targetUrl = `${MODEL_ENGINE_URL}${req.path}`;
    
    // Convert GET query params
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
    });
    
    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      next(err);
    }
  }
});

export default router;
