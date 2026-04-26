import React, { useState, useEffect } from 'react';
import AssetUpload from './AssetUpload';
import InputForm from './InputForm';
import GenerateButton from './GenerateButton';
import ThumbnailGrid from './ThumbnailGrid';

export default function Dashboard() {
  const [photo, setPhoto] = useState(null);
  const [transparentPng, setTransparentPng] = useState(null);

  // Keep the Render free-tier server alive — ping every 8 minutes to prevent cold starts
  useEffect(() => {
    const ping = () => fetch(window.location.origin + '/api/health').catch(() => {});
    ping();
    const id = setInterval(ping, 8 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const [formData, setFormData] = useState({
    guestName: '',
    industry: '',
    show: '',
    style: '',
    duration: ''
  });
  const [loadingStage, setLoadingStage] = useState(0);
  const [results, setResults] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  const isFormComplete = photo && transparentPng !== undefined && formData.guestName && formData.industry && formData.show && formData.style && formData.duration;

  const handleGenerate = async () => {
    setLoadingStage(1);
    setGlobalError(null);
    setResults(null);
    
    try {
      // Setup mock API progress simulator for UI since we only interact with the backend over HTTP in production
      // In a real app this would hit `/api/generate` and potentially use SSE or WebSockets for stage updates.
      // We will simulate stage progress linearly before making the fetch request for simplicity in this pure React demo.
      
      const simulateProgress = async () => {
        setLoadingStage(1); await new Promise(r => setTimeout(r, 600));
        setLoadingStage(2); await new Promise(r => setTimeout(r, 800));
        setLoadingStage(3); await new Promise(r => setTimeout(r, 1000));
        setLoadingStage(4); await new Promise(r => setTimeout(r, 1500));
        setLoadingStage(5);
      };

      simulateProgress();

      // Wake server before the heavy request (guards against cold start mid-request)
      await fetch(window.location.origin + '/api/health').catch(() => {});

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000); // 3 min timeout

      let response;
      try {
        response = await fetch(window.location.origin + '/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo, transparentPng, ...formData }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.message || 'Pipeline failed to generate thumbnails.');
      }

      setResults(data.variations);
      setLoadingStage(0);
    } catch (err) {
      const msg = err.message || '';
      const isAbort = err.name === 'AbortError';
      const isNetworkCrash = msg.includes('Load failed') || msg.includes('expected pattern') || msg.includes('NetworkError') || msg.includes('Failed to fetch');
      setGlobalError(isAbort
        ? 'Generation timed out — the server may be warming up. Please try again.'
        : isNetworkCrash
          ? 'Server is busy or restarting — please wait 30 seconds and try again.'
          : msg);
      setLoadingStage(0);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#080808',
      color: '#FFFFFF'
    }}>
      {/* Editor Input Panel */}
      <div style={{
        width: '420px',
        background: '#111111',
        borderRight: '1px solid #1E1E1E',
        padding: '2.5rem',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        boxShadow: '4px 0 20px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{ 
          fontFamily: 'Montserrat, sans-serif', 
          fontSize: '22px', 
          margin: '0 0 2rem 0', 
          color: '#C9A84C',
          letterSpacing: '1px',
          fontWeight: 800
        }}>
          ISTV ENGINE <span style={{ color: '#080808', fontWeight: 'bold', fontSize: '11px', background: '#C9A84C', padding: '3px 6px', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px' }}>v2.1</span>
        </h1>
        
        <AssetUpload onUpload={({ original, transparent }) => {
          setPhoto(original);
          setTransparentPng(transparent);
        }} />
        <InputForm formData={formData} setFormData={setFormData} />
        
        <div style={{ flexGrow: 1 }} />
        
        <GenerateButton 
          onClick={handleGenerate} 
          disabled={!isFormComplete} 
          loadingStage={loadingStage}
          error={globalError}
        />
      </div>

      {/* Results Panel */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ThumbnailGrid results={results} isLoading={loadingStage > 0} />
      </div>
    </div>
  );
}
