# intelligence/skills/nano-banana-pro/SKILL.md
**Governs:** `app/server/gemini-compositor.js` — Stage 4a of the pipeline
**Read this before touching the Gemini compositor handler**

---

## What This Skill Governs

Nano Banana Pro is the internal codename for the Gemini multimodal compositor.
It receives three images and a fully-assembled prompt per variation, composites
them into a broadcast-quality 1280×720 base image, and returns a PNG buffer.
Sharp (Stage 4b) then adds all typography on top.

Gemini handles **visual compositing only** — no text, no labels, no badges.

---

## Model

```
gemini-3-pro-image
```

Use the `@google/generative-ai` Node.js SDK. Initialise once at module load —
do not re-instantiate per request.

```js
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image' });
```

---

## Handler API Contract

```
File:    app/server/gemini-compositor.js
Export:  compositeVariations(inputs: VariationInput[5]) → Promise<Buffer[5]>

VariationInput {
  backgroundBuffer:    Buffer,   // Pexels image (Stage 3)
  transparentGuestPng: Buffer,   // @imgly output (Stage 1)
  overlayBuffer:       Buffer,   // loaded from /brand/assets/overlays/[filename]
  instruction:         CompositorInstruction,  // Stage 2 output object
  showPreset:          object,   // loaded from /brand/shows/[show].json
  templateConfig:      object,   // loaded from /brand/templates/[id].json
  styleRecipe:         string,   // full text of /intelligence/[style].md
  brandIdentity:       string,   // full text of /intelligence/brand-identity-prompt.md
}

Output: Buffer[5]   // PNG buffers at exactly 1280×720, one per variation
Errors: STAGE4A_ERROR — wrap with stage label, never expose raw Gemini error
```

---

## Execution Pattern

All 5 Gemini calls run in parallel via `Promise.all`. Never sequential.

```js
export async function compositeVariations(inputs) {
  return Promise.all(inputs.map((input) => compositeSingle(input)));
}
```

---

## Single Variation: compositeSingle

### 1. Encode images as inline data parts

Convert each Buffer to base64 and wrap as Gemini inline data parts:

```js
function toInlinePart(buffer, mimeType = 'image/png') {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}
```

Image order passed to Gemini must always be:
1. Background plate (Pexels)
2. Transparent guest PNG
3. Overlay asset PNG

### 2. Assemble the prompt

Load `gemini-compositor-prompt.md` once at module load. Fill all placeholders
before each call:

| Placeholder | Source |
|---|---|
| `{{BRAND_IDENTITY}}` | `input.brandIdentity` |
| `{{SHOW_NAME}}` | `input.showPreset.showName` |
| `{{STYLE_RECIPE}}` | `input.styleRecipe` |
| `{{TEMPLATE_ID}}` | `input.instruction.templateId` |
| `{{TINT_COLOUR}}` | `input.instruction.colourGrade.tint` |
| `{{TINT_OPACITY}}` | `input.instruction.colourGrade.opacity` |
| `{{GUEST_POSITION}}` | `${input.instruction.guestPosition.x}, ${input.instruction.guestPosition.y}` |
| `{{GUEST_SCALE}}` | `input.instruction.guestPosition.scale` |
| `{{OVERLAY_OPACITY}}` | `input.templateConfig.overlayOpacity` |
| `{{OVERLAY_BLEND}}` | `input.templateConfig.overlayBlend` |
| `{{GOLD_COLOUR}}` | `#C9A84C` (hardcoded — never sourced elsewhere) |
| `{{LIGHT_DIRECTION}}` | `input.templateConfig.lightDirection` |

### 3. Make the API call

```js
const result = await model.generateContent([
  assembledPromptText,
  toInlinePart(input.backgroundBuffer),
  toInlinePart(input.transparentGuestPng),
  toInlinePart(input.overlayBuffer),
]);
```

### 4. Extract the image buffer

Gemini returns the composited image as an inline data part in the response.
Extract and convert to a Buffer:

```js
const candidate = result.response.candidates[0];
const imagePart = candidate.content.parts.find((p) => p.inlineData);
if (!imagePart) throw new Error('STAGE4A_ERROR: no image in Gemini response');
const outputBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
```

### 5. Validate dimensions

Use Sharp to confirm the output is exactly 1280×720 before returning.
If dimensions are wrong, throw `STAGE4A_ERROR` with the actual dimensions.

```js
const { width, height } = await sharp(outputBuffer).metadata();
if (width !== 1280 || height !== 720) {
  throw new Error(`STAGE4A_ERROR: unexpected dimensions ${width}×${height}`);
}
```

---

## Prompt File Loading

Load both static files once at module load, not per-request:

```js
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEMINI_PROMPT_TEMPLATE = readFileSync(
  join(__dirname, '../../intelligence/gemini-compositor-prompt.md'), 'utf8'
);
const BRAND_IDENTITY = readFileSync(
  join(__dirname, '../../intelligence/brand-identity-prompt.md'), 'utf8'
);
```

---

## Overlay Loading

The overlay filename comes from `instruction.overlayList[0]`. Load from
`/brand/assets/overlays/[filename]` and convert to Buffer before calling
`compositeSingle`. This is done by the orchestrator (`api-handler.js`), not
inside this handler.

---

## Environment Variable

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI API key — store in `.env`, never commit |

---

## Error Handling

- Wrap all errors as `STAGE4A_ERROR` before throwing
- Include the variation index in the error message for debugging
- Never expose the raw Gemini API error to the client
- A single failed variation must not block the other four —
  the orchestrator handles partial failure per `app/server/CONTEXT.md`

---

## Key Constraints (from CLAUDE.md — never override)

- Gemini handles **no text** — prompt must not ask for labels, names, or badges
- `brand-identity-prompt.md` is **always injected** — never omit `{{BRAND_IDENTITY}}`
- Output must be **exactly 1280×720** — validate before returning
- Gold `#C9A84C` is **hardcoded** in the prompt — never pull from another source
- All 5 calls run **in parallel** via `Promise.all` — never sequential
