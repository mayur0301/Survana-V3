import React from 'react';
import { Search, Menu } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

export default function Header() {
  const { searchQuery, setSearchQuery, handleSearch, isSidebarOpen, setIsSidebarOpen } = useMusicPlayer();

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1 }}>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="sidebar-toggle-btn"
          title="Toggle Sidebar"
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Menu size={22} />
        </button>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="search-bar"
          style={{ flexGrow: 1, maxWidth: '450px' }}
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
      </div>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span className="welcome-text" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Welcome to Survana V3</span>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))' }}></div>
      </div>
    </header>
  );
}
