import React, { useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';

// Keep track of the audio nodes globally so we don't recreate them on the same audio element
let globalAudioCtx = null;
let globalAnalyser = null;
let globalSource = null;

export default function Visualizer({ audioRef, isOpen, onClose, currentSong }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !audioRef.current || !canvasRef.current) return;

    const audioEl = audioRef.current;
    
    // Initialize AudioContext and Analyser Node
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      globalAnalyser = globalAudioCtx.createAnalyser();
      globalAnalyser.fftSize = 256; // 128 frequency bins
    }

    // Connect audio element to analyser node
    try {
      if (!globalSource) {
        globalSource = globalAudioCtx.createMediaElementSource(audioEl);
        globalSource.connect(globalAnalyser);
        globalAnalyser.connect(globalAudioCtx.destination);
      }
    } catch (e) {
      console.log('Audio source already connected or failed to connect:', e.message);
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const bufferLength = globalAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth * 0.9;
      canvas.height = 350;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // AudioContext state resume on click/play
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);

      globalAnalyser.getByteFrequencyData(dataArray);

      // Clear with slight alpha to create a motion blur trail effect
      ctx.fillStyle = 'rgba(13, 11, 10, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      // Draw frequency bars
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 1.2;

        // Custom HSL gradients that change dynamically based on index and frequency value (orange/red/yellow)
        const hue = 12 + (i / bufferLength) * 38;
        const saturation = 95;
        const lightness = Math.min(45 + (dataArray[i] / 255) * 30, 80);
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // Draw glow effect for active frequencies
        if (dataArray[i] > 150) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        } else {
          ctx.shadowBlur = 0;
        }

        // Draw double sided frequency bars (bouncing up and down from middle)
        const yTop = (canvas.height / 2) - (barHeight / 2);
        ctx.fillRect(x, yTop, barWidth - 2, barHeight);

        x += barWidth;
      }

      // Draw center pulsing circle
      let average = 0;
      for (let i = 0; i < bufferLength; i++) {
        average += dataArray[i];
      }
      average = average / bufferLength;

      ctx.shadowBlur = 0;
      const radius = 40 + (average / 255) * 60;
      const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 5, canvas.width / 2, canvas.height / 2, radius);
      gradient.addColorStop(0, 'rgba(234, 88, 12, 0.8)');
      gradient.addColorStop(0.5, 'rgba(220, 38, 38, 0.4)');
      gradient.addColorStop(1, 'rgba(13, 11, 10, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, 2 * Math.PI);
      ctx.fill();
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isOpen, audioRef, currentSong]);

  return (
    <div className={`visualizer-overlay ${isOpen ? 'open' : ''}`}>
      <button className="visualizer-close" onClick={onClose}>
        <X size={16} /> Close Visualizer
      </button>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <Sparkles style={{ color: 'var(--accent-cyan)' }} /> Live Audio Spectrum
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          {currentSong ? `${currentSong.title} - ${currentSong.artist}` : 'No Track Playing'}
        </p>
      </div>

      <canvas ref={canvasRef} className="visualizer-canvas"></canvas>
    </div>
  );
}
