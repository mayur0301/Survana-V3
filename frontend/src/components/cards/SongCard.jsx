import React, { useState } from 'react';
import { Play, Pause, Heart, Plus } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

export default function SongCard({ song, playlistContext = null }) {
  const {
    currentSong,
    isPlaying,
    handlePlaySong,
    handleLikeSong,
    isSongLiked,
    playlists,
    handleAddToPlaylist,
    formatDuration
  } = useMusicPlayer();

  const [showPlaylists, setShowPlaylists] = useState(false);

  const isCurrent = currentSong && currentSong.id === song.id;
  const isLiked = isSongLiked(song.id);

  return (
    <div className="bg-bg-secondary border border-border-glass rounded-2xl p-4 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-accent-purple/40 hover:shadow-[0_12px_24px_rgba(168,85,247,0.15)]">
      <div 
        className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group mb-3" 
        onClick={() => handlePlaySong(song, playlistContext)}
      >
        <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-accent-purple text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300 hover:bg-accent-purple/90">
            {isCurrent && isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
          </div>
        </div>
        {song.isLive && (
          <span className="absolute top-2 left-2 bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse">LIVE</span>
        )}
      </div>

      <div 
        className={`font-semibold text-sm truncate mb-1 cursor-pointer transition-colors duration-200 ${isCurrent ? 'text-accent-purple' : 'text-white hover:text-accent-purple'}`}
        title={song.title}
        onClick={() => handlePlaySong(song, playlistContext)}
      >
        {song.title}
      </div>
      <div className="text-xs text-zinc-400 truncate mb-3" title={song.artist}>
        {song.artist}
      </div>

      <div className="flex items-center justify-between mt-auto border-t border-border-glass/40 pt-2.5">
        <span className="text-xs text-zinc-500">{formatDuration(song.duration)}</span>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleLikeSong(song);
            }} 
            className={`w-8 h-8 rounded-full bg-white/5 border border-border-glass flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-zinc-500 transition-all duration-200 cursor-pointer ${isLiked ? 'text-accent-pink border-accent-pink/30 bg-accent-pink/5 hover:text-accent-pink' : ''}`}
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart size={16} fill={isLiked ? "var(--color-accent-pink)" : "none"} />
          </button>
          
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylists(!showPlaylists);
              }} 
              className="w-8 h-8 rounded-full bg-white/5 border border-border-glass flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-zinc-500 transition-all duration-200 cursor-pointer"
              title="Add to Playlist"
            >
              <Plus size={16} />
            </button>

            {showPlaylists && (
              <div 
                className="absolute bottom-full right-0 mb-2 bg-bg-secondary border border-border-glass rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.6)] p-2.5 z-20 min-w-[170px] max-h-[180px] overflow-y-auto animate-fade-in"
                onMouseLeave={() => setShowPlaylists(false)}
              >
                <div className="px-2 pb-1.5 mb-1.5 text-[10px] font-bold tracking-wider text-zinc-500 uppercase border-b border-border-glass">
                  Add to Playlist:
                </div>
                {playlists.length === 0 ? (
                  <div className="p-2 text-xs text-zinc-500">
                    No Playlists. Create one in sidebar.
                  </div>
                ) : (
                  playlists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToPlaylist(pl.id, song);
                        setShowPlaylists(false);
                      }}
                      className="block w-full text-left px-2 py-1.5 text-xs text-zinc-300 rounded-lg hover:bg-white/5 hover:text-white transition-colors duration-150 truncate cursor-pointer"
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
