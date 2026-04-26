const processPexelsStage = async (queries) => {
  if (!Array.isArray(queries) || queries.length !== 5) {
    throw new Error('STAGE3_ERROR: Expected an array of exactly 5 Pexels queries.');
  }

  const fetchPexelsImage = async (query, isFallback = false) => {
    try {
      // Fallback query based on generic cinematic style if initial search fails
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
        if (!isFallback) {
          // Attempt fallback search
          return fetchPexelsImage(query, true);
        } else {
          throw new Error('No images found even with fallback query.');
        }
      }

      const photo = data.photos[0];
      // Prefer large size or fallback to original
      const imageUrl = photo.src.large || photo.src.original;

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image from Pexels URL: ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      
      return {
        buffer: Buffer.from(arrayBuffer),
        photographer: photo.photographer
      };
    } catch (error) {
      const stageError = new Error(`STAGE3_ERROR: Failed on query "${query}" - ${error.message}`);
      stageError.stage = 'STAGE3_ERROR';
      stageError.query = query;
      throw stageError;
    }
  };

  try {
    // Run all 5 image fetches in parallel via Promise.all
    const results = await Promise.all(queries.map(q => fetchPexelsImage(q)));
    return results;
  } catch (error) {
    throw error; 
  }
};

module.exports = {
  processPexelsStage
};
