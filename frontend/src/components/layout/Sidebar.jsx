import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, History, FolderHeart, Plus, Trash2 } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import bigLogo from '../../assets/Logo/Big Logo.png';
import smallLogo from '../../assets/Logo/Small Logo.png';

export default function Sidebar() {
  const navigate = useNavigate();
  const {
    playlists,
    handleCreatePlaylist,
    handleDeletePlaylist,
    isSidebarOpen
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
    <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
      <Link to="/" className="logo-container" style={{ justifyContent: 'center', padding: '0 4px', display: 'flex', textDecoration: 'none' }}>
        <img 
          src={isSidebarOpen ? bigLogo : smallLogo} 
          alt="Survana V3" 
          style={{ 
            width: '100%', 
            maxHeight: '45px', 
            objectFit: 'contain',
            transition: 'all 0.3s'
          }} 
        />
      </Link>

      <nav>
        <ul className="nav-menu">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', width: '100%', textAlign: 'left', textDecoration: 'none' }}
              title="Home"
            >
              <Home size={20} style={{ flexShrink: 0 }} />
              <span>Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/search"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', width: '100%', textAlign: 'left', textDecoration: 'none' }}
              title="Search"
            >
              <Search size={20} style={{ flexShrink: 0 }} />
              <span>Search</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/liked"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', width: '100%', textAlign: 'left', textDecoration: 'none' }}
              title="Liked Songs"
            >
              <Heart size={20} style={{ flexShrink: 0 }} />
              <span>Liked Songs</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/history"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', width: '100%', textAlign: 'left', textDecoration: 'none' }}
              title="History"
            >
              <History size={20} style={{ flexShrink: 0 }} />
              <span>History</span>
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

        {showAddForm && isSidebarOpen && (
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
                color: 'white',
                width: '100%'
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
            <div className="no-playlists-text" style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              No playlists
            </div>
          ) : (
            playlists.map((pl) => (
              <NavLink 
                key={pl.id} 
                to={`/playlist/${pl.id}`}
                className={({ isActive }) => `playlist-item ${isActive ? 'active' : ''}`}
                style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                title={pl.name}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', width: '100%' }}>
                  <FolderHeart size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <span className="playlist-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pl.name}
                  </span>
                </div>
                {isSidebarOpen && (
                  <button
                    onClick={(e) => handleDelete(e, pl.id, pl.name)}
                    className="delete-playlist-btn"
                    title="Delete playlist"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </NavLink>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
