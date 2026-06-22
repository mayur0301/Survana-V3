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
      <h1 className="text-3xl font-extrabold text-white mb-6 flex items-center gap-3">
        <Clock size={28} className="text-accent-purple" /> Playback History
      </h1>
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-zinc-400 gap-3 border border-border-glass bg-bg-secondary/40 rounded-2xl max-w-md mx-auto mt-10">
          <Clock size={48} className="text-zinc-600 mb-1" />
          <h3 className="text-lg font-bold text-white">No History</h3>
          <p className="text-sm">Your played tracks will appear here automatically.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {history.map((song, index) => {
            const isLiked = isSongLiked(song.id);
            return (
              <div 
                key={song.id + '-' + index} 
                className="grid grid-cols-[40px_2fr_1.5fr_1fr_auto] max-md:grid-cols-[32px_1fr_auto] gap-4 items-center p-3 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer" 
                onClick={() => handlePlaySong(song)}
              >
                <span className="text-zinc-500 text-xs pl-1">{index + 1}</span>
                <div className="flex items-center min-w-0">
                  <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 mr-3.5" />
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-semibold truncate ${currentSong?.id === song.id ? 'text-accent-purple' : 'text-white'}`}>{song.title}</span>
                    <span className="text-xs text-zinc-400 truncate mt-0.5">{song.artist}</span>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 truncate max-md:hidden pl-2">
                  Played: {new Date(song.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs text-zinc-500 max-md:hidden pl-2">{formatDuration(song.duration)}</span>
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLikeSong(song);
                    }}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${isLiked ? 'text-accent-pink border-accent-pink/30 bg-accent-pink/5 hover:bg-accent-pink/10' : 'text-zinc-400 border-border-glass bg-white/5 hover:text-white hover:bg-white/10 hover:border-zinc-500'}`}
                    title="Like"
                  >
                    <Heart size={15} fill={isLiked ? "var(--color-accent-pink)" : "none"} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
