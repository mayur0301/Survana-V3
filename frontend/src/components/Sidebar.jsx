import React, { useState } from 'react';
import { Music, Home, Search, Heart, History, FolderHeart, Plus, Trash2 } from 'lucide-react';
import bigLogo from '../assets/Logo/Big Logo.png';

export default function Sidebar({
  currentView,
  setCurrentView,
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
  setSelectedPlaylistId
}) {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowAddForm(false);
    }
  };

  const handlePlaylistClick = (plId) => {
    setSelectedPlaylistId(plId);
    setCurrentView('playlist-detail');
  };

  return (
    <aside className="sidebar">
      <div className="logo-container" style={{ justifyContent: 'flex-start', padding: '0 4px' }}>
        <img src={bigLogo} alt="Survana V3" style={{ width: '100%', maxHeight: '45px', objectFit: 'contain' }} />
      </div>

      <nav>
        <ul className="nav-menu">
          <li>
            <button
              onClick={() => setCurrentView('home')}
              className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <Home size={20} />
              Home
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('search')}
              className={`nav-item ${currentView === 'search' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <Search size={20} />
              Search
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('liked')}
              className={`nav-item ${currentView === 'liked' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <Heart size={20} />
              Liked Songs
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('history')}
              className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <History size={20} />
              History
            </button>
          </li>
        </ul>
      </nav>

      <div className="playlist-section">
        <div className="section-title">
          <span>Playlists</span>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="add-playlist-btn"
            title="Create Playlist"
          >
            <Plus size={16} />
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="search-input"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-glass)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'white'
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                background: 'var(--accent-purple)',
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Add
            </button>
          </form>
        )}

        <div className="playlist-list">
          {playlists.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              No playlists created
            </div>
          ) : (
            playlists.map((pl) => (
              <div 
                key={pl.id} 
                className={`playlist-item ${currentView === 'playlist-detail' && pl.id === pl.selectedId ? 'active' : ''}`}
                onClick={() => handlePlaylistClick(pl.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <FolderHeart size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pl.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete playlist "${pl.name}"?`)) {
                      onDeletePlaylist(pl.id);
                    }
                  }}
                  className="delete-playlist-btn"
                  title="Delete playlist"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
