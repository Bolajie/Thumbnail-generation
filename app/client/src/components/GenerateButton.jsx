import React from 'react';

export default function GenerateButton({ onClick, disabled, loadingStage, error }) {
  const getStageLabel = () => {
    switch(loadingStage) {
      case 1: return "Removing background...";
      case 2: return "Building variations...";
      case 3: return "Fetching backgrounds...";
      case 4: return "Compositing with Gemini...";
      case 5: return "Adding typography...";
      default: return "Generating...";
    }
  };

  return (
    <div style={{ marginTop: 'auto' }}>
      {error && (
        <div style={{ color: '#ff4444', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
          {error}
        </div>
      )}
      
      <button
        onClick={onClick}
        disabled={disabled || loadingStage > 0}
        style={{
          width: '100%',
          background: disabled && loadingStage === 0 ? '#333333' : '#C9A84C',
          color: disabled && loadingStage === 0 ? '#888888' : '#080808',
          padding: '16px',
          border: 'none',
          borderRadius: '8px',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 'bold',
          fontSize: '16px',
          cursor: disabled || loadingStage > 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease-in-out',
          opacity: loadingStage > 0 ? 0.8 : 1
        }}
      >
        {loadingStage > 0 ? getStageLabel() : "Generate Thumbnails"}
      </button>
      
      {disabled && loadingStage === 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '12px', fontSize: '14px', fontFamily: 'Montserrat, sans-serif' }}>
          Upload a photo to continue
        </p>
      )}
    </div>
  );
}
