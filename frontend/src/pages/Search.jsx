import React from 'react';
import { Music } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import SongCard from '../components/cards/SongCard';

export default function Search() {
  const {
    searchResults,
    loadingSearch,
    currentSong,
    isPlaying,
    handlePlaySong,
    handleLikeSong,
    isSongLiked,
    playlists,
    handleAddToPlaylist
  } = useMusicPlayer();

  return (
    <div>
      <h1 className="view-title">Search Results</h1>
      {loadingSearch ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Querying yt-dlp. Please wait...</p>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="empty-state">
          <Music size={48} style={{ color: 'var(--text-muted)' }} />
          <h3>No Results</h3>
          <p>Type a search query above to query YouTube audio tracks using yt-dlp.</p>
        </div>
      ) : (
        <div className="songs-grid">
          {searchResults.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isPlaying={isPlaying}
              currentSong={currentSong}
              onPlay={(s) => handlePlaySong(s, searchResults)}
              onLike={handleLikeSong}
              isLiked={isSongLiked(song.id)}
              playlists={playlists}
              onAddToPlaylist={handleAddToPlaylist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
