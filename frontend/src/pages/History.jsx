import React from 'react';
import { Clock, Heart } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function History() {
  const {
    history,
    currentSong,
    handlePlaySong,
    handleLikeSong,
    isSongLiked,
    formatDuration
  } = useMusicPlayer();

  return (
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
  );
}
