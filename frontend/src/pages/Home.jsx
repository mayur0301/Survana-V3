import React from 'react';
import { Clock, Heart } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import SongCard from '../components/cards/SongCard';

export default function Home() {
  const {
    history,
    likedSongs,
    playlists,
    currentSong,
    isPlaying,
    handlePlaySong,
    handleLikeSong,
    isSongLiked,
    handleAddToPlaylist,
    handleShortcutClick
  } = useMusicPlayer();

  return (
    <div>
      <div className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag">Trending Audio</span>
          <h1 className="hero-headline">Chill Lofi Beats & Sleep Melodies</h1>
          <p className="hero-desc">Bypass CORS limits and stream direct audio files with interactive visualizations and custom playlists.</p>
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
  );
}
