# app/server/CONTEXT.md — Placeholder
# app/server/CONTEXT.md — Backend Workspace
**Read this before touching any file in /app/server**

---

## Purpose

This workspace contains the entire Node.js + Express backend. It runs the
four-stage thumbnail generation pipeline — from receiving the editor's form
submission to returning 5 composited PNG buffers. Each stage is isolated in
its own handler file. The orchestrator (`api-handler.js`) sequences them.

---

## Process

1. Read this file in full before editing any handler.
2. Identify which stage the change belongs to — edit only that handler.
3. Check the handler's API contract below before changing inputs or outputs.
4. If editing Stage 2, also read `/intelligence/CONTEXT.md` and the relevant
   prompt files before touching `claude-handler.js`.
5. If editing Stage 3, read `/intelligence/skills/pexels-api/SKILL.md` first.
6. If editing Stage 4, read `/intelligence/skills/sharp-compositor/SKILL.md` first.
7. Never expose raw API errors to the client — wrap all errors with stage context.

---

## Files in This Workspace

| File | Role |
|---|---|
| `index.js` | Express server entry point — mounts routes, sets middleware |
| `api-handler.js` | Orchestrator — sequences all stages, splits Pexels results, merges Gemini+Sharp |
| `background-removal-handler.js` | Stage 1 — @imgly background removal |
| `claude-handler.js` | Stage 2 — Claude API with prompt caching + response validation |
| `pexels-handler.js` | Stage 3 — Pexels fetch (accepts any array size, returns matching buffers) |
| `gemini-compositor-handler.js` | Stage 4a — Gemini multimodal compositor (×5 parallel) |
| `sharp-typography-handler.js` | Stage 4b — Sharp typography + vignette + atmosphere (×5 parallel) |

---

## The Full Pipeline

```
POST /api/generate
  Body: { photo: base64, guestName, industry, show, style, duration }
          ↓
api-handler.js (orchestrator)
          ↓
STAGE 1 — background-removal-handler.js
  Input:  photo (base64 string)
  Output: transparentGuestPng (Buffer)
  Lib:    @imgly/background-removal-node
          ↓
STAGE 2 — claude-handler.js
  Input:  { guestName, industry, show, style, duration }
  System prompt (cached): brand identity + show preset JSON
  User prompt: compositor-prompt.md + style recipe + form data
  Output: Array of 5 compositor instruction objects
  Each object: { pexelsQuery, pexelsQueryTexture, templateId, colourGrade,
                 guestPosition, overlayAsset, moodAtmosphere, geminiPrompt, lightDirection }
  Validates: exactly 5 objects, all 9 fields present, valid templateId + moodAtmosphere
  Model:  claude-sonnet-4-20250514 (prompt caching: ~27s cold, ~5-8s cache hit)
          ↓
STAGE 3 — pexels-handler.js
  Input:  Array of 10 query strings (5 primary + 5 texture, interleaved)
  Output: Array of 10 image Buffers
  Method: Promise.all — all 10 in parallel, never sequential
  api-handler splits result: primaryBackgrounds[5], textureBackgrounds[5]
          ↓
STAGE 4a — gemini-compositor-handler.js ×5 (Promise.allSettled — parallel)
  Input per variation:
    Image 1 — Primary Pexels background
    Image 2 — Texture Pexels abstract layer (optional)
    Image 3 — Transparent guest PNG
    Image 4 — Overlay asset PNG
    Prompt — gemini-compositor-prompt.md filled with all parameters
              including {{BACKGROUND_DOMINANT_COLOR}} extracted via Sharp.stats()
  Output: cinematic composited JPEG at 1280×720
  Partial failure: returns { success: false, error } per variation — pipeline continues
          ↓
STAGE 4b — sharp-typography-handler.js ×5 (Promise.allSettled — parallel)
  Input:  Gemini base image from Stage 4a
  Layer order (strict):
    1. Cinematic vignette SVG (radial gradient, dark edges)
    2. Atmospheric particle PNG — orange-sparks / anamorphic-flare / film-grain
       (from /brand/assets/atmospherics/, screen blend, film-grain tiles 320×180)
    3. Dark bottom gradient SVG (text readability backing)
    4. Typography SVG — 2-line adaptive name (72–158px, white + 1.5px gold stroke,
       drop shadow), EPISODE label (8px letter-spacing), duration badge (bottom-right)
  Output: final JPEG buffer (1280×720, quality 88)
          ↓
Response: { variations: [{ success, buffer, format }×5] }
```

