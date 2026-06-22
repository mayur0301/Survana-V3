import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, Sparkles, Download, FolderOpen } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import Visualizer from './Visualizer';

export default function AudioPlayer() {
  const {
    currentSong,
    isPlaying,
    setIsPlaying,
    loopMode,
    setLoopMode,
    isShuffle,
    setIsShuffle,
    handleSkipNext,
    handleSkipPrevious,
    fetchHistory,
    isVisualizerOpen,
    setIsVisualizerOpen,
    showToast
  } = useMusicPlayer();

  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Dynamic Server Cache Configuration states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [backendCachePath, setBackendCachePath] = useState('');
  const [isConfigured, setIsConfigured] = useState(true);
  const [modalInputPath, setModalInputPath] = useState('');

  // Fetch current config on mount
  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch('/api/config/cache-path');
        if (res.ok) {
          const data = await res.json();
          setBackendCachePath(data.cachePath);
          setIsConfigured(data.isConfigured);
          setModalInputPath(data.cachePath || '');
          if (!data.isConfigured) {
            setShowConfigModal(true);
          }
        }
      } catch (e) {
        console.error('Failed to fetch cache path config:', e);
      }
    }
    checkConfig();
  }, []);

  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    if (!modalInputPath.trim()) {
      showToast('Please enter a valid directory path.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/config/cache-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cachePath: modalInputPath.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setBackendCachePath(data.cachePath);
        setIsConfigured(true);
        setShowConfigModal(false);
        showToast('Cache directory updated successfully!');
      } else {
        showToast(data.error || 'Failed to update cache directory.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to the server configuration API.', 'error');
    }
  };

  // 1. Sync Audio Element state with isPlaying prop
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.log("Audio Play interrupted:", err.message);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong, setIsPlaying]);

  // Main setup to bind audio src
  const setupAudioSource = (song) => {
    setCurrentTime(0);
    setDuration(song.duration || 0);

    // Stream from Express proxy server
    const queryParams = new URLSearchParams({
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      thumbnail: song.thumbnail
    }).toString();
    audioRef.current.src = `/api/stream/${song.id}?${queryParams}`;

    // Play if isPlaying is true
    if (isPlaying) {
      setTimeout(() => {
        audioRef.current?.play().catch(e => console.log("Autoplay interrupted:", e.message));
      }, 80);
    }
  };

  // Trigger setup audio source when song changes
  useEffect(() => {
    if (!audioRef.current) return;
    if (currentSong) {
      setupAudioSource(currentSong);
    } else {
      audioRef.current.src = '';
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentSong]);

  const handleSelectDirectory = () => {
    setModalInputPath(backendCachePath);
    setShowConfigModal(true);
  };

  // 4. Handle time update events
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleAudioEnded = () => {
    if (loopMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      handleSkipNext();
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const mutedState = !isMuted;
    setIsMuted(mutedState);
    audioRef.current.muted = mutedState;
  };

  const triggerDownload = () => {
    if (!currentSong) return;
    window.open(`/api/download/${currentSong.id}`, '_blank');
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <footer className="w-full bg-bg-secondary/95 backdrop-blur-2xl border-t border-border-glass py-4 px-6 md:px-10 flex flex-col md:grid md:grid-cols-[300px_1fr_300px] items-center justify-between gap-4 md:gap-6 z-[100] sticky bottom-0 select-none">
      {/* 1. Left side - Song Details */}
      <div className="flex items-center min-w-0 w-full md:w-auto justify-center md:justify-start">
        {currentSong ? (
          <>
            <img src={currentSong.thumbnail} alt={currentSong.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 mr-4 shadow-lg border border-border-glass" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate max-w-[220px]" title={currentSong.title}>{currentSong.title}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-400 truncate max-w-[220px]" title={currentSong.artist}>{currentSong.artist}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500">No track selected</div>
        )}
      </div>

      {/* 2. Middle side - Audio Controls and Seek Slider */}
      <div className="flex flex-col items-center gap-2.5 w-full max-w-xl md:max-w-none">
        <div className="flex items-center gap-5">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-center relative ${isShuffle ? 'text-accent-purple hover:text-accent-purple hover:bg-accent-purple/5' : ''}`}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          
          <button onClick={handleSkipPrevious} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-center" title="Previous">
            <SkipBack size={20} fill="currentColor" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-11 h-11 bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all duration-200 shadow-md flex items-center justify-center rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title={isPlaying ? "Pause" : "Play"}
            disabled={!currentSong}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
          
          <button onClick={handleSkipNext} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-center" title="Next">
            <SkipForward size={20} fill="currentColor" />
          </button>
          
          <button
            onClick={() => {
              if (loopMode === 'none') setLoopMode('all');
              else if (loopMode === 'all') setLoopMode('one');
              else setLoopMode('none');
            }}
            className={`p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-center relative ${loopMode !== 'none' ? 'text-accent-purple hover:text-accent-purple hover:bg-accent-purple/5' : ''}`}
            title={`Repeat: ${loopMode === 'one' ? 'One' : loopMode === 'all' ? 'All' : 'Off'}`}
          >
            <Repeat size={18} />
            {loopMode === 'one' && <span className="text-[9px] font-bold absolute transform translate-[10px,-8px]">1</span>}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="text-[11px] font-medium text-zinc-500 min-w-[32px] text-center">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-grow h-1.5 rounded-lg bg-zinc-800 accent-accent-purple cursor-pointer focus:outline-none"
            disabled={!currentSong}
          />
          <span className="text-[11px] font-medium text-zinc-500 min-w-[32px] text-center">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Right side - Option features */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-end">
        <button
          onClick={handleSelectDirectory}
          className={`p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-center relative ${backendCachePath ? 'text-accent-purple hover:text-accent-purple hover:bg-accent-purple/5' : ''}`}
          title={backendCachePath ? `Server Cache: ${backendCachePath}` : "Configure Server Cache Folder"}
        >
          <FolderOpen size={18} />
          {backendCachePath && (
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full absolute top-1.5 right-1.5" />
          )}
        </button>

        <button
          onClick={() => setIsVisualizerOpen(!isVisualizerOpen)}
          className={`p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-center relative ${isVisualizerOpen ? 'text-accent-purple hover:text-accent-purple hover:bg-accent-purple/5' : ''}`}
          title="Open Audio Visualizer"
          disabled={!currentSong}
        >
          <Sparkles size={18} />
        </button>

        <button
          onClick={triggerDownload}
          className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-center"
          title="Download Track"
          disabled={!currentSong}
        >
          <Download size={18} />
        </button>

        <div className="flex items-center gap-2 max-w-[120px]">
          <button onClick={toggleMute} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-center">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 rounded-lg bg-zinc-800 accent-accent-purple cursor-pointer focus:outline-none"
          />
        </div>
      </div>

      {/* Hidden Audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        crossOrigin="anonymous"
      />

      {/* 4. Overlay Canvas Visualizer */}
      <Visualizer
        audioRef={audioRef}
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        currentSong={currentSong}
      />

      {/* 6. Dynamic Cache Configuration Modal Overlay */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-bg-secondary border border-border-glass rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-scale-up">
            <h3 className="text-xl font-extrabold text-white mb-2">Configure Cache Location</h3>
            <p className="text-xs leading-relaxed text-zinc-400 mb-6">
              Survana saves your tracks for offline playback. Please specify the absolute path to a folder on your computer where we should store them (outside the codebase).
            </p>
            <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Absolute Directory Path</label>
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Vaibhav\Music\SurvanaCache"
                  value={modalInputPath}
                  onChange={(e) => setModalInputPath(e.target.value)}
                  className="bg-bg-tertiary border border-border-glass rounded-xl px-4 py-3 text-sm text-white w-full focus:outline-none focus:border-accent-purple transition-all duration-200 placeholder-zinc-600"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                {isConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="bg-white/5 border border-border-glass text-zinc-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="bg-accent-purple text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-accent-purple/90 transition-colors duration-200 cursor-pointer shadow-[0_4px_15px_rgba(168,85,247,0.3)]">
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </footer>
  );
}
