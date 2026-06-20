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
        alert(`Added "${song.title}" to playlist!`);
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
      fetchHistory
    }}>
      {children}
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
