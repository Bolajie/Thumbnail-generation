const { processBackgroundRemoval } = require('./background-removal-handler');
const { processClaudeStage } = require('./claude-handler');
const { processPexelsStage } = require('./pexels-handler');
const { processGeminiCompositorStage } = require('./gemini-compositor-handler');
const { processSharpTypographyStage } = require('./sharp-typography-handler');

/**
 * Main Orchestrator Route Handler
 */
async function handleGenerate(req, res) {
  try {
    const { photo, transparentPng: clientTransparentPng, guestName, industry, show, style, duration } = req.body;

    if (!photo) {
      return res.status(400).json({ error: true, stage: 'STAGE0', message: 'Missing guest photo.' });
    }

    // STAGE 1 — skip if the browser already did background removal client-side
    let transparentPng;
    if (clientTransparentPng) {
      const base64Data = clientTransparentPng.replace(/^data:image\/\w+;base64,/, '');
      transparentPng = Buffer.from(base64Data, 'base64');
    } else {
      try {
        const result = await processBackgroundRemoval({ photo });
        transparentPng = result.transparentPng;
      } catch (err) {
        return res.status(500).json({ error: true, stage: 'STAGE1', message: 'Background removal failed.' });
      }
    }

    // STAGE 2
    let instructions;
    try {
      instructions = await processClaudeStage({ guestName, industry, show, style, duration });
    } catch (err) {
      return res.status(500).json({ error: true, stage: 'STAGE2', message: 'Translation layer failed to build variations.' });
    }

    // STAGE 3
    let pexelsResults;
    try {
      const pexelsQueries = instructions.map(i => i.pexelsQuery);
      pexelsResults = await processPexelsStage(pexelsQueries);
    } catch (err) {
      return res.status(500).json({ error: true, stage: 'STAGE3', message: 'Failed to fetch background assets.' });
    }

    // STAGE 4a
    let geminiResults;
    try {
      geminiResults = await processGeminiCompositorStage({
        variations: instructions,
        backgrounds: pexelsResults,
        transparentGuestPng: transparentPng,
        show,
        style
      });
    } catch (err) {
      return res.status(500).json({ error: true, stage: 'STAGE4A', message: 'Compositor setup failed.' });
    }

    // STAGE 4b
    let sharpResults;
    try {
      sharpResults = await processSharpTypographyStage({
        geminiResults,
        instructions,
        guestName,
        duration
      });
    } catch (err) {
      return res.status(500).json({ error: true, stage: 'STAGE4B', message: 'Typography setup failed.' });
    }

    // Merge and return final results
    const finalVariations = sharpResults.map((resItem, index) => {
      const instruction = instructions[index];
      const pexels = pexelsResults[index];
      
      if (!resItem.success) {
        return {
          error: true,
          failedStage: resItem.error.stage || 'STAGE4_ERROR',
          message: 'Failed to composite this variation.',
          templateId: instruction.templateId,
          style: style,
          photographerCredit: pexels.photographer
        };
      }

      return {
        error: false,
        url: `data:image/png;base64,${resItem.buffer.toString('base64')}`,
        templateId: instruction.templateId,
        style: style,
        photographerCredit: pexels.photographer
      };
    });

    return res.status(200).json({ variations: finalVariations });
  } catch (error) {
    return res.status(500).json({ error: true, stage: 'UNKNOWN', message: 'An unexpected pipeline error occurred.' });
  }
}

module.exports = {
  handleGenerateRequest: handleGenerate
};
