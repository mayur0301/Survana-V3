import React, { useState } from 'react';
import { Play, Pause, Heart, Plus, FolderPlus } from 'lucide-react';

export default function SongCard({
  song,
  isPlaying,
  currentSong,
  onPlay,
  onLike,
  isLiked,
  playlists,
  onAddToPlaylist
}) {
  const [showPlaylists, setShowPlaylists] = useState(false);

  const formatDuration = (sec) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isCurrent = currentSong && currentSong.id === song.id;

  return (
    <div className="song-card">
      <div className="song-thumbnail-container" onClick={() => onPlay(song)}>
        <img src={song.thumbnail} alt={song.title} className="song-thumbnail" />
        <div className="play-hover-overlay">
          <div className="play-btn-circle">
            {isCurrent && isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginLeft: '2px' }} />}
          </div>
        </div>
        {song.isLive && (
          <span className="live-badge" style={{ position: 'absolute', top: '8px', left: '8px' }}>LIVE</span>
        )}
      </div>

      <div className="song-title" title={song.title} style={{ color: isCurrent ? 'var(--accent-purple)' : 'white' }}>
        {song.title}
      </div>
      <div className="song-artist" title={song.artist}>
        {song.artist}
      </div>

      <div className="song-meta">
        <span className="song-duration">{formatDuration(song.duration)}</span>
        
        <div className="action-buttons">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onLike(song);
            }} 
            className={`card-action-btn ${isLiked ? 'liked' : ''}`}
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart size={16} fill={isLiked ? "var(--accent-pink)" : "none"} />
          </button>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylists(!showPlaylists);
              }} 
              className="card-action-btn"
              title="Add to Playlist"
            >
              <Plus size={16} />
            </button>

            {showPlaylists && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  padding: '6px',
                  zIndex: 20,
                  minWidth: '150px',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}
                onMouseLeave={() => setShowPlaylists(false)}
              >
                <div style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                  Add to Playlist:
                </div>
                {playlists.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    No Playlists. Create one in sidebar.
                  </div>
                ) : (
                  playlists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToPlaylist(pl.id, song);
                        setShowPlaylists(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        padding: '6px 8px',
                        textAlign: 'left',
                        fontSize: '13px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      {pl.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
