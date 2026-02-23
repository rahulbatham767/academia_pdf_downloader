'use client';

import { useState, useRef, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocMeta {
  title: string;
  description: string;
  author: string;
  thumbnail: string;
}

type AppState = 'idle' | 'fetching-meta' | 'preview' | 'downloading' | 'done' | 'error';

// ─── Particle Component ───────────────────────────────────────────────────────

function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Ambient orbs */}
      <div
        className="orb"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
          top: '-100px',
          right: '-100px',
          animationDuration: '10s',
        }}
      />
      <div
        className="orb"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(196,82,42,0.04) 0%, transparent 70%)',
          bottom: '10%',
          left: '-50px',
          animationDuration: '13s',
          animationDelay: '-4s',
        }}
      />
      <div
        className="orb"
        style={{
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)',
          top: '40%',
          left: '40%',
          animationDuration: '7s',
          animationDelay: '-2s',
        }}
      />

      {/* Geometric grid */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.03 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#c9a84c" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ active }: { active: boolean }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      {active && (
        <div
          className="h-full progress-bar"
          style={{
            animation: 'progress-fill 90s linear forwards',
          }}
        />
      )}
      <style>{`
        @keyframes progress-fill {
          from { width: 0%; }
          to { width: 95%; }
        }
      `}</style>
    </div>
  );
}

// ─── PDF Preview Card ─────────────────────────────────────────────────────────

