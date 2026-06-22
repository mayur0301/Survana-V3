import React, { useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';

let globalAudioCtx = null;
let globalAnalyser = null;
let globalSource = null;

export default function Visualizer({ audioRef, isOpen, onClose, currentSong }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !audioRef.current || !canvasRef.current) return;

    const audioEl = audioRef.current;
    
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      globalAnalyser = globalAudioCtx.createAnalyser();
      globalAnalyser.fftSize = 256;
    }

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

    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);

      globalAnalyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(13, 11, 10, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 1.2;

        const hue = 12 + (i / bufferLength) * 38;
        const saturation = 95;
        const lightness = Math.min(45 + (dataArray[i] / 255) * 30, 80);
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        if (dataArray[i] > 150) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        } else {
          ctx.shadowBlur = 0;
        }

        const yTop = (canvas.height / 2) - (barHeight / 2);
        ctx.fillRect(x, yTop, barWidth - 2, barHeight);

        x += barWidth;
      }

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
    <div className={`absolute inset-0 h-[calc(100vh-96px)] bg-radial from-zinc-900/60 to-black flex flex-col justify-center items-center z-[80] transition-all duration-300 ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
      <button className="absolute top-8 right-10 bg-white/5 border border-border-glass rounded-full px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 hover:border-zinc-500 transition-all duration-200 cursor-pointer flex items-center gap-2" onClick={onClose}>
        <X size={16} /> Close Visualizer
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 justify-center text-white">
          <Sparkles className="text-accent-cyan" /> Live Audio Spectrum
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          {currentSong ? `${currentSong.title} - ${currentSong.artist}` : 'No Track Playing'}
        </p>
      </div>

      <canvas ref={canvasRef} className="bg-black/20 border border-border-glass rounded-2xl shadow-xl"></canvas>
    </div>
  );
}
