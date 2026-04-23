# output/CONTEXT.md — Placeholder
# outputs/CONTEXT.md — Outputs Workspace
**Read this before adding or managing files in /outputs**

---

## Purpose

This workspace stores saved thumbnail generation sessions.
It is a record — not an active workspace. Nothing here affects
the pipeline. Claude Code does not write here during builds.

---

## File Naming Convention

Every saved session follows this pattern:

```
[guest-slug]-[YYYYMMDD]-[variant].png
```

| Part | Format | Example |
|---|---|---|
| Guest slug | lowercase, hyphens | `jane-smith` |
| Date | YYYYMMDD | `20260419` |
| Variant | v1–v5 | `v3` |

**Full example:** `jane-smith-20260419-v3.png`

---

## Session Folder Structure

Group outputs by date when volume grows:

```
/outputs
  /2026-04
    jane-smith-20260419-v3.png
    john-doe-20260419-v1.png
  /2026-05
    ...
```

---

## What Lives Here

- Final selected thumbnails downloaded by editors
- Nothing else — no drafts, no working files, no logs

---

## What Does Not Live Here

- Pipeline logs → these stay server-side
- Rejected variations → not saved, discarded after session
- Source photos → never stored, processed in memory only