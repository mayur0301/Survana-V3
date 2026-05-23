import React, { useState, useEffect } from 'react';
import { Search, Heart, Sparkles, Clock, Trash2, FolderHeart, Music, Volume2, ListMusic, Play } from 'lucide-react';
import Sidebar from './components/Sidebar';
import SongCard from './components/SongCard';
import AudioPlayer from './components/AudioPlayer';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  // Database States
  const [likedSongs, setLikedSongs] = useState([]);
  const [history, setHistory] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');

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

  // Update history periodically or after action
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
        if (selectedPlaylistId === id) {
          setCurrentView('home');
          setSelectedPlaylistId('');
        }
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
    setCurrentView('search');
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
      // If playing a standalone card (e.g. from search/recently played)
      // Check if it's already in the current queue, if not, append to queue
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
    
    // Log play into history database (runs in background on server during stream request, but fetch client side history shortly after)
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

  const selectedPlaylist = playlists.find(pl => pl.id === selectedPlaylistId);
  const isSongLiked = (id) => likedSongs.some(song => song.id === id);

  const formatDuration = (sec) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="app-container">
      {/* 1. Sidebar Panel */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        playlists={playlists}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        setSelectedPlaylistId={setSelectedPlaylistId}
      />

      {/* 2. Main Content viewport */}
      <main className="main-content">
        <header className="header">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="search-bar"
          >
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search artists, tracks, podcasts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </form>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Welcome to Survana V3</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))' }}></div>
          </div>
        </header>

        <div className="view-container">
          {/* HOME VIEW */}
          {currentView === 'home' && (
            <div>
              <div className="hero-banner">
                <div className="hero-content">
                  <span className="hero-tag">Trending Audio</span>
                  <h1 className="hero-headline">Chill Lofi Beats & Sleep Melodies</h1>
                  <p className="hero-desc">Bypass CORS limits and stream direct audio files with interactive visualizations, custom playlists, and offline lyrics.</p>
                  <button className="hero-btn" onClick={() => handleShortcutClick('lofi chill')}>Listen Now</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Quick Shortcuts:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Lofi Hip Hop', 'Synthwave', 'Peaceful Piano', 'Coffee Shop Jazz'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleShortcutClick(tag)}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          border: '1px solid var(--border-glass)',
                          padding: '6px 14px',
                          borderRadius: '100px',
                          fontSize: '12px',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--accent-purple)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Browse Categories */}
              <h2 className="view-subtitle" style={{ marginTop: '40px' }}>Explore Moods & Genres</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                {[
                  { name: 'Focus Study', query: 'study beats lofi', color: 'linear-gradient(135deg, #7c2d12, #ea580c)' },
                  { name: 'Cyberpunk Synth', query: 'synthwave cyberpunk retro', color: 'linear-gradient(135deg, #991b1b, #f97316)' },
                  { name: 'Chillout Lounge', query: 'chillout ambient lounge', color: 'linear-gradient(135deg, #7f1d1d, #b91c1c)' },
                  { name: 'Coffee House Jazz', query: 'cafe jazz music instrumental', color: 'linear-gradient(135deg, #ea580c, #f59e0b)' },
                ].map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => handleShortcutClick(cat.query)}
                    style={{
                      background: cat.color,
                      height: '100px',
                      borderRadius: '16px',
                      padding: '20px',
                      fontWeight: '700',
                      fontSize: '18px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'flex-end',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
                    }}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>

              {/* Recently Played */}
              {history.length > 0 && (
                <>
                  <h2 className="view-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} style={{ color: 'var(--accent-purple)' }} /> Recently Played
                  </h2>
                  <div className="songs-grid" style={{ marginBottom: '40px' }}>
                    {history.slice(0, 5).map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isPlaying={isPlaying}
                        currentSong={currentSong}
                        onPlay={handlePlaySong}
                        onLike={handleLikeSong}
                        isLiked={isSongLiked(song.id)}
                        playlists={playlists}
                        onAddToPlaylist={handleAddToPlaylist}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Liked Preview */}
              {likedSongs.length > 0 && (
                <>
                  <h2 className="view-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Heart size={20} fill="var(--accent-pink)" style={{ color: 'var(--accent-pink)' }} /> Liked Tracks
                  </h2>
                  <div className="songs-grid">
                    {likedSongs.slice(0, 5).map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isPlaying={isPlaying}
                        currentSong={currentSong}
                        onPlay={handlePlaySong}
                        onLike={handleLikeSong}
                        isLiked={true}
                        playlists={playlists}
                        onAddToPlaylist={handleAddToPlaylist}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* SEARCH VIEW */}
          {currentView === 'search' && (
            <div>
              <h1 className="view-title">Search Results</h1>
              {loadingSearch ? (
                <div className="loader-container">
                  <div className="spinner"></div>
                  <p style={{ color: 'var(--text-secondary)' }}>Querying yt-dlp. Please wait...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="empty-state">
                  <Music size={48} style={{ color: 'var(--text-muted)' }} />
                  <h3>No Results</h3>
                  <p>Type a search query above to query YouTube audio tracks using yt-dlp.</p>
                </div>
              ) : (
                <div className="songs-grid">
                  {searchResults.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      isPlaying={isPlaying}
                      currentSong={currentSong}
                      onPlay={(s) => handlePlaySong(s, searchResults)}
                      onLike={handleLikeSong}
                      isLiked={isSongLiked(song.id)}
                      playlists={playlists}
                      onAddToPlaylist={handleAddToPlaylist}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LIKED SONGS VIEW */}
          {currentView === 'liked' && (
            <div>
              <h1 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Heart size={28} fill="var(--accent-pink)" style={{ color: 'var(--accent-pink)' }} /> Liked Songs
              </h1>
              {likedSongs.length === 0 ? (
                <div className="empty-state">
                  <Heart size={48} style={{ color: 'var(--text-muted)' }} />
                  <h3>No Liked Songs Yet</h3>
                  <p>Browse search results and hit the Heart icon to add items here.</p>
                </div>
              ) : (
                <div className="songs-list-row">
                  {likedSongs.map((song, index) => (
                    <div 
                      key={song.id} 
                      className="song-row" 
                      onClick={() => handlePlaySong(song, likedSongs)}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{index + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img src={song.thumbnail} alt={song.title} className="song-row-thumb" />
                        <div className="song-row-details">
                          <span className="song-row-title" style={{ color: currentSong?.id === song.id ? 'var(--accent-purple)' : 'white' }}>{song.title}</span>
                          <span className="song-row-artist">{song.artist}</span>
                        </div>
                      </div>
                      <span className="song-row-album" style={{ fontSize: '13px' }}>YouTube Audio</span>
                      <span className="song-row-duration">{formatDuration(song.duration)}</span>
                      <div className="song-row-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeSong(song);
                          }}
                          className="card-action-btn liked"
                          title="Unlike"
                        >
                          <Heart size={15} fill="var(--accent-pink)" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PLAYBACK HISTORY VIEW */}
          {currentView === 'history' && (
            <div>
              <h1 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={28} style={{ color: 'var(--accent-purple)' }} /> Playback History
              </h1>
              {history.length === 0 ? (
                <div className="empty-state">
                  <Clock size={48} style={{ color: 'var(--text-muted)' }} />
                  <h3>No History</h3>
                  <p>Your played tracks will appear here automatically.</p>
                </div>
              ) : (
                <div className="songs-list-row">
                  {history.map((song, index) => (
                    <div 
                      key={song.id + '-' + index} 
                      className="song-row" 
                      onClick={() => handlePlaySong(song)}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{index + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img src={song.thumbnail} alt={song.title} className="song-row-thumb" />
                        <div className="song-row-details">
                          <span className="song-row-title" style={{ color: currentSong?.id === song.id ? 'var(--accent-purple)' : 'white' }}>{song.title}</span>
                          <span className="song-row-artist">{song.artist}</span>
                        </div>
                      </div>
                      <span className="song-row-album" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Played: {new Date(song.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="song-row-duration">{formatDuration(song.duration)}</span>
                      <div className="song-row-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeSong(song);
                          }}
                          className={`card-action-btn ${isSongLiked(song.id) ? 'liked' : ''}`}
                          title="Like"
                        >
                          <Heart size={15} fill={isSongLiked(song.id) ? "var(--accent-pink)" : "none"} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PLAYLIST DETAIL VIEW */}
          {currentView === 'playlist-detail' && (
            <div>
              {selectedPlaylist ? (
                <div>
                  <div className="playlist-banner">
                    <div className="playlist-cover-art">
                      <ListMusic size={64} style={{ color: 'white' }} />
                    </div>
                    <div className="playlist-info">
                      <span className="playlist-tag">PLAYLIST</span>
                      <h1 className="playlist-title-text">{selectedPlaylist.name}</h1>
                      <span className="playlist-songs-count">{selectedPlaylist.songs.length} tracks</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    {selectedPlaylist.songs.length > 0 && (
                      <button
                        onClick={() => handlePlaySong(selectedPlaylist.songs[0], selectedPlaylist.songs)}
                        style={{
                          backgroundColor: 'var(--accent-purple)',
                          border: 'none',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '100px',
                          fontSize: '15px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 15px var(--glow-purple)'
                        }}
                      >
                        <Play size={16} fill="white" /> Play Playlist
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the playlist "${selectedPlaylist.name}"?`)) {
                          handleDeletePlaylist(selectedPlaylist.id);
                        }
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--accent-pink)',
                        color: 'var(--accent-pink)',
                        padding: '12px 24px',
                        borderRadius: '100px',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Trash2 size={16} /> Delete Playlist
                    </button>
                  </div>

                  {selectedPlaylist.songs.length === 0 ? (
                    <div className="empty-state">
                      <ListMusic size={48} style={{ color: 'var(--text-muted)' }} />
                      <h3>Playlist is Empty</h3>
                      <p>Search for songs and add them using the plus button on cards.</p>
                    </div>
                  ) : (
                    <div className="songs-list-row">
                      {selectedPlaylist.songs.map((song, index) => (
                        <div 
                          key={song.id} 
                          className="song-row" 
                          onClick={() => handlePlaySong(song, selectedPlaylist.songs)}
                        >
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{index + 1}</span>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={song.thumbnail} alt={song.title} className="song-row-thumb" />
                            <div className="song-row-details">
                              <span className="song-row-title" style={{ color: currentSong?.id === song.id ? 'var(--accent-purple)' : 'white' }}>{song.title}</span>
                              <span className="song-row-artist">{song.artist}</span>
                            </div>
                          </div>
                          <span className="song-row-album" style={{ fontSize: '13px' }}>YouTube Audio</span>
                          <span className="song-row-duration">{formatDuration(song.duration)}</span>
                          <div className="song-row-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeSong(song);
                              }}
                              className={`card-action-btn ${isSongLiked(song.id) ? 'liked' : ''}`}
                              title="Like"
                            >
                              <Heart size={15} fill={isSongLiked(song.id) ? "var(--accent-pink)" : "none"} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromPlaylist(selectedPlaylist.id, song.id);
                              }}
                              className="card-action-btn"
                              title="Remove from Playlist"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-pink)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>Playlist Not Found</h3>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 3. Persistent Audio Player Bar */}
      <AudioPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onSkipNext={handleSkipNext}
        onSkipPrevious={handleSkipPrevious}
        loopMode={loopMode}
        setLoopMode={setLoopMode}
        isShuffle={isShuffle}
        setIsShuffle={setIsShuffle}
        queue={queue}
        onPlay={handlePlaySong}
      />
    </div>
  );
}
