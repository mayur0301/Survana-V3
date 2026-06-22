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
      <h1 className="text-3xl font-extrabold text-white mb-6 flex items-center gap-3">
        <Heart size={28} fill="var(--color-accent-pink)" className="text-accent-pink" /> Liked Songs
      </h1>
      {likedSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-zinc-400 gap-3 border border-border-glass bg-bg-secondary/40 rounded-2xl max-w-md mx-auto mt-10">
          <Heart size={48} className="text-zinc-600 mb-1" />
          <h3 className="text-lg font-bold text-white">No Liked Songs Yet</h3>
          <p className="text-sm">Browse search results and hit the Heart icon to add items here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {likedSongs.map((song, index) => (
            <div 
              key={song.id} 
              className="grid grid-cols-[40px_2fr_1.5fr_1fr_auto] max-md:grid-cols-[32px_1fr_auto] gap-4 items-center p-3 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer" 
              onClick={() => handlePlaySong(song, likedSongs)}
            >
              <span className="text-zinc-500 text-xs pl-1">{index + 1}</span>
              <div className="flex items-center min-w-0">
                <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 mr-3.5" />
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm font-semibold truncate ${currentSong?.id === song.id ? 'text-accent-purple' : 'text-white'}`}>{song.title}</span>
                  <span className="text-xs text-zinc-400 truncate mt-0.5">{song.artist}</span>
                </div>
              </div>
              <span className="text-xs text-zinc-400 truncate max-md:hidden pl-2">YouTube Audio</span>
              <span className="text-xs text-zinc-500 max-md:hidden pl-2">{formatDuration(song.duration)}</span>
              <div className="flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLikeSong(song);
                  }}
                  className="w-8 h-8 rounded-full bg-accent-pink/5 border border-accent-pink/30 flex items-center justify-center text-accent-pink hover:bg-accent-pink/10 transition-all duration-200 cursor-pointer"
                  title="Unlike"
                >
                  <Heart size={15} fill="var(--color-accent-pink)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
