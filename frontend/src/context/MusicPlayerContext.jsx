import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MusicPlayerContext = createContext(null);

export function MusicPlayerProvider({ children }) {
  const navigate = useNavigate();

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  // Database States
  const [likedSongs, setLikedSongs] = useState([]);
  const [history, setHistory] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  // Audio Playback States
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopMode, setLoopMode] = useState('none'); // 'none' | 'one' | 'all'
  const [isShuffle, setIsShuffle] = useState(false);
  const [queue, setQueue] = useState([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState(-1);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);

  // Custom UI feedback states (Toast and Confirm Dialog)
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, onCancel }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const confirmAction = ({ title, message, onConfirm, onCancel }) => {
    setConfirmDialog({
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmDialog(null);
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setConfirmDialog(null);
      }
    });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch initial data
  useEffect(() => {
    fetchLikedSongs();
    fetchHistory();
    fetchPlaylists();
  }, []);

  const fetchLikedSongs = async () => {
    try {
      const res = await fetch('/api/liked');
      if (res.ok) {
        const data = await res.json();
        setLikedSongs(data);
      }
    } catch (e) {
      console.log('Error fetching liked songs:', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.log('Error fetching history:', e);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (e) {
      console.log('Error fetching playlists:', e);
    }
  };

  // Toggle Like API
  const handleLikeSong = async (song) => {
    try {
      const res = await fetch('/api/liked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(song)
      });
      if (res.ok) {
        await fetchLikedSongs();
      }
    } catch (e) {
      console.log('Error toggling like:', e);
    }
  };

  // Playlist CRUD API calls
  const handleCreatePlaylist = async (name) => {
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        await fetchPlaylists();
      }
    } catch (e) {
      console.log('Error creating playlist:', e);
    }
  };

  const handleDeletePlaylist = async (id) => {
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPlaylists();
      }
    } catch (e) {
      console.log('Error deleting playlist:', e);
    }
  };

  const handleAddToPlaylist = async (playlistId, song) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(song)
      });
      if (res.ok) {
        await fetchPlaylists();
        showToast(`Added "${song.title}" to playlist!`);
      }
    } catch (e) {
      console.log('Error adding song to playlist:', e);
    }
  };

  const handleRemoveFromPlaylist = async (playlistId, songId) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchPlaylists();
      }
    } catch (e) {
      console.log('Error removing song from playlist:', e);
    }
  };

  // Search API Call
  const handleSearch = async (queryToSearch) => {
    const q = queryToSearch || searchQuery;
    if (!q.trim()) return;

    setLoadingSearch(true);
    navigate('/search');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.log('Search failed:', e);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Playback Control logic
  const handlePlaySong = (song, playlistContext = null) => {
    // If a playlist context is provided, set the entire playlist as queue
    if (playlistContext && Array.isArray(playlistContext)) {
      setQueue(playlistContext);
      const idx = playlistContext.findIndex(s => s.id === song.id);
      setActiveQueueIndex(idx >= 0 ? idx : 0);
    } else {
      // If playing a standalone card
      const existingIdx = queue.findIndex(s => s.id === song.id);
      if (existingIdx >= 0) {
        setActiveQueueIndex(existingIdx);
      } else {
        const newQueue = [...queue, song];
        setQueue(newQueue);
        setActiveQueueIndex(newQueue.length - 1);
      }
    }
    
    setCurrentSong(song);
    setIsPlaying(true);
    
    // Log play into history database (runs in background on server, fetch client side shortly after)
    setTimeout(() => {
      fetchHistory();
    }, 2000);
  };

  // Play next in queue
  const handleSkipNext = () => {
    if (queue.length === 0) return;

    let nextIndex = activeQueueIndex;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = activeQueueIndex + 1;
      if (nextIndex >= queue.length) {
        if (loopMode === 'all') {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }

    setActiveQueueIndex(nextIndex);
    setCurrentSong(queue[nextIndex]);
    setIsPlaying(true);
  };

  // Play previous in queue
  const handleSkipPrevious = () => {
    if (queue.length === 0) return;

    let prevIndex = activeQueueIndex;

    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = activeQueueIndex - 1;
      if (prevIndex < 0) {
        if (loopMode === 'all') {
          prevIndex = queue.length - 1;
        } else {
          prevIndex = 0; // stay on first
        }
      }
    }

    setActiveQueueIndex(prevIndex);
    setCurrentSong(queue[prevIndex]);
    setIsPlaying(true);
  };

  const handleShortcutClick = (tag) => {
    setSearchQuery(tag);
    handleSearch(tag);
  };

  const isSongLiked = (id) => likedSongs.some(song => song.id === id);

  const formatDuration = (sec) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <MusicPlayerContext.Provider value={{
      searchQuery,
      setSearchQuery,
      searchResults,
      loadingSearch,
      likedSongs,
      history,
      playlists,
      currentSong,
      isPlaying,
      setIsPlaying,
      loopMode,
      setLoopMode,
      isShuffle,
      setIsShuffle,
      queue,
      activeQueueIndex,
      isVisualizerOpen,
      setIsVisualizerOpen,
      isSidebarOpen,
      setIsSidebarOpen,
      handleLikeSong,
      handleCreatePlaylist,
      handleDeletePlaylist,
      handleAddToPlaylist,
      handleRemoveFromPlaylist,
      handleSearch,
      handlePlaySong,
      handleSkipNext,
      handleSkipPrevious,
      handleShortcutClick,
      isSongLiked,
      formatDuration,
      fetchHistory,
      showToast,
      confirmAction
    }}>
      {children}

      {/* Premium Toast Notification */}
      {toast && (
        <div className={`fixed bottom-28 right-6 bg-bg-secondary/95 border border-border-glass backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xl z-[10000] min-w-[280px] max-w-[400px] animate-slide-in-right border-l-4 ${toast.type === 'success' ? 'border-l-green-500' : toast.type === 'error' ? 'border-l-red-500' : 'border-l-accent-cyan'}`}>
          <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
            <span>{toast.message}</span>
          </div>
          <button className="text-zinc-500 hover:text-white text-lg font-bold cursor-pointer transition-colors leading-none" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* Premium Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-bg-secondary border border-border-glass rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-scale-up">
            <h4 className="text-lg font-extrabold text-white mb-2">{confirmDialog.title}</h4>
            <p className="text-xs leading-relaxed text-zinc-400 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button className="bg-white/5 border border-border-glass text-zinc-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors duration-200 cursor-pointer" onClick={confirmDialog.onCancel}>
                Cancel
              </button>
              <button className="bg-accent-purple text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-accent-purple/90 transition-colors duration-200 cursor-pointer shadow-[0_4px_15px_rgba(234,88,12,0.3)]" onClick={confirmDialog.onConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}
