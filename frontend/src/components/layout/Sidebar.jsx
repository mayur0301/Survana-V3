import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, History, FolderHeart, Plus, Trash2 } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import bigLogo from '../../assets/Logo/Big Logo.png';

export default function Sidebar() {
  const navigate = useNavigate();
  const {
    playlists,
    handleCreatePlaylist,
    handleDeletePlaylist
  } = useMusicPlayer();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      handleCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowAddForm(false);
    }
  };

  const handleDelete = async (e, plId, plName) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete playlist "${plName}"?`)) {
      await handleDeletePlaylist(plId);
      navigate('/');
    }
  };

  return (
    <aside className="sidebar">
      <Link to="/" className="logo-container" style={{ justifyContent: 'flex-start', padding: '0 4px', display: 'block', textDecoration: 'none' }}>
        <img src={bigLogo} alt="Survana V3" style={{ width: '100%', maxHeight: '45px', objectFit: 'contain' }} />
      </Link>

      <nav>
        <ul className="nav-menu">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', width: '100%', textAlign: 'left', textDecoration: 'none' }}
            >
              <Home size={20} />
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/search"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', width: '100%', textAlign: 'left', textDecoration: 'none' }}
            >
              <Search size={20} />
              Search
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/liked"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', width: '100%', textAlign: 'left', textDecoration: 'none' }}
            >
              <Heart size={20} />
              Liked Songs
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/history"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', width: '100%', textAlign: 'left', textDecoration: 'none' }}
            >
              <History size={20} />
              History
            </NavLink>
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
              <NavLink 
                key={pl.id} 
                to={`/playlist/${pl.id}`}
                className={({ isActive }) => `playlist-item ${isActive ? 'active' : ''}`}
                style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <FolderHeart size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pl.name}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, pl.id, pl.name)}
                  className="delete-playlist-btn"
                  title="Delete playlist"
                >
                  <Trash2 size={14} />
                </button>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
