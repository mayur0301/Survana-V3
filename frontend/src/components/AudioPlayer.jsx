import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, Sparkles, Languages, Download, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react';
import Visualizer from './Visualizer';

// IndexedDB database parameters for storing the directory handle
const dbName = 'SurvanaCacheDB';
const storeName = 'handles';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getStoredDirectoryHandle() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get('directory');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get stored directory handle from IndexedDB:', e);
    return null;
  }
}

async function setStoredDirectoryHandle(handle) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(handle, 'directory');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to store directory handle in IndexedDB:', e);
  }
}

async function verifyPermission(fileHandle, readWrite) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  // Check query permission first
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  // Request active user permission
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}


export default function AudioPlayer({
  currentSong,
  isPlaying,
  setIsPlaying,
  onSkipNext,
  onSkipPrevious,
  loopMode,
  setLoopMode,
  isShuffle,
  setIsShuffle,
  queue,
  onPlay
}) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  
  // Overlay/Drawer states
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  
  // Lyrics data states
  const [lyrics, setLyrics] = useState({ plain: null, synced: null });
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [activeLyricsIndex, setActiveLyricsIndex] = useState(-1);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const lyricsContainerRef = useRef(null);

  // Local Cache Folder states
  const [dirHandle, setDirHandle] = useState(null);
  const [dirName, setDirName] = useState('');
  const [cachingStatus, setCachingStatus] = useState(''); // '', 'local', 'caching', 'caching-done', 'cloud', 'checking'

  // Retrieve cached directory handle from IndexedDB on startup
  useEffect(() => {
    async function loadDirectory() {
      const handle = await getStoredDirectoryHandle();
      if (handle) {
        setDirHandle(handle);
        setDirName(handle.name);
      }
    }
    loadDirectory();
  }, []);

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
  }, [isPlaying, currentSong]);

  // Helper to trigger background download of song to the local folder cache
  const backgroundCacheSong = async (song) => {
    try {
      const response = await fetch(`/api/download/${song.id}`);
      if (response.ok) {
        const blob = await response.blob();
        if (dirHandle) {
          const fileHandle = await dirHandle.getFileHandle(`${song.id}.mp3`, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log(`Saved ${song.title} locally to folder cache.`);
          setCachingStatus('caching-done');
          // Transition back to 'local' status after 2 seconds
          setTimeout(() => setCachingStatus('local'), 2000);
        }
      } else {
        setCachingStatus('cloud');
      }
    } catch (err) {
      console.error("Failed to background cache song locally:", err);
      setCachingStatus('cloud');
    }
  };

  // Main setup to verify cache and bind audio src
  const setupAudioSource = async (song) => {
    setCurrentTime(0);
    setDuration(song.duration || 0);
    fetchLyrics(song);
    setCachingStatus('checking');

    let fileBlobUrl = null;
    let verified = false;

    if (dirHandle) {
      try {
        verified = await verifyPermission(dirHandle, true);
        if (verified) {
          try {
            const fileHandle = await dirHandle.getFileHandle(`${song.id}.mp3`);
            const file = await fileHandle.getFile();
            fileBlobUrl = URL.createObjectURL(file);
            setCachingStatus('local');
          } catch (e) {
            console.log("Song not found in local cache folder, streaming and saving.");
          }
        } else {
          console.log("Write/Read permissions were denied for the local folder.");
        }
      } catch (err) {
        console.error("Permission request failed:", err);
      }
    }

    if (fileBlobUrl) {
      audioRef.current.src = fileBlobUrl;
    } else {
      // Stream from Express proxy server
      const queryParams = new URLSearchParams({
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail
      }).toString();
      audioRef.current.src = `/api/stream/${song.id}?${queryParams}`;
      
      if (dirHandle && verified) {
        setCachingStatus('caching');
        backgroundCacheSong(song);
      } else {
        setCachingStatus('cloud');
      }
    }

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
      setCachingStatus('');
    }
  }, [currentSong]);

  const handleSelectDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await setStoredDirectoryHandle(handle);
      setDirHandle(handle);
      setDirName(handle.name);
      alert(`Successfully connected local folder: "${handle.name}". Streamed tracks will now be saved here for offline playback!`);
      // If a song is currently playing and not local, trigger caching immediately
      if (currentSong && cachingStatus === 'cloud') {
        const verified = await verifyPermission(handle, true);
        if (verified) {
          setCachingStatus('caching');
          backgroundCacheSong(currentSong);
        }
      }
    } catch (e) {
      console.log('User cancelled folder picker or browser unsupported:', e.message);
      if (e.name === 'TypeError') {
        alert('File System Access API is not supported on this browser. Please use Chrome, Edge, or Opera.');
      }
    }
  };

  // 3. Load and parse lyrics
  const fetchLyrics = async (song) => {
    setLoadingLyrics(true);
    setLyrics({ plain: null, synced: null });
    setParsedLyrics([]);
    setActiveLyricsIndex(-1);

    try {
      const res = await fetch(`/api/lyrics?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);
      if (res.ok) {
        const data = await res.json();
        setLyrics(data);
        
        if (data.synced) {
          parseSyncedLyrics(data.synced);
        }
      }
    } catch (err) {
      console.log('Failed to fetch lyrics:', err);
    } finally {
      setLoadingLyrics(false);
    }
  };

  // Synced lyrics parser helper
  // Formats: [01:23.45] Lyric text
  const parseSyncedLyrics = (syncedText) => {
    const lines = syncedText.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d+):(\d+)\.(\d+)\]/;

    for (const line of lines) {
      const match = timeRegex.exec(line);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const ms = parseInt(match[3]);
        const totalSeconds = min * 60 + sec + ms / 100;
        const text = line.replace(timeRegex, '').trim();
        parsed.push({ time: totalSeconds, text });
      }
    }
    // Sort chronologically just in case
    parsed.sort((a, b) => a.time - b.time);
    setParsedLyrics(parsed);
  };

  // Update active lyric line based on current playback time
  useEffect(() => {
    if (parsedLyrics.length === 0) return;
    
    let activeIndex = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
    
    if (activeIndex !== activeLyricsIndex) {
      setActiveLyricsIndex(activeIndex);
      // Auto scroll active lyric into view
      const activeEl = lyricsContainerRef.current?.querySelector('.lyrics-line.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, parsedLyrics, activeLyricsIndex]);

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
      onSkipNext();
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
                {cachingStatus === 'local' && (
                  <span style={{ fontSize: '10px', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Local</span>
                )}
                {cachingStatus === 'caching' && (
                  <span style={{ fontSize: '10px', color: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Caching...</span>
                )}
                {cachingStatus === 'caching-done' && (
                  <span style={{ fontSize: '10px', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Saved</span>
                )}
                {cachingStatus === 'cloud' && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Cloud Stream</span>
                )}
                {cachingStatus === 'checking' && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>Checking...</span>
                )}
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
          
          <button onClick={onSkipPrevious} className="player-btn" title="Previous">
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
          
          <button onClick={onSkipNext} className="player-btn" title="Next">
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
          className={`player-btn ${dirHandle ? 'active' : ''}`}
          title={dirHandle ? `Cache Folder Connected: ${dirName}` : "Connect Local Cache Folder"}
          style={{ position: 'relative' }}
        >
          <FolderOpen size={18} />
          {dirHandle && (
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
          onClick={() => setIsLyricsOpen(!isLyricsOpen)}
          className={`player-btn ${isLyricsOpen ? 'active' : ''}`}
          title="Lyrics"
          disabled={!currentSong}
        >
          <Languages size={18} />
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
        crossOrigin="anonymous" // Essential for Canvas visualizer CORS bypassing!
      />

      {/* 4. Overlay Canvas Visualizer */}
      <Visualizer
        audioRef={audioRef}
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        currentSong={currentSong}
      />

      {/* 5. Lyrics Side Drawer Panel */}
      <div className={`lyrics-overlay ${isLyricsOpen ? 'open' : ''}`}>
        <div className="lyrics-header">
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Song Lyrics</h3>
          <button className="add-playlist-btn" onClick={() => setIsLyricsOpen(false)}>
            <ChevronDown size={24} />
          </button>
        </div>

        <div className="lyrics-body" ref={lyricsContainerRef}>
          {loadingLyrics ? (
            <div className="loader-container">
              <div className="spinner"></div>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Searching Lyrics...</span>
            </div>
          ) : parsedLyrics.length > 0 ? (
            parsedLyrics.map((line, idx) => (
              <div
                key={idx}
                className={`lyrics-line ${idx === activeLyricsIndex ? 'active' : ''}`}
              >
                {line.text}
              </div>
            ))
          ) : lyrics.plain ? (
            lyrics.plain.split('\n').map((line, idx) => (
              <div key={idx} className="lyrics-line" style={{ color: 'white', opacity: 0.9 }}>
                {line}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '40px 0' }}>
              Lyrics not found for this song.
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
