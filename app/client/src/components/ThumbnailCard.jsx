import React from 'react';
import { saveAs } from 'file-saver';

export default function ThumbnailCard({ data, isSelected, onSelect, error }) {
  if (error) {
    return (
      <div style={{
        aspectRatio: '16/9',
        background: '#111111',
        border: '1px solid #ff4444',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff4444',
        fontFamily: 'Montserrat, sans-serif',
        padding: '1rem',
        textAlign: 'center',
        fontSize: '14px'
      }}>
        Failed: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        aspectRatio: '16/9',
        background: '#111111',
        borderRadius: '8px',
        border: '1px solid #1E1E1E',
        animation: 'pulse 2s infinite ease-in-out'
      }}>
        <style>{`
          @keyframes pulse {
            0% { background-color: #111111; border-color: #1E1E1E; }
            50% { background-color: #1a160d; border-color: rgba(201, 168, 76, 0.3); }
            100% { background-color: #111111; border-color: #1E1E1E; }
          }
        `}</style>
      </div>
    );
  }

  const handleDownload = (e) => {
    e.stopPropagation();
    saveAs(data.url, `istv-${data.templateId}-thumbnail.png`);
  };

  return (
    <div 
      onClick={onSelect}
      className="thumb-card"
      style={{
        aspectRatio: '16/9',
        background: '#080808',
        borderRadius: '8px',
        border: `2px solid ${isSelected ? '#C9A84C' : 'transparent'}`,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 0 20px rgba(201, 168, 76, 0.2)' : 'none'
      }}
    >
      <img src={data.url} alt="Thumbnail Variation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      
      <div className="thumb-overlay" style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(8, 8, 8, 0.85)',
        opacity: 0,
        transition: 'opacity 0.2s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem'
      }}>
        <p style={{ color: '#C9A84C', fontFamily: 'Montserrat, sans-serif', margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
          {data.templateId.toUpperCase()}
        </p>
        <p style={{ color: '#888', fontFamily: 'Montserrat, sans-serif', margin: '0 0 16px 0', fontSize: '12px', textAlign: 'center' }}>
          Style: {data.style} <br/>
          Photo by: {data.photographerCredit}
        </p>
        <button 
          onClick={handleDownload}
          style={{
            background: '#C9A84C',
            color: '#080808',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            fontFamily: 'Montserrat, sans-serif',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          Download PNG
        </button>
      </div>
      <style>{`
        .thumb-card:hover .thumb-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
