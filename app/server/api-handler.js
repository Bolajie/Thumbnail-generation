const { processBackgroundRemoval } = require('./background-removal-handler');
const { processClaudeStage } = require('./claude-handler');
const { processPexelsStage } = require('./pexels-handler');
const { processGeminiCompositorStage } = require('./gemini-compositor-handler');
const { processSharpTypographyStage } = require('./sharp-typography-handler');

const t = () => `[${new Date().toISOString()}]`;

async function runPipeline({ photo, transparentPng: clientTransparentPng, guestName, industry, show, style, duration }) {
  if (!photo && !clientTransparentPng) {
    throw Object.assign(new Error('Missing guest photo.'), { stage: 'STAGE0' });
  }

  // STAGE 1
  let transparentPng;
  if (clientTransparentPng) {
    console.log(`${t()} Stage 1: using client-side transparent PNG`);
    const base64Data = clientTransparentPng.replace(/^data:image\/\w+;base64,/, '');
    transparentPng = Buffer.from(base64Data, 'base64');
  } else {
    console.log(`${t()} Stage 1: running server-side background removal`);
    try {
      const result = await processBackgroundRemoval({ photo });
      transparentPng = result.transparentPng;
      console.log(`${t()} Stage 1: done — ${transparentPng.length} bytes`);
    } catch (err) {
      console.error(`${t()} Stage 1 FAILED:`, err.message);
      throw Object.assign(new Error('Background removal failed.'), { stage: 'STAGE1' });
    }
  }

  // STAGE 2
  console.log(`${t()} Stage 2: calling Claude (${show}, ${style})`);
  let instructions;
  try {
    instructions = await processClaudeStage({ guestName, industry, show, style, duration });
    console.log(`${t()} Stage 2: done — ${instructions.length} variations`);
  } catch (err) {
    console.error(`${t()} Stage 2 FAILED:`, err.message);
    throw Object.assign(new Error('Translation layer failed to build variations.'), { stage: 'STAGE2' });
  }

  // STAGE 3
  console.log(`${t()} Stage 3: fetching backgrounds`);
  let pexelsResults;
  try {
    pexelsResults = await processPexelsStage(instructions.map(i => i.pexelsQuery));
    console.log(`${t()} Stage 3: done — ${pexelsResults.map(r => r.buffer.length + 'b').join(', ')}`);
  } catch (err) {
    console.error(`${t()} Stage 3 FAILED:`, err.message);
    throw Object.assign(new Error('Failed to fetch background assets.'), { stage: 'STAGE3' });
  }

  // STAGE 4a
  console.log(`${t()} Stage 4a: calling Gemini (5 parallel)`);
  let geminiResults;
  try {
    geminiResults = await processGeminiCompositorStage({
      variations: instructions, backgrounds: pexelsResults,
      transparentGuestPng: transparentPng, show, style
    });
    console.log(`${t()} Stage 4a: done — ${geminiResults.filter(r => r.success).length}/5 succeeded`);
  } catch (err) {
    console.error(`${t()} Stage 4a FAILED:`, err.message);
    throw Object.assign(new Error('Compositor setup failed.'), { stage: 'STAGE4A' });
  }

  // STAGE 4b
  console.log(`${t()} Stage 4b: applying typography`);
  let sharpResults;
  try {
    sharpResults = await processSharpTypographyStage({ geminiResults, instructions, guestName, duration });
    console.log(`${t()} Stage 4b: done — ${sharpResults.filter(r => r.success).length}/5 succeeded`);
  } catch (err) {
    console.error(`${t()} Stage 4b FAILED:`, err.message);
    throw Object.assign(new Error('Typography setup failed.'), { stage: 'STAGE4B' });
  }

  const variations = sharpResults.map((resItem, index) => {
    const instruction = instructions[index];
    const pexels = pexelsResults[index];
    if (!resItem.success) {
      return { error: true, failedStage: resItem.error?.stage || 'STAGE4_ERROR', message: 'Failed to composite this variation.', templateId: instruction.templateId, style, photographerCredit: pexels.photographer };
    }
    return { error: false, url: `data:image/jpeg;base64,${resItem.buffer.toString('base64')}`, templateId: instruction.templateId, style, photographerCredit: pexels.photographer };
  });

  console.log(`${t()} Pipeline complete — returning ${variations.filter(v => !v.error).length}/5 images`);
  return { variations };
}

module.exports = { runPipeline };
