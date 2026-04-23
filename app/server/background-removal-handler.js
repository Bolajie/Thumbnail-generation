const { removeBackground } = require('@imgly/background-removal-node');

/**
 * Stage 1: Background Removal Handler
 * @param {Object} params 
 * @param {string} params.photo - Base64 encoded image string
 * @returns {Promise<{ transparentPng: Buffer }>}
 */
async function processBackgroundRemoval({ photo }) {
  try {
    if (!photo) {
      throw new Error('Photo input is missing.');
    }

    // Strip the data:image prefix if it exists
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // @imgly/background-removal-node accepts a variety of inputs.
    // Uint8Array is standard for Node.js usage.
    const arrayBuffer = Uint8Array.from(imageBuffer);

    // Remove background
    const resultBlob = await removeBackground(arrayBuffer);
    
    // Convert Blob back to a Node Buffer
    const resultArrayBuffer = await resultBlob.arrayBuffer();
    const transparentPng = Buffer.from(resultArrayBuffer);

    return { transparentPng };
  } catch (error) {
    const stageError = new Error(`STAGE1_ERROR: Failed to remove background. ${error.message}`);
    stageError.stage = 'STAGE1_ERROR';
    throw stageError;
  }
}

module.exports = {
  processBackgroundRemoval
};
