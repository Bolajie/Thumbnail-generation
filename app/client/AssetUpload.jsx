import React, { useState, useCallback } from 'react';

// Resize a blob to max maxWidth pixels wide, preserving aspect ratio
async function resizeBlobToMax(blob, maxWidth) {
  const bitmap = await createImageBitmap(blob);
  const scale  = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width  * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function blobToDataUrl(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export default function AssetUpload({ onUpload }) {
  const [preview, setPreview]   = useState(null);
  const [error, setError]       = useState(null);
  const [removing, setRemoving] = useState(false);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG are allowed.');
      return;
    }
    setError(null);

    const originalUrl = await blobToDataUrl(file);
    setPreview(originalUrl);
    setRemoving(true);

    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const transparentBlob = await removeBackground(file, {
        model: 'small',
        output: { format: 'image/png' }
      });

      // Resize transparent PNG to max 1280px wide — keeps request body under ~1MB
      const resizedBlob    = await resizeBlobToMax(transparentBlob, 1280);
      const transparentUrl = await blobToDataUrl(resizedBlob);

      setPreview(transparentUrl);
      // Only pass transparent — server doesn't need the original when bg removal succeeded
      onUpload({ original: null, transparent: transparentUrl });
    } catch (err) {
      console.warn('Client bg removal failed, server will handle it:', err.message);
      // Pass original photo only as fallback for server-side removal
      onUpload({ original: originalUrl, transparent: null });
    } finally {
      setRemoving(false);
    }
  }, [onUpload]);

  return (
    <div
      style={{
        border: `2px dashed ${removing ? '#C9A84C' : '#1E1E1E'}`,
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
        background: '#111111',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
        transition: 'border-color 0.3s'
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {preview && (
        <img
          src={preview}
          alt="Preview"
          style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: removing ? 0.2 : 0.35 }}
        />
      )}
      <div style={{ zIndex: 1, position: 'relative' }}>
        {removing ? (
          <p style={{ color: '#C9A84C', fontFamily: 'Montserrat, sans-serif', margin: 0 }}>
            Removing background…
          </p>
        ) : (
          <>
            <p style={{ color: '#888888', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
              {preview ? '✓ Photo ready' : 'Drag & drop guest photo here'}
            </p>
            <input
              type="file"
              accept="image/jpeg, image/png"
              onChange={handleDrop}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              style={{
                background: '#1E1E1E',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                display: 'inline-block'
              }}
            >
              {preview ? 'Change Photo' : 'Browse Files'}
            </label>
            {error && <p style={{ color: '#ff4444', marginTop: '1rem', fontFamily: 'Montserrat, sans-serif' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
