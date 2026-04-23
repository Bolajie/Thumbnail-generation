# brand/CONTEXT.md — Placeholder
# brand/CONTEXT.md — Visual Identity Workspace
**Read this before touching any file in /brand**

---

## Purpose

This workspace is the single source of truth for all ISTV visual identity.
It defines how every thumbnail looks — colours, typography, layouts, overlays,
and per-show configurations. Nothing in /app or /intelligence should define
visual rules. All visual decisions live here.

---

## Process

1. Start with `istv-master.json` — it defines the base palette and font that
   every show inherits. Never change it without reviewing all 6 show presets.
2. Read the relevant show `.json` in `/shows` before editing any show config.
3. Read the relevant template `.json` in `/templates` before editing any layout.
4. Check `/assets` before creating new overlays — the asset may already exist.

---

## Files in This Workspace

### Root
- `istv-master.json` — Master palette (black/white/gold), Montserrat font config,
  base rules inherited by all shows. This is the foundation everything else builds on.

### /shows — Per-show preset configs
Each file defines: primary colour, accent colour, recommended template,
default overlay list, badge path, and Pexels keyword modifier.

| File | Show |
|---|---|
| `legacy-makers.json` | Legacy Makers |
| `women-in-power.json` | Women in Power |
| `operation-ceo.json` | Operation CEO |
| `office-lockdown.json` | Office Lockdown |
| `americas-top-lawyer.json` | America's Top Lawyer |
| `general-awards.json` | General / Awards |

### /templates — Compositor layout definitions
Each file defines guest position, text position, overlay list, colour grade
config, and badge position. The Sharp compositor reads these directly.

| File | ID | Layout |
|---|---|---|
| `legacy.json` | `legacy` | Guest centre-left full body, text lower-centre |
| `ornate.json` | `ornate` | Guest centre bust/3-quarter, gold frame, text lower-third |
| `tactical.json` | `tactical` | Guest right-aligned, text left-aligned |

### /assets — Static PNG library
All overlay and badge assets. Sharp composites these directly onto thumbnails.
Assets are referenced by filename — names must not change once in use.

**Overlays** (`/assets/overlays/`)
| File | Effect |
|---|---|
| `gold-frame.png` | Decorative gold border frame |
| `dark-vignette.png` | Edge darkening for depth |
| `floral-gold.png` | Ornate gold floral decoration |
| `geometric-lines.png` | Clean geometric line pattern |
| `light-rays.png` | Dramatic light ray effect |

**Badges** (`/assets/badges/`)
One per show. Composited into Layer 6 (show label area).
| File | Show |
|---|---|
| `legacy-makers-badge.png` | Legacy Makers |
| `women-in-power-badge.png` | Women in Power |
| `operation-ceo-badge.png` | Operation CEO |
| `office-lockdown-badge.png` | Office Lockdown |
| `americas-top-lawyer-badge.png` | America's Top Lawyer |
| `general-awards-badge.png` | General / Awards |

---

## ISTV Brand Constants (Never Change)

| Token | Value | Used for |
|---|---|---|
| Background | `#080808` | Canvas base, dark areas |
| Text primary | `#FFFFFF` | All guest name and label text |
| Gold rich | `#C9A84C` | Primary gold accent — must appear on every thumbnail |
| Gold light | `#E8C96B` | Secondary gold highlights |
| Gold deep | `#A07830` | Gold shadows and depth |
| Font | Montserrat | All typography — all weights — rendered via SVG in Sharp |
| Canvas size | 1280×720px | Output dimensions — always 16:9 |

---

## Template Layout Reference

| ID | Guest position | Text position | Best overlays | Best for |
|---|---|---|---|---|
| `legacy` | Centre-left, full body | Lower-centre | dark-vignette, gold divider | Legacy Makers, America's Top Lawyer |
| `ornate` | Centre, bust/3-quarter | Lower-third | gold-frame, floral-gold | Women in Power, General/Awards |
| `tactical` | Right-aligned | Left-aligned | geometric-lines, dark-vignette | Operation CEO, Office Lockdown |

---

## Industry → Pexels Keyword Map

Claude uses this as a starting point in Stage 2. It refines based on guest photo context and show preset.

| Industry | Base Pexels keywords |
|---|---|
| Real Estate | `luxury interior cinematic dark dramatic gold` |
| Corporate | `boardroom executive office high-rise dark` |
| Fitness | `gym cinematic dark dramatic lighting athlete` |
| Finance | `trading floor dark glass office city night` |
| Entertainment | `stage lights spotlight dark dramatic` |
| Legal | `courtroom law library dark authoritative` |
| Tech | `server room neon dark futuristic` |
| Wellness | `dramatic outdoor light golden hour editorial` |
| Other | `cinematic dark dramatic studio professional` |

---

## Adding a New Show

1. Create `[show-slug].json` in `/shows` — copy an existing show as base
2. Update: `showName`, `primaryColour`, `accentColour`, `recommendedTemplate`,
   `defaultOverlays`, `badgePath`, `pexelsKeywordModifier`
3. Create the badge PNG and save to `/assets/badges/[show-slug]-badge.png`
4. Update the badge reference in the new show `.json`
5. Add the show to the dropdown options in `/app/client/InputForm.jsx`
6. Update the show routing in `/app/server/claude-handler.js`

---

## What Good Looks Like

The creative benchmark is the **Verniese Moore** and **Taali Munjiyah**
thumbnails from ISTV Women in Power. Every decision — template choice,
overlay selection, colour grade — should pass this test:

> "Does this look like a graphic designer spent 4 hours on it?"

Cinematic. Layered. Premium. Not "AI art." Not generic.