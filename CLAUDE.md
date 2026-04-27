# CLAUDE.md — ISTV Thumbnail Engine v3
**Project:** Inside Success TV — Internal Thumbnail Generation Tool
**Operator:** ISTV production editors
**Version:** 3.0 — Hybrid Compositing Architecture with Z-Layer Depth
**Last updated:** April 2026

---

## What This Is

An internal tool for ISTV production editors. The editor uploads a guest photo,
fills a short form, and receives 5 distinct cinematic thumbnail variations in
under 60 seconds.

The pipeline uses a hybrid compositing approach:
- **@imgly** removes the guest background — producing a clean transparent PNG
- **Pexels** supplies the cinematic background scene
- **Claude API** translates editor intent into 5 precise compositor instruction objects
- **Gemini (Nano Banana Pro)** does the creative heavy lifting — compositing the
  background, guest subject, overlays, colour grade, lighting, and mood into a
  broadcast-quality base image using every resource available
- **Sharp** guarantees the typography — guest name, episode label, duration badge
  are always pixel-perfect, always correctly spelled, always on-brand

**This is an editor-facing tool. Not a public product.**

---

## Folder Structure

```
/istv-thumbnail-engine-v2
│
├── CLAUDE.md                              ← You are here. Read this first.
│
├── /brand                                 ← All visual identity
│   ├── CONTEXT.md                         ← Read before touching anything in /brand
│   ├── istv-master.json                   ← Master palette + font constants
│   ├── /shows                             ← Per-show preset configs (14 files)
│   ├── /templates                         ← Compositor layout definitions (3 files)
│   └── /assets
│       ├── /overlays                      ← Overlay PNGs (gold-frame, vignette, etc.)
│       ├── /badges                        ← Per-show badge PNGs
│       └── /atmospherics                  ← Particle/grain assets for Sharp Stage 4b
│
├── /app                                   ← All software
│   ├── /server                            ← Node.js + Express backend
│   │   └── CONTEXT.md                     ← Read before touching any server file
│   └── /client                            ← React frontend
│       └── CONTEXT.md                     ← Read before touching any client file
│
├── /intelligence                          ← All AI prompt files + implementation skills
│   ├── CONTEXT.md                         ← Read before touching prompts or skills
│   ├── brand-identity-prompt.md           ← ISTV visual DNA — always injected into Gemini
│   ├── compositor-prompt.md               ← Master Claude Stage 2 prompt
│   ├── gemini-compositor-prompt.md        ← Master Gemini Stage 4a prompt
│   ├── legacy-makers.md                   ← Show-specific style recipe
│   ├── women-in-power.md                  ← Show-specific style recipe
│   ├── operation-ceo.md                   ← Show-specific style recipe
│   ├── americas-top-lawyers.md            ← Show-specific style recipe
│   ├── americas-best-doctors.md           ← Show-specific style recipe
│   ├── kingdom-by-creator.md              ← Show-specific style recipe
│   ├── mompreneurs.md                     ← Show-specific style recipe
│   ├── americas-top-trainers.md           ← Show-specific style recipe
│   ├── builders-of-america.md             ← Show-specific style recipe
│   ├── americas-top-coaches.md            ← Show-specific style recipe
│   ├── couples-empire.md                  ← Show-specific style recipe
│   ├── americas-top-agents.md             ← Show-specific style recipe
│   └── /skills                            ← Skill files governing implementation
│       ├── /frontend-design
│       ├── /react-skill
│       ├── /pexels-api
│       ├── /sharp-compositor
│       └── /nano-banana-pro
│
└── /output                                ← Saved generation sessions
    └── CONTEXT.md
```

---

## Routing Table

| Task | Go to | Read first |
|---|---|---|
| Edit show colour or brand config | `/brand/shows` | `brand/CONTEXT.md` |
| Edit compositor layout | `/brand/templates` | `brand/CONTEXT.md` |
| Add or swap overlay / badge asset | `/brand/assets` | `brand/CONTEXT.md` |
| Add a new show | `/brand/shows` + `/brand/assets` | `brand/CONTEXT.md` → `istv-master.json` |
| Edit Claude translator prompt | `/intelligence` | `intelligence/CONTEXT.md` |
| Edit Gemini compositor prompt | `/intelligence` | `intelligence/gemini-compositor-prompt.md` |
| Edit brand identity prompt | `/intelligence` | `intelligence/brand-identity-prompt.md` |
| Edit a style recipe | `/intelligence` | `intelligence/CONTEXT.md` → relevant `.md` |
| Create or edit a skill | `/intelligence/skills` | `intelligence/CONTEXT.md` |
| Edit background removal (Stage 1) | `/app/server` | `app/server/CONTEXT.md` |
| Edit Claude handler (Stage 2) | `/app/server` | `app/server/CONTEXT.md` + `intelligence/CONTEXT.md` |
| Edit Pexels handler (Stage 3) | `/app/server` | `app/server/CONTEXT.md` + `intelligence/skills/pexels-api/SKILL.md` |
| Edit Gemini compositor (Stage 4a) | `/app/server` | `app/server/CONTEXT.md` + `intelligence/skills/nano-banana-pro/SKILL.md` |
| Edit Sharp typography (Stage 4b) | `/app/server` | `app/server/CONTEXT.md` + `intelligence/skills/sharp-compositor/SKILL.md` |
| Edit pipeline orchestration | `/app/server` | `app/server/CONTEXT.md` |
| Edit any UI component | `/app/client` | `app/client/CONTEXT.md` + `intelligence/skills/frontend-design/SKILL.md` |

