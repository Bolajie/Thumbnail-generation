const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Ensure Anthropic SDK initializes with the environment variable
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Stage 2: Claude Handler
 * Translates input parameters into 5 specific compositor instructions.
 */
async function processClaudeStage({ guestName, industry, show, style, duration }) {
  try {
    // 1. Load brand identity
    const brandIdentityPath = path.join(__dirname, '../../intelligence/brand-identity-prompt.md');
    const brandIdentity = await fs.readFile(brandIdentityPath, 'utf-8');

    // 2. Load the show preset
    const showPresetPath = path.join(__dirname, `../../brand/shows/${show}.json`);
    const showPresetRaw = await fs.readFile(showPresetPath, 'utf-8');

    // 3. Load the style recipe
    const styleRecipePath = path.join(__dirname, `../../intelligence/${style}.md`);
    const styleRecipe = await fs.readFile(styleRecipePath, 'utf-8');

    // 4. Load the compositor prompt template
    const compositorPromptPath = path.join(__dirname, '../../intelligence/compositor-prompt.md');
    let compositorPrompt = await fs.readFile(compositorPromptPath, 'utf-8');

    // 5. Build prompts — static content (brand identity + show preset) goes into the system
    // prompt with cache_control so Anthropic caches it for 5 minutes, cutting Stage 2 from
    // ~27s to ~5-8s on cache hits when the same show is run more than once per session.
    const systemText = `${brandIdentity}\n\n---\nSHOW CONFIGURATION:\n${showPresetRaw}`;

    // Dynamic user prompt has BRAND_IDENTITY and SHOW_PRESET replaced with empty strings
    // since those are now provided via the system prompt block above.
    const dynamicPrompt = compositorPrompt
      .replace('{{GUEST_NAME}}', guestName || '')
      .replace('{{INDUSTRY}}', industry || '')
      .replace('{{SHOW_PRESET}}', '')
      .replace('{{STYLE_RECIPE}}', styleRecipe)
      .replace('{{BRAND_IDENTITY}}', '')
      .replace('{{DURATION}}', duration || '');

    // 6. Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: [
        {
          type: 'text',
          text: systemText,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        { role: 'user', content: dynamicPrompt }
      ]
    });

    let responseText = response.content[0].text;

    // 7. Strip markdown fences if present
    if (responseText.includes('```')) {
      const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        responseText = match[1];
      }
    }

    // 8. Parse JSON — strip trailing commas Claude occasionally emits
    responseText = responseText.replace(/,\s*([\]}])/g, '$1');
    let instructions;
    try {
      instructions = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse Claude JSON response. Raw output: ${responseText}`);
    }

    // 9. Validate response
    if (!Array.isArray(instructions) || instructions.length !== 5) {
      throw new Error(`Expected exactly 5 objects, but received ${Array.isArray(instructions) ? instructions.length : 'non-array type'}.`);
    }

    const requiredFields = [
      'pexelsQuery',
      'pexelsQueryTexture',
      'templateId',
      'colourGrade',
      'guestPosition',
      'overlayAsset',
      'moodAtmosphere',
      'geminiPrompt',
      'lightDirection',
    ];

    const validTemplates   = ['legacy', 'ornate', 'tactical'];
    const validAtmospheres = ['orange-sparks.png', 'anamorphic-flare.png', 'film-grain.png', 'none'];

    instructions.forEach((instruction, index) => {
      for (const field of requiredFields) {
        if (instruction[field] === undefined) {
          throw new Error(`Variation at index ${index} is missing required field: ${field}`);
        }
      }
      if (!validTemplates.includes(instruction.templateId)) {
        throw new Error(`Variation at index ${index} has invalid templateId: ${instruction.templateId}`);
      }
      if (!validAtmospheres.includes(instruction.moodAtmosphere)) {
        // Soft-fail: default to 'none' rather than rejecting the whole pipeline
        instruction.moodAtmosphere = 'none';
      }
    });

    return instructions;

  } catch (error) {
    const stageError = new Error(`STAGE2_ERROR: ${error.message}`);
    stageError.stage = 'STAGE2_ERROR';
    throw stageError;
  }
}

module.exports = {
  processClaudeStage
};
