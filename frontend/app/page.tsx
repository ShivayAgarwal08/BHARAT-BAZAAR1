/**
 * Home Page — Bharat Bazaar
 * Main page with voice recording, text display, AI generation, and save flow.
 */
'use client';

import { useState } from 'react';
import VoiceRecorder from '../components/VoiceRecorder';
import ProductCard from '../components/ProductCard';

const BACKEND_URL = 'http://127.0.0.1:8000';

interface GeneratedProduct {
  title: string;
  description: string;
  price: string;
  tags: string[];
}

type AppState = 'idle' | 'generating' | 'displaying' | 'saved';

export default function HomePage() {
  const [transcript, setTranscript] = useState('');
  const [product, setProduct] = useState<GeneratedProduct | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Called when voice recorder emits final transcript
  const handleTranscript = (text: string) => {
    setTranscript((prev) => (prev ? prev + ' ' + text : text));
    setError('');
  };

  // Call backend to generate product listing
  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError('Please speak or type something first!');
      return;
    }
    setAppState('generating');
    setError('');
    setProduct(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Generation failed');
      }

      const data: GeneratedProduct = await res.json();
      setProduct(data);
      setAppState('displaying');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend');
      setAppState('idle');
    }
  };

  // Save product to DB
  const handleSave = async () => {
    if (!product) return;
    setAppState('generating'); // re-use loading state for save

    try {
      const res = await fetch(`${BACKEND_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });

      if (!res.ok) throw new Error('Failed to save product');

      setSaveSuccess(true);
      setAppState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setAppState('displaying');
    }
  };

  const handleReset = () => {
    setTranscript('');
    setProduct(null);
    setAppState('idle');
    setError('');
    setSaveSuccess(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>

      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎙️🪔</div>
        <h1
          className="gradient-text"
          style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px' }}
        >
          Speak Your Product,<br />Let AI Do the Rest
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
          Record your voice, describe your handcrafted product, and our AI will instantly
          create a beautiful listing for your shop.
        </p>
      </div>

      {/* ─── Step 1: Voice Recorder Card ───────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(145deg, #111827, #1a2234)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          padding: '36px 32px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <span
            style={{
              background: 'rgba(249,115,22,0.15)',
              color: '#f97316',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            1
          </span>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#cbd5e1', margin: 0 }}>
            Record Your Product Description
          </h2>
        </div>

        <VoiceRecorder onTranscript={handleTranscript} />
      </div>

      {/* ─── Step 2: Text Display + Edit ───────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(145deg, #111827, #1a2234)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          padding: '28px 32px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span
            style={{
              background: 'rgba(99,102,241,0.15)',
              color: '#818cf8',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            2
          </span>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#cbd5e1', margin: 0 }}>
            Your Voice Transcript
          </h2>
        </div>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your speech will appear here... or type directly if you prefer."
          rows={3}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '14px 16px',
            color: '#e2e8f0',
            fontSize: '15px',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(249,115,22,0.5)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={appState === 'generating'}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background:
                appState === 'generating'
                  ? '#374151'
                  : 'linear-gradient(135deg, #f97316, #ea580c)',
              color: appState === 'generating' ? '#6b7280' : '#fff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: appState === 'generating' ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow:
                appState === 'generating'
                  ? 'none'
                  : '0 4px 20px rgba(249,115,22,0.35)',
              fontFamily: 'inherit',
            }}
          >
            {appState === 'generating' ? '⏳ Generating...' : '✨ Generate Listing'}
          </button>

          {/* Clear button */}
          {(transcript || product) && (
            <button
              onClick={handleReset}
              style={{
                padding: '14px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#64748b',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              🗑 Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Error Message ──────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
            color: '#fca5a5',
            fontSize: '14px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ─── Success Banner ─────────────────────────────────────────────────── */}
      {saveSuccess && (
        <div
          className="animate-fade-in-up"
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
            color: '#6ee7b7',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ✅ Product saved! View it in{' '}
          <a href="/products" style={{ color: '#34d399', fontWeight: 700 }}>
            My Products →
          </a>
        </div>
      )}

      {/* ─── Step 3: Generated Product Card ────────────────────────────────── */}
      {product && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span
              style={{
                background: 'rgba(16,185,129,0.15)',
                color: '#10b981',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              3
            </span>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#cbd5e1', margin: 0 }}>
              Your AI-Generated Listing
            </h2>
          </div>

          <ProductCard
            title={product.title}
            description={product.description}
            price={product.price}
            tags={product.tags}
            isPreview
            onSave={appState !== 'saved' ? handleSave : undefined}
            isSaving={appState === 'generating'}
          />
        </div>
      )}

      {/* ─── Bottom Tips ────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: '48px',
          padding: '24px',
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: '16px',
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#818cf8', marginBottom: '12px' }}>
          💡 Tips for best results
        </h3>
        <ul style={{ color: '#64748b', fontSize: '13px', lineHeight: 2, paddingLeft: '20px' }}>
          <li>Mention the product name, material, and use (e.g., &ldquo;handmade terracotta pot for plants&rdquo;)</li>
          <li>Say the price clearly (e.g., &ldquo;price 250 rupees&rdquo;)</li>
          <li>Works best in Chrome — uses <code style={{ color: '#818cf8' }}>webkitSpeechRecognition</code></li>
          <li>You can also type directly in the text box above</li>
        </ul>
      </div>
    </div>
  );
}
