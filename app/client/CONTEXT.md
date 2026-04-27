# app/client/CONTEXT.md — Placeholder
# app/client/CONTEXT.md — Frontend Workspace
**Read this before touching any file in /app/client**

---

## Purpose

This workspace contains the React frontend — the editor-facing dashboard
where ISTV production editors upload a guest photo, fill the form, trigger
the pipeline, and download the output thumbnails. It is an internal tool,
not a public product. The UI must reflect ISTV's premium brand standard.

---

## Process

1. Read this file and `/intelligence/skills/frontend-design/SKILL.md` before
   editing any component.
2. Identify which component owns the change — edit only that component.
3. Never apply brand colours or font outside of what is defined in the
   brand constants below.
4. All API calls go through a single `api.js` service file — never fetch
   directly from a component.
5. `Dashboard.jsx` is the root layout — do not add logic here, only composition.

---

## Files in This Workspace

| File | Role |
|---|---|
| `Dashboard.jsx` | Root layout — two-panel composition, no logic |
| `AssetUpload.jsx` | Drag & drop photo upload with base64 conversion and preview |
| `InputForm.jsx` | All form fields with correct dropdowns |
| `GenerateButton.jsx` | Triggers pipeline, disabled without photo, stage progress labels |
| `ThumbnailGrid.jsx` | 5-card result grid with gold skeleton loading |
| `ThumbnailCard.jsx` | Single result card — image, select, download, hover metadata |

---

## Component Map

```
Dashboard.jsx
├── Left panel — Editor input
│   ├── AssetUpload.jsx       ← Drag & drop, preview, base64 state
│   ├── InputForm.jsx         ← All dropdowns + text fields
│   └── GenerateButton.jsx    ← Submit + stage progress display
└── Right panel — Results
    └── ThumbnailGrid.jsx
        └── ThumbnailCard.jsx ×5
```

---

## Component Specs

### AssetUpload.jsx
- Drag & drop zone — accepts JPG and PNG only
- On drop/select: convert to base64, store in state, show preview
- Preview: full-width image of uploaded photo, cropped to 16:9 aspect
- State passed up to Dashboard: `{ photo: base64string | null }`
- Error state: show message if file type is invalid

### InputForm.jsx
All fields required. No submit without all fields filled.

| Field | Type | Options |
|---|---|---|
| Guest Name | Text input | Free text |
| Industry | Dropdown | Finance, Real Estate, Fitness, Corporate, Entertainment, Wellness, Legal, Tech, Other |
| Show | Dropdown | Legacy Makers, Women in Power, Operation CEO, America's Top Lawyers, America's Best Doctors, Kingdom by Creator, Mompreneurs, America's Top Trainers, Builders of America, America's Top Coaches, Couple's Empire, America's Top Agents |
| Style | Dropdown | Same 12 options as Show — select the matching show style or cross-show for creative mixing |
| Episode Duration | Text input | e.g. 22:53 |

### GenerateButton.jsx
- Disabled state: when `photo === null` — show "Upload a photo to continue"
- Active state: gold button — "Generate Thumbnails"
- Loading state: replaced by stage progress labels in sequence:
  1. "Removing background..."
  2. "Building variations..."
  3. "Fetching backgrounds..."
  4. "Compositing thumbnails..."
- Error state: show stage-specific error message returned from API

### ThumbnailGrid.jsx
- Renders 5 `ThumbnailCard` components
- Loading state: 5 gold skeleton cards (pulsing animation)
- Partial failure: render available cards, show error slot for failed ones
- No card is selected by default

### ThumbnailCard.jsx
- Displays: composited PNG at 16:9 ratio
- Hover: shows variation metadata (template ID, style, pexels query used)
- Selected state: gold border highlight
- Download button: triggers PNG download via FileSaver.js
- Only one card can be selected at a time (controlled from ThumbnailGrid)

---

## ISTV Brand Applied to UI

| Element | Value |
|---|---|
| Page background | `#080808` |
| Panel background | `#111111` |
| Border / divider | `#1E1E1E` |
| Primary text | `#FFFFFF` |
| Secondary text | `#888888` |
| Gold accent | `#C9A84C` |
| Gold hover | `#E8C96B` |
| Font | Montserrat (import from Google Fonts) |
| Border radius | 8px — cards and inputs |
| Button style | Solid gold background, black text, Montserrat medium |
| Skeleton loader | `#1E1E1E` base with `#C9A84C` shimmer |

---

## Skills to Use

- `/intelligence/skills/frontend-design/SKILL.md` — Read before writing any
  component. Governs layout patterns, spacing, interaction states, and
  component composition rules.

---

## What Good Looks Like

The dashboard should feel like a premium internal broadcast tool — dark,
clean, gold-accented. Not a generic SaaS form. Not "AI tool aesthetic."
An editor opening this should feel like they are working in a professional
production environment. Every interaction — hover, select, download — should
feel deliberate and considered.

