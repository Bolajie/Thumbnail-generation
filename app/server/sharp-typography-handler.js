const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs').promises;

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function processSharpTypographyStage({ geminiResults, instructions, guestName, duration }) {
  const results = await Promise.allSettled(
    geminiResults.map(async (geminiResult, index) => {
      if (!geminiResult.success) {
        throw geminiResult.error;
      }

      try {
        const baseBuffer = geminiResult.buffer;
        const instruction = instructions[index];

        // Split name into 2 lines, uppercase, adaptive font size
        const nameParts = (guestName || '').trim().toUpperCase().split(/\s+/).filter(Boolean);
        const splitAt   = Math.ceil(nameParts.length / 2);
        const nameLine1 = escapeXml(nameParts.slice(0, splitAt).join(' '));
        const nameLine2 = escapeXml(nameParts.slice(splitAt).join(' '));
        const isTwoLine = nameLine2.length > 0;
        const longestLine = Math.max(nameLine1.length, isTwoLine ? nameLine2.length : 0);

        // Target ~1050px wide for the longest line (Liberation Sans Bold ≈ 0.60em/char)
        let nameFontSize = Math.floor(1050 / (longestLine * 0.60));
        nameFontSize = Math.min(158, Math.max(72, nameFontSize));

        const lineHeight   = Math.round(nameFontSize * 1.08);
        const line2Y       = isTwoLine ? 638 : 626;
        const line1Y       = isTwoLine ? line2Y - lineHeight : line2Y;
        const episodeY     = Math.min((isTwoLine ? line2Y : line1Y) + 52, 700);
        const safeDuration = escapeXml(duration);

        // Cinematic vignette — dark edges, clear centre
        const vignetteSvg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="vig" cx="50%" cy="50%" r="72%">
      <stop offset="35%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.62"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#vig)"/>
</svg>`;

        // Dark bottom gradient so white text always pops regardless of background
        const textBackingSvg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tbg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <rect x="0" y="370" width="1280" height="350" fill="url(#tbg)"/>
</svg>`;

        // Typography — large white centered name with gold stroke, EPISODE below, duration badge
        const typographySvg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <style>
    .nm  { font-family: "Liberation Sans", Arial, Helvetica, sans-serif; font-weight: 900; font-size: ${nameFontSize}px; fill: #FFFFFF; paint-order: stroke fill; stroke: #C9A84C; stroke-width: 1.5px; }
    .nms { font-family: "Liberation Sans", Arial, Helvetica, sans-serif; font-weight: 900; font-size: ${nameFontSize}px; fill: #000000; opacity: 0.45; }
    .ep  { font-family: "Liberation Sans", Arial, Helvetica, sans-serif; font-weight: 700; font-size: 19px; fill: rgba(255,255,255,0.75); letter-spacing: 8px; }
    .dur { font-family: "Liberation Sans", Arial, Helvetica, sans-serif; font-weight: 700; font-size: 21px; fill: #FFFFFF; }
  </style>

  <!-- Name drop shadow (+3,+4 offset) -->
  <text x="643" y="${line1Y + 4}" class="nms" text-anchor="middle">${nameLine1}</text>
  ${isTwoLine ? `<text x="643" y="${line2Y + 4}" class="nms" text-anchor="middle">${nameLine2}</text>` : ''}

  <!-- Guest name (white with gold stroke, centered, large) -->
  <text x="640" y="${line1Y}" class="nm" text-anchor="middle">${nameLine1}</text>
  ${isTwoLine ? `<text x="640" y="${line2Y}" class="nm" text-anchor="middle">${nameLine2}</text>` : ''}

  <!-- EPISODE label below name -->
  <text x="640" y="${episodeY}" class="ep" text-anchor="middle">E P I S O D E</text>

  <!-- Duration badge — bottom right -->
  <rect x="1132" y="648" width="118" height="34" fill="black" fill-opacity="0.72" rx="4"/>
  <text x="1191" y="671" class="dur" text-anchor="middle">${safeDuration}</text>
</svg>`;

        // Build composite queue — vignette first, then atmosphere particles (screen blend),
        // then text backing gradient, then typography
        const compositeQueue = [
          { input: Buffer.from(vignetteSvg), blend: 'over' },
        ];

        const moodAtmosphere = instruction.moodAtmosphere;
        if (moodAtmosphere && moodAtmosphere !== 'none') {
          const atmPath = path.join(__dirname, `../../brand/assets/atmospherics/${moodAtmosphere}`);
          try {
            const atmBuffer = await fs.readFile(atmPath);
            // film-grain tile is 320×180 — tile it across the full canvas
            const isTile = moodAtmosphere === 'film-grain.png';
            compositeQueue.push({ input: atmBuffer, blend: 'screen', tile: isTile });
          } catch (_) {
            // Asset missing — skip silently so the pipeline never fails on a missing texture
          }
        }

        compositeQueue.push(
          { input: Buffer.from(textBackingSvg), blend: 'over' },
          { input: Buffer.from(typographySvg),  blend: 'over' }
        );

        const finalBuffer = await sharp(baseBuffer)
          .modulate({ saturation: 1.2 })
          .linear(1.05, -5)
          .composite(compositeQueue)
          .jpeg({ quality: 88 })
          .toBuffer();

        return { success: true, buffer: finalBuffer, format: 'jpeg' };
      } catch (err) {
        const stageError = new Error(`STAGE4B_ERROR: Typography layer assembly failed for variation ${index}.`);
        stageError.stage = 'STAGE4B_ERROR';
        stageError.variationIndex = index;
        throw stageError;
      }
    })
  );

  return results.map((r) => {
    if (r.status === 'fulfilled' && r.value.success) {
      return r.value;
    }
    return { success: false, error: r.reason || r.value.error };
  });
}

module.exports = {
  processSharpTypographyStage
};
