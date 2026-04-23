# CLAUDE.md — ISTV Thumbnail Engine v2
# CLAUDE.md — ISTV Thumbnail Engine v2
**Project:** Inside Success TV — Internal Thumbnail Generation Tool
**Operator:** ISTV production editors
**Version:** 2.1 — Hybrid Compositing Architecture
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
│   ├── /shows                             ← Per-show preset configs (6 files)
│   ├── /templates                         ← Compositor layout definitions (3 files)
│   └── /assets                            ← Overlay PNGs + show badge PNGs
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
│   ├── compositor-prompt.md               ← Master Claude prompt (created at Prompt 3)
│   ├── gemini-compositor-prompt.md        ← Master Gemini prompt (created at Prompt 3)
│   ├── cinematic-gold.md                  ← Style recipe (created at Prompt 3)
│   ├── modern-corporate.md                ← Style recipe (created at Prompt 3)
│   ├── gritty-action.md                   ← Style recipe (created at Prompt 3)
│   ├── vibrant-tech.md                    ← Style recipe (created at Prompt 3)
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
| Style recipe | `[style-slug].md` | `cinematic-gold.md` |
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
  Model:  claude-sonnet-4-20250514
  Input:  form data + show preset + style recipe + brand identity
  Output: 5 compositor instruction objects
  Each:   { pexelsQuery, templateId, colourGrade,
             guestPosition, overlayAsset, geminiPrompt, textStyle }
          ↓
Stage 3 — Pexels Asset Fetch (×5 parallel)
  Input:  5 pexelsQuery strings
  Output: 5 background image buffers
          ↓
Stage 4a — Gemini Compositor / Nano Banana Pro (×5 parallel)
  Input per variation:
    Image 1 — Pexels background (Stage 3)
    Image 2 — Transparent guest PNG (Stage 1)
    Image 3 — Overlay asset PNG (/brand/assets/overlays/)
  Prompt per variation:
    gemini-compositor-prompt.md
    + brand-identity-prompt.md
    + show preset (/brand/shows/[show].json)
    + template layout (/brand/templates/[id].json)
    + style recipe (/intelligence/[style].md)
    + compositor instruction object (Stage 2)
  Output: cinematic composited base image (1280×720)
          ↓
Stage 4b — Sharp Typography Layer (×5 parallel)
  Input:  Gemini base image (Stage 4a)
  Adds:
    SVG guest name — large, bold, Montserrat, gold
    SVG EPISODE label — small caps, above name
    SVG duration badge — bottom-right, white
  Output: final PNG buffer (1280×720)
          ↓
5 variations → editor selects → downloads at 1280×720
```

---

## Resources Feeding Gemini (Stage 4a)

Every resource built in this project is channelled into Gemini per variation:

| Resource | Source | What Gemini uses it for |
|---|---|---|
| Background image | Pexels (Stage 3) | Scene foundation and environment |
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
| `nano-banana-pro` | `/intelligence/skills/nano-banana-pro/SKILL.md` | 🔲 To create |
