import React from 'react';
import { Search } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

export default function Header() {
  const { searchQuery, setSearchQuery, handleSearch } = useMusicPlayer();

  return (
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
  );
}
