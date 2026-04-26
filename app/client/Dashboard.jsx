import React, { useState, useEffect, useRef } from 'react';
import AssetUpload from './AssetUpload';
import InputForm from './InputForm';
import GenerateButton from './GenerateButton';
import ThumbnailGrid from './ThumbnailGrid';

export default function Dashboard() {
  const [photo, setPhoto] = useState(null);
  const [transparentPng, setTransparentPng] = useState(null);
  const [formData, setFormData] = useState({ guestName: '', industry: '', show: '', style: '', duration: '' });
  const [loadingStage, setLoadingStage] = useState(0);
  const [results, setResults] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const resultsRef = useRef(null);

  // Keep Render free-tier server alive — ping every 8 minutes
  useEffect(() => {
    const ping = () => fetch(window.location.origin + '/api/health').catch(() => {});
    ping();
    const id = setInterval(ping, 8 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Scroll results into view on mobile when they arrive
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  const isFormComplete = (photo || transparentPng) && formData.guestName && formData.industry && formData.show && formData.style && formData.duration;

  const handleGenerate = async () => {
    setLoadingStage(1);
    setGlobalError(null);
    setResults(null);

    try {
      const simulateProgress = async () => {
        setLoadingStage(1); await new Promise(r => setTimeout(r, 600));
        setLoadingStage(2); await new Promise(r => setTimeout(r, 800));
        setLoadingStage(3); await new Promise(r => setTimeout(r, 1000));
        setLoadingStage(4); await new Promise(r => setTimeout(r, 1500));
        setLoadingStage(5);
      };
      simulateProgress();

      // Wait for server to be fully awake (handles Render free-tier cold starts)
      let serverReady = false;
      for (let i = 0; i < 12; i++) {
        try {
          const h = await fetch(window.location.origin + '/api/health');
          if (h.ok) { serverReady = true; break; }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 5000));
      }
      if (!serverReady) throw new Error('Server did not respond — please try again.');

      // Start the pipeline — returns jobId instantly
      const startRes = await fetch(window.location.origin + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo, transparentPng, ...formData })
      });
      if (!startRes.ok) throw new Error('Failed to start generation.');
      const { jobId } = await startRes.json();

      // Poll until complete — each poll is a fast <1s request, no iOS timeout issue
      let data = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes = await fetch(window.location.origin + '/api/jobs/' + jobId);
        const job = await pollRes.json();
        if (job.status === 'complete') { data = job.data; break; }
        if (job.status === 'failed')   throw new Error(job.error || 'Pipeline failed.');
        if (job.status === 'not_found') throw new Error('Server restarted during processing — please try again.');
      }
      if (!data) throw new Error('Generation timed out — please try again.');

      setResults(data.variations);
      setLoadingStage(0);
    } catch (err) {
      const msg = err.message || '';
      const isNetworkCrash = msg.includes('Load failed') || msg.includes('NetworkError') || msg.includes('Failed to fetch');
      setGlobalError(isNetworkCrash ? 'Server is warming up — please wait 30 seconds and try again.' : msg);
      setLoadingStage(0);
    }
  };

  return (
    <>
      <style>{`
        .istv-layout   { display: flex; flex-direction: row; min-height: 100vh; background: #080808; color: #fff; }
        .istv-sidebar  { width: 420px; min-width: 420px; background: #111; border-right: 1px solid #1E1E1E; padding: 2.5rem; display: flex; flex-direction: column; box-shadow: 4px 0 20px rgba(0,0,0,.5); }
        .istv-results  { flex: 1; overflow-y: auto; }
        @media (max-width: 768px) {
          .istv-layout  { flex-direction: column; }
          .istv-sidebar { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid #1E1E1E; box-shadow: 0 4px 20px rgba(0,0,0,.5); }
          .istv-results { flex: unset; }
        }
      `}</style>

      <div className="istv-layout">
        {/* Editor Input Panel */}
        <div className="istv-sidebar">
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', margin: '0 0 2rem 0', color: '#C9A84C', letterSpacing: '1px', fontWeight: 800 }}>
            ISTV ENGINE{' '}
            <span style={{ color: '#080808', fontWeight: 'bold', fontSize: '11px', background: '#C9A84C', padding: '3px 6px', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px' }}>v2.1</span>
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
        <div className="istv-results" ref={resultsRef}>
          <ThumbnailGrid results={results} isLoading={loadingStage > 0} />
        </div>
      </div>
    </>
  );
}