---

## Naming Conventions

| File type | Pattern | Example |
|---|---|---|
| Show preset | `[show-slug].json` | `women-in-power.json` |
| Template layout | `[layout-id].json` | `ornate.json` |
| Style recipe | `[show-slug].md` | `legacy-makers.md` |
| Thumbnail output | `[guest-slug]-[YYYYMMDD]-[variant].png` | `jane-smith-20260419-v3.png` |

---

## Key Constraints (Never Override)

- Guest photo is **mandatory** — pipeline does not start without it
- Output is always **5 variations** — never fewer
- Guest name typography is always handled by **Sharp** — never Gemini
- Font is **Montserrat only** — rendered via SVG in Sharp, no exceptions
- Gold `#C9A84C` must appear on every thumbnail
- Duration stamp is **always bottom-right** — added by Sharp, never Gemini
- `brand-identity-prompt.md` is **always injected** into every Gemini call — never omitted
- All Stage 3 Pexels fetches and Stage 4a Gemini calls run **in parallel** — never sequential
- Claude returns **structured JSON only** — validated before Stage 3 runs
- Gemini handles **no text** — only visual compositing

---

## The Pipeline

```
Editor uploads photo + fills form
  (guest name, industry, show, style, duration)
          ↓
Stage 1 — Background Removal
  @imgly/background-removal-node
  Input:  guest photo (base64)
  Output: transparent guest PNG
          ↓
Stage 2 — Claude Translation Layer
  Model:  claude-sonnet-4-20250514 (with prompt caching)
  System: brand identity + show preset  ← cached for 5 min (same show = cache hit)
  User:   compositor-prompt.md + style recipe + form data
  Output: 5 compositor instruction objects
  Each:   { pexelsQuery, pexelsQueryTexture, templateId, colourGrade,
             guestPosition, overlayAsset, moodAtmosphere, geminiPrompt, lightDirection }
          ↓
Stage 3 — Pexels Asset Fetch (×10 parallel — "double-bagging")
  Input:  10 query strings (5 primary scene + 5 abstract texture, one pair per variation)
  Output: 10 image buffers split into primaryBackgrounds[5] + textureBackgrounds[5]
          ↓
Stage 4a — Gemini Compositor / Nano Banana Pro (×5 parallel)
  Input per variation:
    Image 1 — Primary Pexels background scene
    Image 2 — Texture Pexels abstract layer (blended into BG via SOFT LIGHT at 38–45%)
    Image 3 — Transparent guest PNG (Stage 1)
    Image 4 — Overlay asset PNG (/brand/assets/overlays/)
  Prompt per variation:
    gemini-compositor-prompt.md (with extracted {{BACKGROUND_DOMINANT_COLOR}})
    + brand-identity-prompt.md
    + show preset (/brand/shows/[show].json)
    + template layout (/brand/templates/[id].json)
    + style recipe (/intelligence/[style].md)
    + compositor instruction object (Stage 2)
  Output: cinematic composited base image (1280×720)
          ↓
Stage 4b — Sharp Typography Layer (×5 parallel)
  Input:  Gemini base image (Stage 4a)
  Adds (in order):
    Cinematic vignette (radial gradient SVG)
    Atmospheric particle overlay — orange-sparks, anamorphic-flare, or film-grain
      (from /brand/assets/atmospherics/, blended screen mode)
    Dark bottom gradient (so white text always reads)
    SVG guest name — 2-line adaptive, white with 1.5px gold stroke, drop shadow
    SVG EPISODE label — wide-tracked, semi-transparent
    SVG duration badge — bottom-right
  Output: final JPEG buffer (1280×720)
          ↓
5 variations → editor selects → downloads at 1280×720
```

---

## Resources Feeding Gemini (Stage 4a)

Every resource built in this project is channelled into Gemini per variation:

| Resource | Source | What Gemini uses it for |
|---|---|---|
| Primary background image | Pexels (Stage 3) | Scene foundation and environment |
| Texture background image | Pexels (Stage 3) | Depth layer — SOFT LIGHT blended into primary |
| Background dominant color | Extracted via Sharp `.stats()` | Exact hex for rim light + light wrap |
| Transparent guest PNG | @imgly (Stage 1) | Subject placement and integration |
| Overlay asset PNG | `/brand/assets/overlays/` | Mood, texture, decorative layer |
| Brand identity prompt | `/intelligence/brand-identity-prompt.md` | ISTV visual DNA and rules |
| Show preset | `/brand/shows/[show].json` | Colour tone, show-specific style |
| Template layout | `/brand/templates/[id].json` | Guest position and composition |
| Style recipe | `/intelligence/[style].md` | Variation mood direction |
| Compositor instruction | Claude Stage 2 output | Per-variation precise spec |

---

## Skills in Use

| Skill | Location | Status |
|---|---|---|
| `frontend-design` | `/intelligence/skills/frontend-design/SKILL.md` | ✅ Complete |
| `react-skill` | `/intelligence/skills/react-skill/AGENTS.md` | ✅ Complete |
| `pexels-api` | `/intelligence/skills/pexels-api/SKILL.md` | ✅ Complete |
| `sharp-compositor` | `/intelligence/skills/sharp-compositor/SKILL.md` | ✅ Complete |
| `nano-banana-pro` | `/intelligence/skills/nano-banana-pro/SKILL.md` | ✅ Complete |
