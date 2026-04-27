# intelligence/CONTEXT.md — # intelligence/CONTEXT.md — Skills Workspace
**Read this before touching any file in /intelligence**

---

## Purpose

This workspace contains the skill files that govern how Claude Code implements
the pipeline, and the prompt files that control what the Claude API produces
at Stage 2. Skills live in `/skills`. Prompt files (compositor-prompt.md and
style recipes) are created by Claude Code at Prompt 3 and live directly in
this workspace.

---

## Files in This Workspace

### Prompt files

| File | Role |
|---|---|
| `brand-identity-prompt.md` | ISTV visual DNA — always in Gemini system prompt |
| `compositor-prompt.md` | Master Claude Stage 2 prompt with injection points |
| `gemini-compositor-prompt.md` | Master Gemini Stage 4a prompt with injection points |
| `legacy-makers.md` | Style recipe for Legacy Makers |
| `women-in-power.md` | Style recipe for Women in Power |
| `operation-ceo.md` | Style recipe for Operation CEO |
| `americas-top-lawyers.md` | Style recipe for America's Top Lawyers |
| `americas-best-doctors.md` | Style recipe for America's Best Doctors |
| `kingdom-by-creator.md` | Style recipe for Kingdom by Creator |
| `mompreneurs.md` | Style recipe for Mompreneurs |
| `americas-top-trainers.md` | Style recipe for America's Top Trainers |
| `builders-of-america.md` | Style recipe for Builders of America |
| `americas-top-coaches.md` | Style recipe for America's Top Coaches |
| `couples-empire.md` | Style recipe for Couple's Empire |
| `americas-top-agents.md` | Style recipe for America's Top Agents |

### /skills

| Skill | File | Used by |
|---|---|---|
| `frontend-design` | `frontend-design/SKILL.md` | All React components in `/app/client` |
| `react-skill` | `react-skill/AGENTS.md` | React component generation patterns |
| `sharp-compositor` | `sharp-compositor/SKILL.md` | `sharp-typography-handler.js` |
| `pexels-api` | `pexels-api/SKILL.md` | `pexels-handler.js` |
| `nano-banana-pro` | `nano-banana-pro/SKILL.md` | `gemini-compositor-handler.js` |

---

## How the Compositor Prompt Works

`compositor-prompt.md` is a template with named injection points.
`claude-handler.js` loads it and splits it across a system prompt (cached) and user message.

**System prompt (cached — `cache_control: { type: 'ephemeral' }`):**
- Brand identity (`brand-identity-prompt.md`)
- Show preset JSON from `/brand/shows/[show].json`

**User message injection points:**

| Placeholder | Source |
|---|---|
| `{{GUEST_NAME}}` | Form input |
| `{{INDUSTRY}}` | Form dropdown |
| `{{STYLE_RECIPE}}` | Full text from `[style].md` in this folder |
| `{{DURATION}}` | Form input |
| `{{BRAND_IDENTITY}}` | Replaced with empty string (content is in system prompt) |
| `{{SHOW_PRESET}}` | Replaced with empty string (content is in system prompt) |

**Claude must return:** A raw JSON array of exactly 5 objects.
No preamble. No markdown fences. No explanation text.
`claude-handler.js` strips fences and trailing commas before JSON.parse.

**Each object must contain:**
```json
{
  "pexelsQuery":        "string — primary background search",
  "pexelsQueryTexture": "string — abstract texture search for double-bagging",
  "templateId":         "legacy | ornate | tactical",
  "colourGrade":        { "tint": "#hex", "opacity": 0.0 },
  "guestPosition":      { "x": 0, "y": 0, "scale": 0.0, "anchor": "string" },
  "overlayAsset":       "filename.png",
  "moodAtmosphere":     "orange-sparks.png | anamorphic-flare.png | film-grain.png | none",
  "geminiPrompt":       "3-5 sentence creative brief for Gemini",
  "lightDirection":     "single phrase — e.g. 'upper-left dramatic side lighting'"
}
```

---

## How the Gemini Prompt Works

`gemini-compositor-prompt.md` is filled by `gemini-compositor-handler.js` per variation.

**Injection points:**

| Placeholder | Source |
|---|---|
| `{{BRAND_IDENTITY}}` | `brand-identity-prompt.md` |
| `{{SHOW_NAME}}` | `showPreset.showName` |
| `{{STYLE_RECIPE}}` | Full text from `[style].md` |
| `{{TEMPLATE_ID}}` | `instruction.templateId` |
| `{{TINT_COLOUR}}` | `instruction.colourGrade.tint` |
| `{{TINT_OPACITY}}` | `instruction.colourGrade.opacity` |
| `{{GUEST_POSITION}}` | `instruction.guestPosition` (JSON) |
| `{{GUEST_SCALE}}` | `instruction.guestPosition.scale` |
| `{{OVERLAY_BLEND}}` | Derived from overlay filename via BLEND_MODES map |
| `{{GOLD_COLOUR}}` | `showPreset.primaryColour` |
| `{{LIGHT_DIRECTION}}` | `instruction.lightDirection` |
| `{{BACKGROUND_DOMINANT_COLOR}}` | Extracted via Sharp `.stats()` on primary BG |
| `{{VARIATION_DESCRIPTION}}` | `instruction.geminiPrompt` |

---

## Style Recipe Format

Each style recipe is a show-specific markdown file. Slug must match the show slug
(e.g. `legacy-makers.md` for the `legacy-makers` show and style dropdown values).

Each recipe must describe:
- Visual mood and atmosphere
- Pexels search direction
- Colour grade guidance — tint direction and darkness level
- Rim light colour — specific hex or description
- Atmospheric treatment — which particle assets and how
- Gemini lighting direction — explicit instruction sentence
- Best template pairings

---

## Process

**To edit compositor-prompt.md or a style recipe:**
1. Read this file
2. Read `compositor-prompt.md` to understand the injection system
3. Edit the relevant file
4. Validate: Claude must still return exactly 5 valid JSON objects

**To edit a skill:**
1. Read this file
2. Read the relevant SKILL.md
3. Make the edit
4. Confirm the handler file that uses it still matches the updated spec
