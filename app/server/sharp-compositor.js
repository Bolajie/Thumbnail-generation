'use strict';

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const CANVAS_W = 1280;
const CANVAS_H = 720;
const GOLD     = '#C9A84C';

// ─── Errors ───────────────────────────────────────────────────────────────────

function stageError(layer, message, originalError) {
  const err = new Error(message);
  err.stage = 4;
  err.code  = 'STAGE4_ERROR';
  err.layer = layer;
  if (originalError) err.originalError = originalError;
  return err;
}

// ─── SVG utilities ────────────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

function svgAnchor(align) {
  if (align === 'center') return 'middle';
  if (align === 'right')  return 'end';
  return 'start';
}

// X coordinate for text element — centres within zone for center-aligned templates
function resolveTextX(tp) {
  if (tp.align === 'center') return tp.x + Math.round((tp.maxWidth || tp.width) / 2);
  return tp.x;
}

function svgOpen()  { return `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">`; }
function svgClose() { return `</svg>`; }

// ─── Layer 2: colour grade tint ───────────────────────────────────────────────

function buildTintSvg(tint, opacity) {
  return Buffer.from(
    svgOpen() +
    `<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${tint}" opacity="${opacity}"/>` +
    svgClose()
  );
}

// ─── Layer 4: guest name SVG — sandwich BOTTOM (rendered behind guest PNG) ────
//
// The sandwich method: this SVG sits below the guest cutout (layer 5).
// Where the guest body is opaque it covers the text. Where the guest PNG
// is transparent the text shows through onto the background. This creates
// the depth illusion that the guest is standing in front of their own name.

function buildGuestNameSvg(guestName, tp, textStyle) {
  const x      = resolveTextX(tp);
  const y      = tp.guestNameY;
  const anchor = svgAnchor(tp.align);

  return Buffer.from(
    svgOpen() +
    `<text ` +
      `x="${x}" y="${y}" ` +
      `font-family="Montserrat, sans-serif" ` +
      `font-size="${textStyle.fontSize}" ` +
      `font-weight="${textStyle.weight}" ` +
      `fill="${textStyle.colour}" ` +
      `text-anchor="${anchor}"` +
    `>${escapeXml(guestName)}</text>` +
    svgClose()
  );
}

// ─── Layer 6: show title + gold accent element + duration stamp ───────────────
//
// The gold accent type is derived from which key exists in the template config:
//   goldDividerY   → horizontal rule (legacy)
//   goldUnderlineY → underline beneath show title (ornate)
//   goldBarX       → vertical bar beside text block (tactical)

function buildLabelsSvg(showPreset, duration, tp) {
  const tx     = resolveTextX(tp);
  const anchor = svgAnchor(tp.align);
  const ds     = tp.durationStamp;

  let body = '';

  // Show title
  body +=
    `<text ` +
      `x="${tx}" y="${tp.y}" ` +
      `font-family="Montserrat, sans-serif" ` +
      `font-size="${tp.showTitleSize}" ` +
      `font-weight="${tp.showTitleWeight}" ` +
      `fill="${tp.showTitleColour || GOLD}" ` +
      `text-anchor="${anchor}"` +
    `>${escapeXml(showPreset.showName)}</text>`;

  // Gold accent — horizontal divider (legacy template)
  if (tp.goldDividerY != null) {
    const rx = tp.align === 'center'
      ? Math.round(CANVAS_W / 2 - tp.goldDividerWidth / 2)
      : tp.x;
    body +=
      `<rect ` +
        `x="${rx}" y="${tp.goldDividerY}" ` +
        `width="${tp.goldDividerWidth}" height="${tp.goldDividerHeight}" ` +
        `fill="${tp.goldDividerColour || GOLD}"` +
      `/>`;
  }

  // Gold accent — underline (ornate template)
  if (tp.goldUnderlineY != null) {
    const rx = tp.align === 'center'
      ? Math.round(CANVAS_W / 2 - tp.goldUnderlineWidth / 2)
      : tp.x;
    body +=
      `<rect ` +
        `x="${rx}" y="${tp.goldUnderlineY}" ` +
        `width="${tp.goldUnderlineWidth}" height="${tp.goldUnderlineHeight}" ` +
        `fill="${tp.goldUnderlineColour || GOLD}"` +
      `/>`;
  }

  // Gold accent — vertical bar (tactical template)
  if (tp.goldBarX != null) {
    body +=
      `<rect ` +
        `x="${tp.goldBarX}" y="${tp.goldBarY}" ` +
        `width="${tp.goldBarWidth}" height="${tp.goldBarHeight}" ` +
        `fill="${tp.goldBarColour || GOLD}"` +
      `/>`;
  }

  // Duration stamp — always reserved bottom-right
  body +=
    `<text ` +
      `x="${ds.x}" y="${ds.y}" ` +
      `font-family="Montserrat, sans-serif" ` +
      `font-size="${ds.size}" ` +
      `font-weight="${ds.weight}" ` +
      `fill="${ds.colour || GOLD}" ` +
      `text-anchor="end"` +
    `>${escapeXml(duration)}</text>`;

  return Buffer.from(svgOpen() + body + svgClose());
}

