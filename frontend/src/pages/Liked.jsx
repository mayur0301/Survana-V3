import React from 'react';
import { Heart } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function Liked() {
  const {
    likedSongs,
    currentSong,
    handlePlaySong,
    handleLikeSong,
    formatDuration
  } = useMusicPlayer();

  return (
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
  );
}
