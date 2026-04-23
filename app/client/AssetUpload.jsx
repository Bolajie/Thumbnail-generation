import React, { useState, useCallback } from 'react';

export default function AssetUpload({ onUpload }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG are allowed.');
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      onUpload(reader.result);
    };
    reader.readAsDataURL(file);
  }, [onUpload]);

  return (
    <div 
      style={{
        border: '2px dashed #1E1E1E',
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
        marginBottom: '2rem'
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {preview && (
        <img 
          src={preview} 
          alt="Preview" 
          style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} 
        />
      )}
      <div style={{ zIndex: 1, position: 'relative' }}>
        <p style={{ color: '#888888', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
          Drag & drop guest photo here
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
          Browse Files
        </label>
        {error && <p style={{ color: '#ff4444', marginTop: '1rem', fontFamily: 'Montserrat, sans-serif' }}>{error}</p>}
      </div>
    </div>
  );
}
