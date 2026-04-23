'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors    = require('cors');
const { handleGenerateRequest } = require('./api-handler');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));

app.post('/api/generate', handleGenerateRequest);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  const keysOk = process.env.ANTHROPIC_API_KEY && process.env.PEXELS_API_KEY &&
    !process.env.ANTHROPIC_API_KEY.includes('your_') &&
    !process.env.PEXELS_API_KEY.includes('your_');
  console.log(`\n[ISTV] Server running → http://localhost:${PORT}`);
  console.log(`[ISTV] API keys:  ${keysOk ? '✓ loaded' : '⚠ NOT SET — fill in .env before generating'}\n`);
});
