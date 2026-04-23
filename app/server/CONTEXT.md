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
| `api-handler.js` | Orchestrator — sequences all 4 stages, merges results |
| `background-removal-handler.js` | Stage 1 — background removal |
| `claude-handler.js` | Stage 2 — Claude API call + response validation |
| `pexels-handler.js` | Stage 3 — Pexels image fetch |
| `sharp-compositor.js` | Stage 4 — Sharp layer assembly + PNG export |

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
  Input:  { guestName, industry, show, style, duration, transparentGuestPng }
  Output: Array of 5 compositor instruction objects
  Each object: { pexelsQuery, templateId, colourGrade,
                 guestPosition, overlayList, textStyle }
  Validates: exactly 5 objects, all required fields present
  Model:  claude-sonnet-4-20250514
          ↓
STAGE 3 — pexels-handler.js
  Input:  Array of 5 pexelsQuery strings
  Output: Array of 5 image Buffers
  Method: Promise.all — parallel, never sequential
          ↓
STAGE 4 — sharp-compositor.js ×5
  Input (per variation):
    backgroundBuffer, transparentGuestPng, instructionObject,
    templateConfig (from /brand/templates/[id].json),
    overlayPaths (from /brand/assets/overlays/)
  Layer order (strict):
    1. Background image → resized to 1280×720
    2. Colour grade tint overlay (from show preset)
    3. Decorative overlay PNGs (from template config)
    4. SVG guest name → composited BEHIND guest (sandwich bottom)
    5. Transparent guest PNG → on top of name (sandwich top)
    6. SVG show label + EPISODE label + duration badge
  Output: PNG Buffer
  Method: Promise.all — parallel, never sequential
          ↓
Response: { variations: [Buffer×5] }
```

---

## Handler API Contracts

### background-removal-handler.js
```
Input:  { photo: string }          // base64 encoded image
Output: { transparentPng: Buffer } // PNG with transparent background
Errors: STAGE1_ERROR — wrap with stage label before throwing
```

### claude-handler.js
```
Input:  { guestName, industry, show, style, duration, transparentPng }
Output: Array<CompositorInstruction>[5]

CompositorInstruction {
  pexelsQuery:   string,   // Pexels search string
  templateId:    string,   // 'legacy' | 'ornate' | 'tactical'
  colourGrade:   object,   // { tint: hex, opacity: float }
  guestPosition: object,   // { x: int, y: int, scale: float, anchor: string }
  overlayList:   string[], // filenames from /brand/assets/overlays/
  textStyle:     object    // { fontSize: int, weight: string, colour: hex }
}

Validation (before returning):
  - Exactly 5 objects in array
  - All 6 fields present on every object
  - templateId is one of: 'legacy', 'ornate', 'tactical'
  - Strip markdown fences from Claude response before JSON.parse

Errors: STAGE2_ERROR — wrap with stage label, never expose raw Claude error
```

### pexels-handler.js
```
Input:  string[5]           // Array of 5 Pexels search queries
Output: Buffer[5]           // Array of 5 image buffers (landscape, ≥1280px wide)
Method: Promise.all         // Always parallel
Errors: STAGE3_ERROR — include query string in error for debugging
```

### sharp-compositor.js
```
Input: {
  backgroundBuffer:    Buffer,
  transparentGuestPng: Buffer,
  instruction:         CompositorInstruction,
  templateConfig:      object,    // loaded from /brand/templates/[id].json
  overlayPaths:        string[],  // absolute paths to /brand/assets/overlays/
  showPreset:          object,    // loaded from /brand/shows/[show].json
  guestName:           string,
  duration:            string
}
Output: Buffer  // PNG at 1280×720
Errors: STAGE4_ERROR — include layer number in error for debugging
```

---

## Environment Variables

| Variable | Used in | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | `claude-handler.js` | Claude API authentication |
| `PEXELS_API_KEY` | `pexels-handler.js` | Pexels API authentication |
| `PORT` | `index.js` | Express server port (default: 3001) |

Store in `.env` at project root. Never commit to version control.

---

## Error Handling Rules

- Every stage wraps its errors with a stage label: `STAGE1_ERROR`, `STAGE2_ERROR`, etc.
- The orchestrator (`api-handler.js`) catches per-stage errors and returns:
  `{ error: true, stage: 'STAGE_N', message: '[human readable]' }`
- Raw API errors (Claude, Pexels) are never sent to the client
- If a single Sharp compositor variation fails, return the 4 successful ones
  and flag the failed variation index in the response
