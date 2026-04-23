const sharp = require('sharp');

/**
 * Stage 4b: Sharp Typography Layer
 * Adds SVG typography on top of the base image.
 */
async function processSharpTypographyStage({ geminiResults, instructions, guestName, duration }) {
  const results = await Promise.allSettled(
    geminiResults.map(async (geminiResult, index) => {
      if (!geminiResult.success) {
        // Pass through previous Stage 4a error
        throw geminiResult.error;
      }
      
      try {
        const baseBuffer = geminiResult.buffer;
        const { textStyle } = instructions[index];
        const fontSize = textStyle?.fontSize || 80;
        const color = textStyle?.colour || '#C9A84C'; // Primary Gold
        
        const width = 1280;
        const height = 720;
        
        // Use SVG for typography to leverage font-family rules natively
        const svgText = `
          <svg width="${width}" height="${height}">
            <style>
              .name { font-family: 'Montserrat'; font-weight: bold; font-size: ${fontSize}px; fill: ${color}; }
              .episode { font-family: 'Montserrat'; font-weight: bold; font-size: ${Math.max(24, fontSize * 0.4)}px; fill: #FFFFFF; text-transform: uppercase; letter-spacing: 2px; }
              .duration { font-family: 'Montserrat'; font-weight: 600; font-size: 24px; fill: #FFFFFF; }
              .duration-bg { fill: #000000; fill-opacity: 0.7; rx: 4px; }
            </style>
            
            <!-- Guest Name & Episode Label -->
            <text x="100" y="580" class="episode">EPISODE</text>
            <text x="100" y="${580 + fontSize}" class="name">${guestName || ''}</text>
            
            <!-- Duration Badge -->
            <rect x="1130" y="650" width="120" height="40" class="duration-bg" />
            <text x="1190" y="677" class="duration" text-anchor="middle">${duration || ''}</text>
          </svg>
        `;

        const finalBuffer = await sharp(baseBuffer)
          .composite([{ input: Buffer.from(svgText), blend: 'over' }])
          .png()
          .toBuffer();

        return { success: true, buffer: finalBuffer };
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
