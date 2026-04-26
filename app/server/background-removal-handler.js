const { removeBackground } = require('@imgly/background-removal-node');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

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

    // Write to a temp file — @imgly resolves format from file path reliably
    const tmpPath = path.join(os.tmpdir(), `istv-guest-${Date.now()}.jpg`);
    await fs.writeFile(tmpPath, imageBuffer);

    // Remove background — isnet_quint8 uses ~75% less RAM than the default isnet model
    const resultBlob = await removeBackground(tmpPath, {
      model: 'isnet_quint8',
      output: { format: 'image/png' }
    });
    await fs.unlink(tmpPath).catch(() => {});
    
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
