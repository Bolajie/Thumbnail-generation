'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const path    = require('path');
const express = require('express');
const cors    = require('cors');
const { handleGenerateRequest } = require('./api-handler');

const app  = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : null
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  }
}));
app.use(express.json({ limit: '50mb' }));

app.post('/api/generate', handleGenerateRequest);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve built React frontend — production full-stack mode
const fs = require('fs');
const clientDist = path.join(__dirname, '../../app/client/dist');
const indexHtml  = path.join(clientDist, 'index.html');

console.log(`[ISTV] Static dir: ${clientDist}`);
console.log(`[ISTV] dist exists: ${fs.existsSync(clientDist)}`);
console.log(`[ISTV] index.html exists: ${fs.existsSync(indexHtml)}`);

app.use(express.static(clientDist));
app.get('*', (_req, res, next) => {
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(503).send('<h1>Frontend not built</h1><p>Run: npm run build</p>');
  }
});

app.listen(PORT, () => {
  const keysOk = process.env.ANTHROPIC_API_KEY && process.env.PEXELS_API_KEY &&
    !process.env.ANTHROPIC_API_KEY.includes('your_') &&
    !process.env.PEXELS_API_KEY.includes('your_');
  console.log(`\n[ISTV] Server running → http://localhost:${PORT}`);
  console.log(`[ISTV] API keys:  ${keysOk ? '✓ loaded' : '⚠ NOT SET — fill in .env before generating'}\n`);
});
