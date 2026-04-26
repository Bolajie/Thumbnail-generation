const sharp = require('sharp');

const GRADIENT_PALETTES = [
  { stop1: '#0a0a1a', stop2: '#1a0a2e', accent: '#C9A84C' },
  { stop1: '#0a1a0a', stop2: '#0d1f2d', accent: '#C9A84C' },
  { stop1: '#1a0a0a', stop2: '#2d1a0d', accent: '#C9A84C' },
  { stop1: '#0a0a0a', stop2: '#1a1a2e', accent: '#C9A84C' },
  { stop1: '#0d0a1a', stop2: '#1a0d2e', accent: '#C9A84C' },
];

async function generateFallbackBackground(index) {
  const palette = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
  const svg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette.stop1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${palette.stop2};stop-opacity:1" />
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="50%" r="60%">
          <stop offset="0%" style="stop-color:${palette.accent};stop-opacity:0.12" />
          <stop offset="100%" style="stop-color:${palette.stop2};stop-opacity:0" />
        </radialGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)" />
      <rect width="1280" height="720" fill="url(#glow)" />
    </svg>`;

  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  return { buffer, photographer: null };
}

const processPexelsStage = async (queries) => {
  if (!Array.isArray(queries) || queries.length !== 5) {
    throw new Error('STAGE3_ERROR: Expected an array of exactly 5 Pexels queries.');
  }

  const fetchPexelsImage = async (query, index, isFallback = false) => {
    try {
      const searchQuery = isFallback ? 'cinematic dark background' : query;
      const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&orientation=landscape&size=large&per_page=1`;

      const response = await fetch(pexelsUrl, {
        headers: {
          'Authorization': process.env.PEXELS_API_KEY,
          'Referer': 'https://insidesuccess.tv'
        }
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.photos || data.photos.length === 0) {
        if (!isFallback) return fetchPexelsImage(query, index, true);
        throw new Error('No images found even with fallback query.');
      }

      const photo = data.photos[0];
      const imageUrl = photo.src.large || photo.src.original;
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error(`Failed to download Pexels image: ${imageResponse.statusText}`);

      const arrayBuffer = await imageResponse.arrayBuffer();
      return { buffer: Buffer.from(arrayBuffer), photographer: photo.photographer };

    } catch (error) {
      // Pexels failed — use a generated gradient background so the pipeline continues
      console.warn(`[Stage 3] Pexels unavailable for query ${index + 1} — using gradient fallback.`);
      return generateFallbackBackground(index);
    }
  };

  const results = await Promise.all(queries.map((q, i) => fetchPexelsImage(q, i)));
  return results;
};

module.exports = { processPexelsStage };
