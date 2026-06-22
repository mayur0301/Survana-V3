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
      <h1 className="text-3xl font-extrabold text-white mb-6">Search Results</h1>
      {loadingSearch ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-3 border-white/5 border-t-accent-purple rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm">Querying yt-dlp. Please wait...</p>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-zinc-400 gap-3 border border-border-glass bg-bg-secondary/40 rounded-2xl max-w-md mx-auto mt-10">
          <Music size={48} className="text-zinc-600 mb-1" />
          <h3 className="text-lg font-bold text-white">No Results</h3>
          <p className="text-sm">Type a search query above to query YouTube audio tracks using yt-dlp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
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
