import React, { useState } from 'react';
import ThumbnailCard from './ThumbnailCard';

export default function ThumbnailGrid({ results, isLoading }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (!isLoading && (!results || results.length === 0)) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888888', fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
        No results yet. Upload a photo and generate thumbnails to see variations.
      </div>
    );
  }

  // Render exactly 5 slots to match pipeline output requirements
  const slots = Array.from({ length: 5 });

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
      gap: '2rem',
      padding: '3rem',
      alignItems: 'start'
    }}>
      {slots.map((_, i) => (
        <ThumbnailCard 
          key={i}
          data={results && !results[i]?.error ? results[i] : null}
          error={results ? results[i]?.message : null}
          isSelected={selectedIndex === i}
          onSelect={() => setSelectedIndex(i)}
        />
      ))}
    </div>
  );
}
