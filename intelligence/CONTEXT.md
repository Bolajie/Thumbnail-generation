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

### Prompt files (created at build time — Prompt 3)

| File | Role |
|---|---|
| `compositor-prompt.md` | Master Claude prompt with all injection points |
| `cinematic-gold.md` | Style recipe — rich gold, dramatic, classic |
| `modern-corporate.md` | Style recipe — clean, professional, minimal |
| `gritty-action.md` | Style recipe — high contrast, intense, bold |
| `vibrant-tech.md` | Style recipe — bright, forward-looking, energetic |

### /skills

| Skill | File | Used by |
|---|---|---|
| `frontend-design` | `frontend-design/SKILL.md` | All React components in `/app/client` |
| `react-skill` | `react-skill/AGENTS.md` | React component generation patterns |
| `sharp-compositor` | `sharp-compositor/SKILL.md` | `sharp-compositor.js` |
| `pexels-api` | `pexels-api/SKILL.md` | `pexels-handler.js` |

---

## How the Compositor Prompt Works

`compositor-prompt.md` is a template with named injection points.
`claude-handler.js` loads it, fills in the placeholders, and sends
the assembled prompt to the Claude API.

**Injection points:**

| Placeholder | Source |
|---|---|
| `{{GUEST_NAME}}` | Form input |
| `{{INDUSTRY}}` | Form dropdown |
| `{{SHOW_PRESET}}` | JSON string from `/brand/shows/[show].json` |
| `{{STYLE_RECIPE}}` | Full text from `[style].md` in this folder |
| `{{DURATION}}` | Form input |

**Claude must return:** A raw JSON array of exactly 5 objects.
No preamble. No markdown fences. No explanation text.
If the response is not a parseable JSON array, `claude-handler.js`
must strip fences and retry once before throwing `STAGE2_ERROR`.

**Each object must contain:**
```json
{
  "pexelsQuery":   "string",
  "templateId":    "legacy | ornate | tactical",
  "colourGrade":   { "tint": "#hex", "opacity": 0.0 },
  "guestPosition": { "x": 0, "y": 0, "scale": 0.0, "anchor": "string" },
  "overlayList":   ["filename.png"],
  "textStyle":     { "fontSize": 0, "weight": "string", "colour": "#hex" }
}
```

---

## Style Recipe Format

Each style recipe is a short markdown file. Claude reads it as part of
the assembled prompt to differentiate the 5 variations it generates.

Each recipe must describe:
- Visual mood and atmosphere
- Pexels search direction — what kinds of backgrounds work
- Colour grade guidance — tint direction and darkness level
- Typography mood — scale, weight, colour feel
- Which template IDs pair best with this style

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