// ─── Guest PNG sizing and placement ──────────────────────────────────────────

async function buildResizedGuest(transparentGuestPng, tmplGuest, instrGuest) {
  const w = Math.round(tmplGuest.width  * instrGuest.scale);
  const h = Math.round(tmplGuest.height * instrGuest.scale);

  const resized = await sharp(transparentGuestPng)
    .resize(w, h, {
      fit:        'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const left = Math.max(0, tmplGuest.x + instrGuest.x);
  const top  = tmplGuest.verticalAlign === 'bottom'
    ? Math.max(0, CANVAS_H - h + instrGuest.y)
    : Math.max(0, tmplGuest.y + instrGuest.y);

  return { buffer: resized, left, top };
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function compositeVariant({
  backgroundBuffer,
  transparentGuestPng,
  instruction,
  templateConfig,
  overlayPaths,
  showPreset,
  guestName,
  duration,
}) {
  const { colourGrade, guestPosition: instrGuest, overlayList, textStyle } = instruction;
  const { guestPosition: tmplGuest, textPosition: tp }                     = templateConfig;

  const composites = [];

  // ── Layer 2: colour grade tint ────────────────────────────────────────────
  try {
    composites.push({
      input: buildTintSvg(colourGrade.tint, colourGrade.opacity),
      top: 0, left: 0,
    });
  } catch (err) {
    throw stageError(2, `Colour grade tint build failed: ${err.message}`, err);
  }

  // ── Layer 3: decorative overlay PNGs ─────────────────────────────────────
  for (const filename of overlayList) {
    const overlayPath = overlayPaths.find(p => path.basename(p) === filename);
    if (!overlayPath) continue; // asset not yet provided — skip without error
    try {
      composites.push({ input: overlayPath, top: 0, left: 0 });
    } catch (err) {
      throw stageError(3, `Overlay "${filename}" failed to load: ${err.message}`, err);
    }
  }

  // ── Layer 4: guest name SVG — sandwich BOTTOM ─────────────────────────────
  try {
    composites.push({
      input: buildGuestNameSvg(guestName, tp, textStyle),
      top: 0, left: 0,
    });
  } catch (err) {
    throw stageError(4, `Guest name SVG build failed: ${err.message}`, err);
  }

  // ── Layer 5: transparent guest PNG — sandwich TOP ─────────────────────────
  let guestPlacement;
  try {
    guestPlacement = await buildResizedGuest(transparentGuestPng, tmplGuest, instrGuest);
  } catch (err) {
    throw stageError(5, `Guest PNG resize failed: ${err.message}`, err);
  }
  composites.push({
    input: guestPlacement.buffer,
    left:  guestPlacement.left,
    top:   guestPlacement.top,
  });

  // ── Layer 6: show label + gold accent + duration stamp ────────────────────
  try {
    composites.push({
      input: buildLabelsSvg(showPreset, duration, tp),
      top: 0, left: 0,
    });
  } catch (err) {
    throw stageError(6, `Labels SVG build failed: ${err.message}`, err);
  }

  // ── Layer 6 (badge): show badge PNG — skipped if asset not yet on disk ────
  if (showPreset.badgePath) {
    const badgeAbs = path.resolve(__dirname, '../..', showPreset.badgePath);
    if (fs.existsSync(badgeAbs)) {
      const bp = templateConfig.badgePosition;
      try {
        const badgeBuffer = await sharp(badgeAbs)
          .resize(bp.width, bp.height, {
            fit:        'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();
        composites.push({ input: badgeBuffer, left: bp.x, top: bp.y });
      } catch (err) {
        throw stageError(6, `Show badge "${showPreset.badgePath}" failed: ${err.message}`, err);
      }
    }
  }

  // ── Layer 1 + final composite: background resized to 1280×720 ────────────
  try {
    return await sharp(backgroundBuffer)
      .resize(CANVAS_W, CANVAS_H, { fit: 'cover', position: 'centre' })
      .composite(composites)
      .png()
      .toBuffer();
  } catch (err) {
    throw stageError(1, `Sharp final composite failed: ${err.message}`, err);
  }
}

module.exports = { compositeVariant };
