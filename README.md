# ISTV Thumbnail Engine v3.0

Internal thumbnail generation tool for **Inside Success TV** production editors.

Upload a guest photo, fill a short form, and receive **5 distinct cinematic thumbnail variations** in under 60 seconds — composited at broadcast-standard 1280×720.

---

## How It Works

The pipeline runs through four stages automatically:

| Stage | Tool | What it does |
|---|---|---|
| 1 — Background Removal | @imgly | Strips the guest photo background → clean transparent PNG |
| 2 — Translation | Claude API | Reads the form data + style recipe → 5 compositor instruction objects |
| 3 — Background Fetch | Pexels API | Fetches 10 images in parallel — 5 scene backgrounds + 5 texture layers |
| 4a — Compositing | Gemini | Merges background + texture + guest + overlay → cinematic base image |
| 4b — Typography | Sharp | Adds name, EPISODE label, duration badge → final JPEG |

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd istv-thumbnail-engine
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=your_key_here
PEXELS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
PORT=3001
```

Get your keys from:
- Anthropic: [console.anthropic.com](https://console.anthropic.com)
- Pexels: [pexels.com/api](https://www.pexels.com/api/)
- Gemini: [aistudio.google.com](https://aistudio.google.com)

### 3. Run in development

```bash
npm run dev
```

Starts the Express server (port 3001) and Vite dev server (port 5173) concurrently.

Open: `http://localhost:5173`

### 4. Production build

```bash
npm run build    # compiles React frontend into app/client/dist/
npm run server   # serves frontend + API on port 3001
```

Open: `http://localhost:3001`

---

## Using the Tool

1. **Upload** a guest photo — JPG or PNG, drag and drop or click to browse
2. **Fill the form:**
   - Guest Name
   - Industry
   - Show
   - Style
   - Episode Duration (e.g. `22:53`)
3. **Click Generate Thumbnails**
4. **Select** one of the 5 returned variations
5. **Download** at 1280×720

In most cases, select the same show for both **Show** and **Style**. Mixing them is supported and intentional for creative variation.

---

## Shows

| Show | Slug |
|---|---|
| Legacy Makers | `legacy-makers` |
| Women in Power | `women-in-power` |
| Operation CEO | `operation-ceo` |
| America's Top Lawyers | `americas-top-lawyers` |
| America's Best Doctors | `americas-best-doctors` |
| Kingdom by Creator | `kingdom-by-creator` |
| Mompreneurs | `mompreneurs` |
| America's Top Trainers | `americas-top-trainers` |
| Builders of America | `builders-of-america` |
| America's Top Coaches | `americas-top-coaches` |
| Couple's Empire | `couples-empire` |
| America's Top Agents | `americas-top-agents` |

---

## Folder Structure

```
/
├── README.md
├── CLAUDE.md                    ← AI assistant instructions
├── package.json
├── .env                         ← API keys — never commit
│
├── /brand                       ← All visual identity
│   ├── istv-master.json         ← Master palette + font constants
│   ├── /shows                   ← Per-show JSON configs (12 active)
│   ├── /templates               ← Layout definitions: legacy, ornate, tactical
│   └── /assets
│       ├── /overlays            ← gold-frame, dark-vignette, floral-gold, etc.
│       ├── /badges              ← Per-show badge PNGs
│       └── /atmospherics        ← orange-sparks, anamorphic-flare, film-grain
│
├── /app
│   ├── /server                  ← Node.js + Express backend
│   │   ├── index.js
│   │   ├── api-handler.js       ← Pipeline orchestrator
│   │   ├── background-removal-handler.js
│   │   ├── claude-handler.js
│   │   ├── pexels-handler.js
│   │   ├── gemini-compositor-handler.js
│   │   └── sharp-typography-handler.js
│   └── /client                  ← React frontend (Vite)
│
├── /intelligence                ← AI prompt files + style recipes
│   ├── brand-identity-prompt.md
│   ├── compositor-prompt.md
│   ├── gemini-compositor-prompt.md
│   └── [show-slug].md           ← 12 show-specific style recipes
│
└── /output                      ← Saved thumbnail sessions
```

---

## Adding a New Show

1. Create `brand/shows/[show-slug].json` — copy an existing show as a base
2. Create `intelligence/[show-slug].md` — write the style recipe
3. Create `brand/assets/badges/[show-slug]-badge.png`
4. Add the show to both dropdowns in `app/client/src/components/InputForm.jsx`

See `brand/CONTEXT.md` for full field reference and `intelligence/CONTEXT.md` for style recipe format.

---

## Key Constraints

- Output is always **5 variations**
- Guest name typography is always handled by **Sharp** — never Gemini
- Gold `#C9A84C` must appear on every thumbnail
- Duration badge is always **bottom-right**
- All Pexels fetches and Gemini calls run **in parallel**
- Gemini generates **no text** — typography is SVG-only via Sharp
