'use strict';

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const OUT_DIR = path.join(__dirname, '../brand/assets/atmospherics');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Seeded-ish determinism so re-runs produce the same assets
// (Math.random is used but the output is committed — run once)

async function generateSparks() {
  // 90 scattered sparks + 40 corner-concentrated sparks
  const scattered = Array.from({ length: 90 }, () => {
    const x       = Math.floor(Math.random() * 1280);
    const y       = Math.floor(Math.random() * 720);
    const r       = 1 + Math.floor(Math.random() * 5);
    const opacity = (0.3 + Math.random() * 0.7).toFixed(2);
    const hue     = Math.floor(Math.random() * 40); // 0–40° = red/orange/amber
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${hue},100%,60%)" opacity="${opacity}"/>`;
  });

  const corners = Array.from({ length: 40 }, (_, i) => {
    const q       = i % 4;
    const x       = q < 2  ? Math.floor(Math.random() * 300) : 980 + Math.floor(Math.random() * 300);
    const y       = q % 2  ? Math.floor(Math.random() * 250) : 470 + Math.floor(Math.random() * 250);
    const r       = 2 + Math.floor(Math.random() * 7);
    const opacity = (0.4 + Math.random() * 0.6).toFixed(2);
    const hue     = Math.floor(Math.random() * 40);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${hue},100%,65%)" opacity="${opacity}"/>`;
  });

  const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
${scattered.join('\n')}
${corners.join('\n')}
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, 'orange-sparks.png'));
  console.log('  ✓ orange-sparks.png');
}

async function generateFlare() {
  const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="white" stop-opacity="0"/>
      <stop offset="25%"  stop-color="white" stop-opacity="0.10"/>
      <stop offset="50%"  stop-color="white" stop-opacity="0.38"/>
      <stop offset="75%"  stop-color="white" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="streak2" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#C9A84C" stop-opacity="0"/>
      <stop offset="30%"  stop-color="#C9A84C" stop-opacity="0.08"/>
      <stop offset="50%"  stop-color="#C9A84C" stop-opacity="0.18"/>
      <stop offset="70%"  stop-color="#C9A84C" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#C9A84C" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="28%" cy="50%" r="22%">
      <stop offset="0%"   stop-color="#C9A84C" stop-opacity="0.60"/>
      <stop offset="60%"  stop-color="#C9A84C" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#C9A84C" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hotspot" cx="28%" cy="50%" r="5%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Primary white anamorphic streak -->
  <rect x="0" y="337" width="1280" height="7"  fill="url(#streak)"/>
  <rect x="0" y="347" width="1280" height="3"  fill="url(#streak)" opacity="0.55"/>
  <rect x="0" y="329" width="1280" height="2"  fill="url(#streak)" opacity="0.30"/>
  <!-- Gold secondary streak -->
  <rect x="0" y="344" width="1280" height="12" fill="url(#streak2)"/>
  <!-- Ambient glow at source -->
  <ellipse cx="358" cy="360" rx="220" ry="90" fill="url(#glow)"/>
  <!-- Hot-spot centre -->
  <ellipse cx="358" cy="360" rx="40"  ry="20" fill="url(#hotspot)"/>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, 'anamorphic-flare.png'));
  console.log('  ✓ anamorphic-flare.png');
}

async function generateGrain() {
  // 320×180 tiled grain tile — composited with tile:true so it repeats across 1280×720.
  // Small buffer + PNG compression on a repeating tile stays under 20KB.
  const W = 320, H = 180;
  const buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < buf.length; i += 4) {
    const v     = Math.floor(Math.random() * 255);
    buf[i]      = v;
    buf[i + 1]  = v;
    buf[i + 2]  = v;
    buf[i + 3]  = Math.random() < 0.55 ? 0 : Math.floor(Math.random() * 28);
  }
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(path.join(OUT_DIR, 'film-grain.png'));
  console.log('  ✓ film-grain.png (tiled 320×180)');
}

(async () => {
  console.log('Generating atmospheric assets → brand/assets/atmospherics/');
  await Promise.all([generateSparks(), generateFlare(), generateGrain()]);
  console.log('Done.');
})();
