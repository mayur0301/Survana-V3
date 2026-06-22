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
    <footer className="player-bar">
      {/* 1. Left side - Song Details */}
      <div className="player-song-info">
        {currentSong ? (
          <>
            <img src={currentSong.thumbnail} alt={currentSong.title} className="player-thumb" />
            <div className="player-metadata">
              <span className="player-title">{currentSong.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="player-artist">{currentSong.artist}</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No track selected</div>
        )}
      </div>

      {/* 2. Middle side - Audio Controls and Seek Slider */}
      <div className="player-controls-container">
        <div className="player-controls">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`player-btn ${isShuffle ? 'active' : ''}`}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          
          <button onClick={handleSkipPrevious} className="player-btn" title="Previous">
            <SkipBack size={20} fill="currentColor" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="player-btn player-btn-play"
            title={isPlaying ? "Pause" : "Play"}
            disabled={!currentSong}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>
          
          <button onClick={handleSkipNext} className="player-btn" title="Next">
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            onClick={() => {
              if (loopMode === 'none') setLoopMode('all');
              else if (loopMode === 'all') setLoopMode('one');
              else setLoopMode('none');
            }}
            className={`player-btn ${loopMode !== 'none' ? 'active' : ''}`}
            title={`Repeat: ${loopMode === 'one' ? 'One' : loopMode === 'all' ? 'All' : 'Off'}`}
          >
            <Repeat size={18} />
            {loopMode === 'one' && <span style={{ fontSize: '9px', fontWeight: 'bold', position: 'absolute', transform: 'translate(10px, -8px)' }}>1</span>}
          </button>
        </div>

        <div className="progress-container">
          <span className="time-stamp">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="slider-input"
            disabled={!currentSong}
          />
          <span className="time-stamp">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Right side - Option features */}
      <div className="player-actions">
        <button
          onClick={handleSelectDirectory}
          className={`player-btn ${backendCachePath ? 'active' : ''}`}
          title={backendCachePath ? `Server Cache: ${backendCachePath}` : "Configure Server Cache Folder"}
          style={{ position: 'relative' }}
        >
          <FolderOpen size={18} />
          {backendCachePath && (
            <span style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              position: 'absolute',
              top: '6px',
              right: '6px'
            }} />
          )}
        </button>

        <button
          onClick={() => setIsVisualizerOpen(!isVisualizerOpen)}
          className={`player-btn ${isVisualizerOpen ? 'active' : ''}`}
          title="Open Audio Visualizer"
          disabled={!currentSong}
        >
          <Sparkles size={18} />
        </button>


        <button
          onClick={triggerDownload}
          className="player-btn"
          title="Download Track"
          disabled={!currentSong}
        >
          <Download size={18} />
        </button>

        <div className="volume-container">
          <button onClick={toggleMute} className="player-btn">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="slider-input"
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
        <div className="config-modal-overlay">
          <div className="config-modal-content">
            <h3 className="config-modal-title">Configure Cache Location</h3>
            <p className="config-modal-desc">
              Survana saves your tracks for offline playback. Please specify the absolute path to a folder on your computer where we should store them (outside the codebase).
            </p>
            <form onSubmit={handleSaveConfig} className="config-modal-form">
              <div className="config-input-group">
                <label className="config-input-label">Absolute Directory Path</label>
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Vaibhav\Music\SurvanaCache"
                  value={modalInputPath}
                  onChange={(e) => setModalInputPath(e.target.value)}
                  className="config-input-text"
                  required
                />
              </div>
              <div className="config-modal-actions">
                {isConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="config-btn config-btn-secondary"
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="config-btn config-btn-primary">
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