---

## Handler API Contracts

### background-removal-handler.js
```
Input:  { photo: string }          // base64 encoded image
Output: transparentGuestPng Buffer // PNG with transparent background
Errors: STAGE1_ERROR
```

### claude-handler.js
```
Input:  { guestName, industry, show, style, duration }
Output: Array<CompositorInstruction>[5]

CompositorInstruction {
  pexelsQuery:        string,  // primary background search
  pexelsQueryTexture: string,  // abstract texture search for double-bagging
  templateId:         string,  // 'legacy' | 'ornate' | 'tactical'
  colourGrade:        object,  // { tint: hex, opacity: float }
  guestPosition:      object,  // { x: int, y: int, scale: float, anchor: string }
  overlayAsset:       string,  // single filename from /brand/assets/overlays/
  moodAtmosphere:     string,  // 'orange-sparks.png' | 'anamorphic-flare.png' | 'film-grain.png' | 'none'
  geminiPrompt:       string,  // 3-5 sentence creative brief for Gemini
  lightDirection:     string   // single phrase — e.g. 'upper-left dramatic side lighting'
}

Validation (before returning):
  - Exactly 5 objects in array
  - All 9 fields present on every object
  - templateId is one of: 'legacy', 'ornate', 'tactical'
  - moodAtmosphere soft-fails to 'none' if invalid (does not throw)
  - Strip markdown fences before JSON.parse, strip trailing commas

API call structure:
  - system[]: brand identity + show preset with cache_control: { type: 'ephemeral' }
  - messages[]: dynamic user prompt (style recipe + form data)
  - max_tokens: 2000

Errors: STAGE2_ERROR
```

### pexels-handler.js
```
Input:  string[]            // Array of N Pexels search queries (N = any non-zero length)
Output: Array<{ buffer: Buffer, photographer: string|null }>[N]
Method: Promise.all         // Always parallel
Fallback: gradient SVG if Pexels unavailable — pipeline never fails on missing image
Errors: STAGE3_ERROR
```

### gemini-compositor-handler.js
```
Input: {
  variations:          CompositorInstruction[5],
  backgrounds:         Array<{ buffer, photographer }>[5],   // primary backgrounds
  textureBackgrounds:  Array<{ buffer, photographer }>[5],   // texture backgrounds
  transparentGuestPng: Buffer,
  show:                string,
  style:               string
}
Per variation — extracts bgDominantColor via Sharp.stats() on 160×90 resize,
injects into prompt as {{BACKGROUND_DOMINANT_COLOR}}
Output: Array<{ success: bool, buffer: Buffer | error }>[5]
Method: Promise.allSettled — partial failure allowed, pipeline continues
Errors: STAGE4A_ERROR per variation
```

### sharp-typography-handler.js
```
Input: {
  geminiResults: Array<{ success, buffer, error }>[5],
  instructions:  CompositorInstruction[5],
  guestName:     string,
  duration:      string
}
Output: Array<{ success: bool, buffer: Buffer, format: 'jpeg' }>[5]
Method: Promise.allSettled — parallel, partial failure allowed
Errors: STAGE4B_ERROR per variation
```

---

## Environment Variables

| Variable | Used in | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | `claude-handler.js` | Claude API authentication |
| `PEXELS_API_KEY` | `pexels-handler.js` | Pexels API authentication |
| `GEMINI_API_KEY` | `gemini-compositor-handler.js` | Gemini API authentication |
| `PORT` | `index.js` | Express server port (default: 3001) |

Store in `.env` at project root. Never commit to version control.

---

## Error Handling Rules

- Every stage wraps errors with a stage label: `STAGE1_ERROR`, `STAGE2_ERROR`, `STAGE3_ERROR`, `STAGE4A_ERROR`, `STAGE4B_ERROR`
- Stages 1–3 are fatal — if they fail the whole pipeline stops
- Stages 4a and 4b use `Promise.allSettled` — a variation can fail without killing the others
- The orchestrator returns successful variations even if 1–2 fail; failed slots are flagged
- Raw API errors (Claude, Pexels, Gemini) are never sent to the client
- Pexels failures fall back to generated gradient backgrounds — pipeline never blocks on missing images
