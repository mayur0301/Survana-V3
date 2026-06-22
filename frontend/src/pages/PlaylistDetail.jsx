import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ListMusic, Play, Trash2, Heart } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function PlaylistDetail() {
  const id = useParams().id;
  const navigate = useNavigate();
  const {
    playlists,
    currentSong,
    handlePlaySong,
    handleDeletePlaylist,
    handleRemoveFromPlaylist,
    handleLikeSong,
    isSongLiked,
    formatDuration,
    confirmAction
  } = useMusicPlayer();

  const playlist = playlists.find(pl => pl.id === id);

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-zinc-400 gap-3 border border-border-glass bg-bg-secondary/40 rounded-2xl max-w-md mx-auto mt-10">
        <h3 className="text-lg font-bold text-white">Playlist Not Found</h3>
        <button className="bg-accent-purple text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-accent-purple/90 transition-all duration-300 shadow-[0_4px_20px_rgba(168,85,247,0.4)] cursor-pointer mt-4" onClick={() => navigate('/')}>
          Go to Home
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    confirmAction({
      title: 'Delete Playlist',
      message: `Are you sure you want to delete the playlist "${playlist.name}"?`,
      onConfirm: async () => {
        await handleDeletePlaylist(playlist.id);
        navigate('/');
      }
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
        <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-border-glass flex items-center justify-center shadow-lg flex-shrink-0">
          <ListMusic size={64} className="text-white" />
        </div>
        <div className="flex flex-col sm:items-start text-center sm:text-left">
          <span className="text-xs font-bold text-accent-purple tracking-widest uppercase mb-1.5">PLAYLIST</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 leading-none">{playlist.name}</h1>
          <span className="text-sm text-zinc-400">{playlist.songs.length} tracks</span>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {playlist.songs.length > 0 && (
          <button
            onClick={() => handlePlaySong(playlist.songs[0], playlist.songs)}
            className="bg-accent-purple text-white px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(168,85,247,0.4)] transition-all hover:bg-accent-purple/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play size={16} fill="white" /> Play Playlist
          </button>
        )}
        <button
          onClick={handleDelete}
          className="bg-transparent border border-accent-pink text-accent-pink px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer transition-all hover:bg-accent-pink/10 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Trash2 size={16} /> Delete Playlist
        </button>
      </div>

      {playlist.songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-zinc-400 gap-3 border border-border-glass bg-bg-secondary/40 rounded-2xl max-w-md mx-auto mt-10">
          <ListMusic size={48} className="text-zinc-600 mb-1" />
          <h3 className="text-lg font-bold text-white">Playlist is Empty</h3>
          <p className="text-sm">Search for songs and add them using the plus button on cards.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {playlist.songs.map((song, index) => {
            const isLiked = isSongLiked(song.id);
            return (
              <div 
                key={song.id} 
                className="grid grid-cols-[40px_2fr_1.5fr_1fr_auto] max-md:grid-cols-[32px_1fr_auto] gap-4 items-center p-3 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer" 
                onClick={() => handlePlaySong(song, playlist.songs)}
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
                <div className="flex justify-end items-center gap-2">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromPlaylist(playlist.id, song.id);
                    }}
                    className="w-8 h-8 rounded-full bg-white/5 border border-border-glass flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
                    title="Remove from Playlist"
                  >
                    <Trash2 size={15} />
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
