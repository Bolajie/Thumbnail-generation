const { processBackgroundRemoval } = require('./background-removal-handler');
const { processClaudeStage } = require('./claude-handler');
const { processPexelsStage } = require('./pexels-handler');
const { processGeminiCompositorStage } = require('./gemini-compositor-handler');
const { processSharpTypographyStage } = require('./sharp-typography-handler');

async function handleGenerate(req, res) {
  const t = () => `[${new Date().toISOString()}]`;
  try {
    const { photo, transparentPng: clientTransparentPng, guestName, industry, show, style, duration } = req.body;

    if (!photo) {
      return res.status(400).json({ error: true, stage: 'STAGE0', message: 'Missing guest photo.' });
    }

    // STAGE 1 — skip if browser already removed background
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
        return res.status(500).json({ error: true, stage: 'STAGE1', message: 'Background removal failed.' });
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
      return res.status(500).json({ error: true, stage: 'STAGE2', message: 'Translation layer failed to build variations.' });
    }

    // STAGE 3
    console.log(`${t()} Stage 3: fetching backgrounds`);
    let pexelsResults;
    try {
      const pexelsQueries = instructions.map(i => i.pexelsQuery);
      pexelsResults = await processPexelsStage(pexelsQueries);
      console.log(`${t()} Stage 3: done — ${pexelsResults.map(r => r.buffer.length + 'b').join(', ')}`);
    } catch (err) {
      console.error(`${t()} Stage 3 FAILED:`, err.message);
      return res.status(500).json({ error: true, stage: 'STAGE3', message: 'Failed to fetch background assets.' });
    }

    // STAGE 4a
    console.log(`${t()} Stage 4a: calling Gemini (5 parallel)`);
    let geminiResults;
    try {
      geminiResults = await processGeminiCompositorStage({
        variations: instructions,
        backgrounds: pexelsResults,
        transparentGuestPng: transparentPng,
        show,
        style
      });
      const ok = geminiResults.filter(r => r.success).length;
      console.log(`${t()} Stage 4a: done — ${ok}/5 succeeded`);
    } catch (err) {
      console.error(`${t()} Stage 4a FAILED:`, err.message);
      return res.status(500).json({ error: true, stage: 'STAGE4A', message: 'Compositor setup failed.' });
    }

    // STAGE 4b
    console.log(`${t()} Stage 4b: applying typography`);
    let sharpResults;
    try {
      sharpResults = await processSharpTypographyStage({
        geminiResults,
        instructions,
        guestName,
        duration
      });
      const ok = sharpResults.filter(r => r.success).length;
      console.log(`${t()} Stage 4b: done — ${ok}/5 succeeded`);
    } catch (err) {
      console.error(`${t()} Stage 4b FAILED:`, err.message);
      return res.status(500).json({ error: true, stage: 'STAGE4B', message: 'Typography setup failed.' });
    }

    const finalVariations = sharpResults.map((resItem, index) => {
      const instruction = instructions[index];
      const pexels = pexelsResults[index];

      if (!resItem.success) {
        return {
          error: true,
          failedStage: resItem.error?.stage || 'STAGE4_ERROR',
          message: 'Failed to composite this variation.',
          templateId: instruction.templateId,
          style,
          photographerCredit: pexels.photographer
        };
      }

      return {
        error: false,
        url: `data:image/jpeg;base64,${resItem.buffer.toString('base64')}`,
        templateId: instruction.templateId,
        style,
        photographerCredit: pexels.photographer
      };
    });

    console.log(`${t()} Pipeline complete — returning ${finalVariations.filter(v => !v.error).length}/5 images`);
    return res.status(200).json({ variations: finalVariations });

  } catch (error) {
    console.error(`${t()} Pipeline UNKNOWN error:`, error.message);
    return res.status(500).json({ error: true, stage: 'UNKNOWN', message: 'An unexpected pipeline error occurred.' });
  }
}

module.exports = { handleGenerateRequest: handleGenerate };