function PdfPreview({
  meta,
  url,
  base64,
  onDownload,
  downloading,
}: {
  meta: DocMeta;
  url: string;
  base64: string | null;
  onDownload: () => void;
  downloading: boolean;
}) {
  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  })();

  return (
    <div
      className="reveal-up w-full max-w-4xl mx-auto"
      style={{ animationDelay: '0.1s' }}
    >
      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* Header strip */}
        <div
          className="px-6 py-3 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}
        >
          <div className="flex gap-2">
            {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div
            className="flex-1 text-center font-mono text-xs truncate"
            style={{ color: 'rgba(245,240,232,0.4)' }}
          >
            {url}
          </div>
          <div
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: 'rgba(201,168,76,0.1)',
              color: 'var(--gold)',
              border: '1px solid rgba(201,168,76,0.2)',
            }}
          >
            {domain}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-col md:flex-row gap-0">
          {/* Thumbnail / PDF preview */}
          <div
            className="md:w-72 flex-shrink-0 flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.04), rgba(10,10,15,0.8))',
              borderRight: '1px solid rgba(201,168,76,0.1)',
              minHeight: '280px',
            }}
          >
            {meta.thumbnail ? (
              <img
                src={meta.thumbnail}
                alt={meta.title}
                className="w-full h-full object-cover"
                style={{ opacity: 0.85 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="flex flex-col items-center gap-4" style={{ color: 'rgba(245,240,232,0.2)' }}>
                {/* PDF icon */}
                <svg width="80" height="100" viewBox="0 0 80 100" fill="none">
                  <rect x="1" y="1" width="78" height="98" rx="6" stroke="rgba(201,168,76,0.3)" strokeWidth="1.5" fill="rgba(201,168,76,0.03)" />
                  <path d="M20 1 L20 25 L60 25" stroke="rgba(201,168,76,0.3)" strokeWidth="1.5" fill="none" />
                  <rect x="1" y="1" width="19" height="24" rx="6" fill="rgba(10,10,15,0.5)" />
                  <path d="M20 1 L1 25 L20 25 Z" fill="rgba(201,168,76,0.1)" />
                  <rect x="12" y="38" width="56" height="4" rx="2" fill="rgba(201,168,76,0.15)" />
                  <rect x="12" y="48" width="56" height="4" rx="2" fill="rgba(201,168,76,0.1)" />
                  <rect x="12" y="58" width="40" height="4" rx="2" fill="rgba(201,168,76,0.1)" />
                  <rect x="12" y="72" width="56" height="4" rx="2" fill="rgba(201,168,76,0.08)" />
                  <rect x="12" y="82" width="30" height="4" rx="2" fill="rgba(201,168,76,0.08)" />
                  <text x="8" y="22" fontFamily="monospace" fontSize="9" fill="rgba(201,168,76,0.5)">PDF</text>
                </svg>
                <p className="text-xs font-mono" style={{ color: 'rgba(245,240,232,0.2)' }}>No preview available</p>
              </div>
            )}

            {/* Overlay gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, transparent 60%, rgba(10,10,15,0.8))',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Metadata */}
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div>
              {meta.author && (
                <p
                  className="text-xs font-mono uppercase tracking-widest mb-3"
                  style={{ color: 'var(--gold)', opacity: 0.7 }}
                >
                  {meta.author}
                </p>
              )}
              <h2
                className="font-display text-2xl md:text-3xl leading-tight mb-4"
                style={{ color: 'var(--paper)', fontWeight: 700 }}
              >
                {meta.title}
              </h2>
              {meta.description && (
                <p
                  className="text-sm leading-relaxed line-clamp-4"
                  style={{ color: 'rgba(245,240,232,0.5)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {meta.description}
                </p>
              )}
            </div>

            {/* Action area */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Download button */}
              <button
                onClick={onDownload}
                disabled={downloading}
                className="btn-primary rounded-xl px-8 py-4 text-sm font-semibold flex items-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
                    </svg>
                    Processing PDF...
                  </>
                ) : base64 ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Save PDF
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>

              {/* Ready indicator */}
              {base64 && !downloading && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#28c840', boxShadow: '0 0 8px #28c840' }}
                  />
                  <span className="text-xs font-mono" style={{ color: 'rgba(245,240,232,0.4)' }}>
                    Ready to download
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Embedded PDF iframe preview if base64 is ready */}
        {base64 && (
          <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
            <div
              className="px-6 py-3 flex items-center justify-between"
              style={{ background: 'rgba(201,168,76,0.03)' }}
            >
              <span className="text-xs font-mono" style={{ color: 'rgba(245,240,232,0.3)' }}>
                ▸ DOCUMENT PREVIEW
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--gold)', opacity: 0.6 }}>
                Scroll to explore
              </span>
            </div>
            <iframe
              src={base64}
              className="w-full pdf-frame"
              style={{ height: '600px', display: 'block', background: '#fff' }}
              title="PDF Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<AppState>('idle');
  const [meta, setMeta] = useState<DocMeta | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('document.pdf');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Mouse-tracking 3D tilt for the main card
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
      card.style.transform = `perspective(1000px) rotateX(${y}deg) rotateY(${x}deg) translateZ(10px)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const isValidUrl = (val: string) => {
    try {
      const u = new URL(val);
      return u.hostname.includes('academia.edu') || u.hostname.includes('scribd.com');
    } catch {
      return false;
    }
  };

  const handleFetch = async () => {
    if (!isValidUrl(url)) {
      setError('Please enter a valid Academia.edu or Scribd URL.');
      setState('error');
      return;
    }

    setError('');
    setBase64(null);
    setMeta(null);
    setState('fetching-meta');

    // Quick metadata prefetch
    try {
      const metaRes = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`);
      const metaData = await metaRes.json();
      if (metaData.success && metaData.meta) {
        setMeta(metaData.meta);
        setState('preview');
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        // Still show preview with placeholder meta
        setMeta({ title: 'Document', description: '', author: '', thumbnail: '' });
        setState('preview');
      }
    } catch {
      setMeta({ title: 'Document', description: '', author: '', thumbnail: '' });
      setState('preview');
    }
  };

  const handleDownload = async () => {
    if (base64) {
      // Already fetched — just trigger download
      triggerDownload(base64, fileName);
      return;
    }

    setState('downloading');

    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch document');
      }

      const fn = `${data.fileName || 'document'}.pdf`;
      setFileName(fn);

      if (data.meta) {
        setMeta(prev => ({ ...prev, ...data.meta }));
      }

      setBase64(data.base64);
      setState('done');

      // Auto-trigger download
      triggerDownload(data.base64, fn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      setState('error');
    }
  };

  const triggerDownload = (b64: string, name: string) => {
    const link = document.createElement('a');
    link.href = b64;
    link.download = name.endsWith('.pdf') ? name : `${name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setState('idle');
    setUrl('');
    setMeta(null);
    setBase64(null);
    setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const isLoading = state === 'fetching-meta' || state === 'downloading';
  const showPreview = state === 'preview' || state === 'downloading' || state === 'done';

  return (
    <>
      <div className="scan-line" />
      <ProgressBar active={isLoading} />
      <Particles />

      <div className="relative min-h-screen flex flex-col" style={{ zIndex: 1 }}>

        {/* ── Hero ── */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-10">

          {/* Logo & headline */}
          <div className="text-center mb-12 reveal-up">
            {/* Logo mark */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div
                className="relative"
                style={{
                  width: 52,
                  height: 52,
                  background: 'linear-gradient(135deg, var(--gold), #7a5c20)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(10,10,15,0.9)" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </div>
              <div className="text-left">
                <div
                  className="font-display font-black text-2xl"
                  style={{ color: 'var(--paper)', letterSpacing: '-0.02em', lineHeight: 1 }}
                >
                  AcademiaPDF
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--gold)', opacity: 0.7, letterSpacing: '0.1em' }}>
                  RESEARCH DOWNLOADER
                </div>
              </div>
            </div>

            <h1
              className="font-display font-black text-5xl md:text-7xl leading-none mb-5"
              style={{ letterSpacing: '-0.03em' }}
            >
              <span style={{ color: 'var(--paper)' }}>Download</span>
              <br />
              <span className="gold-text">Research Papers</span>
            </h1>

            <p
              className="text-lg max-w-xl mx-auto leading-relaxed"
              style={{ color: 'rgba(245,240,232,0.45)', fontFamily: 'DM Sans, sans-serif' }}
            >
              Paste any Academia.edu document URL below.
              Preview the paper instantly and download it as a PDF — no account required.
            </p>
          </div>

          {/* ── Search Card ── */}
          <div
            ref={cardRef}
            className="w-full max-w-2xl reveal-up"
            style={{
              transition: 'transform 0.3s ease',
              animationDelay: '0.15s',
            }}
          >
            <div
              className="glass-panel rounded-2xl p-6"
              style={{
                boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.1)',
              }}
            >
              {/* Input area */}
              <div className="relative mb-4">
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(201,168,76,0.5)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (state === 'error') setState('idle');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleFetch()}
                  placeholder="https://www.academia.edu/..."
                  className={`search-input w-full pl-11 pr-4 py-4 rounded-xl text-sm ${state === 'error' ? 'error-glow' : ''}`}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {/* Error message */}
              {state === 'error' && error && (
                <div
                  className="mb-4 px-4 py-3 rounded-lg text-sm font-mono flex items-center gap-2"
                  style={{
                    background: 'rgba(196,82,42,0.08)',
                    border: '1px solid rgba(196,82,42,0.3)',
                    color: '#e07050',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleFetch}
                  disabled={isLoading || !url.trim()}
                  className="btn-primary flex-1 py-4 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state === 'fetching-meta' ? (
                    <>
                      <span className="loading-dots flex gap-1">
                        <span style={{ color: 'var(--ink)' }}>●</span>
                        <span style={{ color: 'var(--ink)' }}>●</span>
                        <span style={{ color: 'var(--ink)' }}>●</span>
                      </span>
                      <span>Loading Preview...</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      Preview Document
                    </>
                  )}
                </button>

                {showPreview && (
                  <button
                    onClick={handleReset}
                    className="px-5 py-4 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: 'rgba(245,240,232,0.06)',
                      border: '1px solid rgba(245,240,232,0.1)',
                      color: 'rgba(245,240,232,0.5)',
                    }}
                    onMouseEnter={e => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(245,240,232,0.1)';
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLButtonElement).style.background = 'rgba(245,240,232,0.06)';
                    }}
                  >
                    ✕ Reset
                  </button>
                )}
              </div>

              {/* Supported platforms */}
              <div className="mt-4 flex items-center gap-3 justify-center">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.12)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
                  <span className="text-xs font-mono" style={{ color: 'rgba(245,240,232,0.35)' }}>
                    Academia.edu
                  </span>
                </div>
                {/* <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.12)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
                  <span className="text-xs font-mono" style={{ color: 'rgba(245,240,232,0.35)' }}>
                    Scribd
                  </span>

                </div> */}
              </div>
            </div>
          </div>

          {/* ── PDF Preview ── */}
          {showPreview && meta && (
            <div ref={resultRef} className="w-full max-w-4xl mx-auto mt-10 px-4">
              <PdfPreview
                meta={meta}
                url={url}
                base64={base64}
                onDownload={handleDownload}
                downloading={state === 'downloading'}
              />

              {state === 'done' && (
                <div
                  className="mt-4 text-center text-sm font-mono reveal-up"
                  style={{ color: 'rgba(245,240,232,0.3)' }}
                >
                  ✓ Your download should have started automatically.
                  <button
                    onClick={() => triggerDownload(base64!, fileName)}
                    className="ml-2 underline"
                    style={{ color: 'var(--gold)' }}
                  >
                    Click here
                  </button>
                  {' '}if it didn't.
                </div>
              )}
            </div>
          )}

          {/* ── How it works ── */}
          {!showPreview && (
            <div className="w-full max-w-3xl mx-auto mt-20 px-4">
              <div className="glow-line mb-12 opacity-30" />

              <h2
                className="font-display text-2xl text-center mb-10 reveal-up"
                style={{ color: 'rgba(245,240,232,0.4)', animationDelay: '0.2s' }}
              >
                How it works
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    n: '01',
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                    ),
                    title: 'Paste URL',
                    desc: 'Copy the link from any Academia.edu paper or Scribd document.',
                  },
                  {
                    n: '02',
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="14" rx="2" />
                        <path d="M8 21h8" />
                        <path d="M12 17v4" />
                      </svg>
                    ),
                    title: 'Preview',
                    desc: 'View the document title, metadata, and an embedded PDF preview.',
                  },
                  {
                    n: '03',
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    ),
                    title: 'Download',
                    desc: 'Click Download PDF and receive the full document instantly.',
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="glass-panel rounded-2xl p-6 reveal-up group cursor-default"
                    style={{
                      animationDelay: `${0.2 + i * 0.1}s`,
                      transition: 'border-color 0.3s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.35)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.2)';
                    }}
                  >
                    <div className="step-number mb-2">{step.n}</div>
                    <div className="mb-3" style={{ color: 'var(--gold)' }}>
                      {step.icon}
                    </div>
                    <h3
                      className="font-display text-lg font-bold mb-2"
                      style={{ color: 'var(--paper)' }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,240,232,0.4)' }}>
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="text-center py-8 px-4">
          <div className="glow-line mb-8 opacity-10 max-w-2xl mx-auto" />
          <p className="text-xs font-mono" style={{ color: 'rgba(245,240,232,0.2)' }}>
            AcademiaPDF — Built for researchers, by researchers.
            <span className="mx-2">·</span>
            For educational use only.
          </p>
        </footer>
      </div>
    </>
  );
}
