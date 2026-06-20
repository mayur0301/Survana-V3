import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ListMusic, Play, Trash2, Heart } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    playlists,
    currentSong,
    handlePlaySong,
    handleDeletePlaylist,
    handleRemoveFromPlaylist,
    handleLikeSong,
    isSongLiked,
    formatDuration
  } = useMusicPlayer();

  const playlist = playlists.find(pl => pl.id === id);

  if (!playlist) {
    return (
      <div className="empty-state">
        <h3>Playlist Not Found</h3>
        <button className="hero-btn" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>
          Go to Home
        </button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete the playlist "${playlist.name}"?`)) {
      await handleDeletePlaylist(playlist.id);
      navigate('/');
    }
  };

  return (
    <div>
      <div className="playlist-banner">
        <div className="playlist-cover-art">
          <ListMusic size={64} style={{ color: 'white' }} />
        </div>
        <div className="playlist-info">
          <span className="playlist-tag">PLAYLIST</span>
          <h1 className="playlist-title-text">{playlist.name}</h1>
          <span className="playlist-songs-count">{playlist.songs.length} tracks</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {playlist.songs.length > 0 && (
          <button
            onClick={() => handlePlaySong(playlist.songs[0], playlist.songs)}
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
          onClick={handleDelete}
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

      {playlist.songs.length === 0 ? (
        <div className="empty-state">
          <ListMusic size={48} style={{ color: 'var(--text-muted)' }} />
          <h3>Playlist is Empty</h3>
          <p>Search for songs and add them using the plus button on cards.</p>
        </div>
      ) : (
        <div className="songs-list-row">
          {playlist.songs.map((song, index) => (
            <div 
              key={song.id} 
              className="song-row" 
              onClick={() => handlePlaySong(song, playlist.songs)}
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
                    handleRemoveFromPlaylist(playlist.id, song.id);
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
  );
}
