const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-preview-image-generation',
  generationConfig: { responseModalities: ['IMAGE'] }
});

/**
 * Stage 4a: Gemini Compositor Handler
 * Runs 5 variations in parallel. Refactored to support partial failures.
 */
async function processGeminiCompositorStage({ variations, backgrounds, transparentGuestPng, show, style }) {
  try {
    const brandIdentityPath = path.join(__dirname, '../../intelligence/brand-identity-prompt.md');
    const brandIdentity = await fs.readFile(brandIdentityPath, 'utf-8');

    const showPresetPath = path.join(__dirname, `../../brand/shows/${show}.json`);
    const showPreset = JSON.parse(await fs.readFile(showPresetPath, 'utf-8'));

    const styleRecipePath = path.join(__dirname, `../../intelligence/${style}.md`);
    const styleRecipe = await fs.readFile(styleRecipePath, 'utf-8');

    const promptTemplatePath = path.join(__dirname, '../../intelligence/gemini-compositor-prompt.md');
    const promptTemplate = await fs.readFile(promptTemplatePath, 'utf-8');

    const processVariation = async (instruction, index) => {
      try {
        const backgroundBuffer = backgrounds[index].buffer;
        
        const overlayFileName = instruction.overlayAsset || (instruction.overlayList && instruction.overlayList[0]);
        if (!overlayFileName) {
          throw new Error('Instruction is missing overlay asset definition.');
        }
        const overlayAssetPath = path.join(__dirname, `../../brand/assets/overlays/${overlayFileName}`);
        const overlayBuffer = await fs.readFile(overlayAssetPath);

        const templatePath = path.join(__dirname, `../../brand/templates/${instruction.templateId}.json`);
        const templateLayout = JSON.parse(await fs.readFile(templatePath, 'utf-8'));

        const finalPrompt = promptTemplate
          .replace('{{BRAND_IDENTITY}}', brandIdentity)
          .replace('{{SHOW_NAME}}', showPreset.showName)
          .replace('{{STYLE_RECIPE}}', styleRecipe)
          .replace('{{TEMPLATE_ID}}', instruction.templateId)
          .replace('{{TINT_COLOUR}}', instruction.colourGrade?.tint || templateLayout.colourGradeConfig?.tint || '#000000')
          .replace('{{TINT_OPACITY}}', instruction.colourGrade?.opacity || templateLayout.colourGradeConfig?.opacity || '0.5')
          .replace('{{GUEST_POSITION}}', JSON.stringify(instruction.guestPosition || templateLayout.guestPosition))
          .replace('{{GUEST_SCALE}}', instruction.guestPosition?.scale || templateLayout.guestPosition?.scale || '1.0')
          .replace('{{OVERLAY_OPACITY}}', '1.0')
          .replace('{{OVERLAY_BLEND}}', 'screen')
          .replace('{{GOLD_COLOUR}}', showPreset.primaryColour)
          .replace('{{LIGHT_DIRECTION}}', instruction.geminiPrompt || 'cinematic studio lighting');

        // Stage 4a — Nano Banana Pro (Gemini multimodal compositor)
        const result = await geminiModel.generateContent([
          finalPrompt,
          { inlineData: { data: backgroundBuffer.toString('base64'), mimeType: 'image/jpeg' } },
          { inlineData: { data: transparentGuestPng.toString('base64'), mimeType: 'image/png' } },
          { inlineData: { data: overlayBuffer.toString('base64'), mimeType: 'image/png' } }
        ]);

        const imagePart = result.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart) throw new Error('No image returned in Gemini response');

        let outputBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

        // Guarantee exactly 1280×720 — resize if Gemini returns different dimensions
        const meta = await sharp(outputBuffer).metadata();
        if (meta.width !== 1280 || meta.height !== 720) {
          outputBuffer = await sharp(outputBuffer).resize(1280, 720, { fit: 'cover' }).toBuffer();
        }

        return outputBuffer;
      } catch (error) {
        const stageError = new Error(`STAGE4A_ERROR: Variation ${index} failed.`);
        stageError.stage = 'STAGE4A_ERROR';
        stageError.variationIndex = index;
        throw stageError;
      }
    };

    const results = await Promise.allSettled(variations.map((v, i) => processVariation(v, i)));
    
    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return { success: true, buffer: result.value };
      } else {
        return { success: false, error: result.reason };
      }
    });

  } catch (error) {
    const wrapError = new Error(`STAGE4A_ERROR: Setup failed.`);
    wrapError.stage = 'STAGE4A_ERROR';
    throw wrapError;
  }
}

module.exports = {
  processGeminiCompositorStage
};
