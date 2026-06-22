import React from 'react';
import { Clock, Heart } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import SongCard from '../components/cards/SongCard';

export default function Home() {
  const {
    history,
    likedSongs,
    playlists,
    currentSong,
    isPlaying,
    handlePlaySong,
    handleLikeSong,
    isSongLiked,
    handleAddToPlaylist,
    handleShortcutClick
  } = useMusicPlayer();

  return (
    <div>
      <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-accent-pink/10 to-accent-purple/15 border border-border-glass flex flex-col md:flex-row md:items-center justify-between gap-8 overflow-hidden">
        <div className="max-w-xl">
          <span className="bg-accent-purple/20 text-accent-purple border border-accent-purple/30 text-xs font-semibold px-3 py-1 rounded-full inline-block mb-3 uppercase tracking-wider">Trending Audio</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight leading-tight">Chill Lofi Beats & Sleep Melodies</h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-6">Bypass CORS limits and stream direct audio files with interactive visualizations and custom playlists.</p>
          <button className="bg-accent-purple text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-accent-purple/90 transition-all duration-300 shadow-[0_4px_20px_rgba(168,85,247,0.4)] cursor-pointer hover:scale-[1.02] active:scale-[0.98]" onClick={() => handleShortcutClick('lofi chill')}>Listen Now</button>
        </div>
        <div className="flex flex-col gap-2 z-10 flex-shrink-0">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quick Shortcuts:</span>
          <div className="flex flex-wrap gap-2">
            {['Lofi Hip Hop', 'Synthwave', 'Peaceful Piano', 'Coffee Shop Jazz'].map(tag => (
              <button
                key={tag}
                onClick={() => handleShortcutClick(tag)}
                className="bg-white/10 border border-border-glass px-3.5 py-1.5 rounded-full text-xs text-white font-semibold cursor-pointer transition-colors duration-250 hover:bg-accent-purple"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Browse Categories */}
      <h2 className="text-xl font-bold text-white mb-5 mt-10">Explore Moods & Genres</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-10">
        {[
          { name: 'Focus Study', query: 'study beats lofi', from: '#7c2d12', to: '#ea580c' },
          { name: 'Cyberpunk Synth', query: 'synthwave cyberpunk retro', from: '#991b1b', to: '#f97316' },
          { name: 'Chillout Lounge', query: 'chillout ambient lounge', from: '#7f1d1d', to: '#b91c1c' },
          { name: 'Coffee House Jazz', query: 'cafe jazz music instrumental', from: '#ea580c', to: '#f59e0b' },
        ].map((cat) => (
          <div
            key={cat.name}
            onClick={() => handleShortcutClick(cat.query)}
            className="h-[100px] rounded-2xl p-5 font-bold text-lg text-white flex items-end cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.15)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)]"
            style={{
              background: `linear-gradient(135deg, ${cat.from}, ${cat.to})`
            }}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {/* Recently Played */}
      {history.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-white mb-5 mt-10 flex items-center gap-2">
            <Clock size={20} className="text-accent-purple" /> Recently Played
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {history.slice(0, 5).map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isPlaying={isPlaying}
                currentSong={currentSong}
                onPlay={handlePlaySong}
                onLike={handleLikeSong}
                isLiked={isSongLiked(song.id)}
                playlists={playlists}
                onAddToPlaylist={handleAddToPlaylist}
              />
            ))}
          </div>
        </div>
      )}

      {/* Liked Preview */}
      {likedSongs.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-white mb-5 mt-10 flex items-center gap-2">
            <Heart size={20} fill="var(--color-accent-pink)" className="text-accent-pink" /> Liked Tracks
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {likedSongs.slice(0, 5).map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isPlaying={isPlaying}
                currentSong={currentSong}
                onPlay={handlePlaySong}
                onLike={handleLikeSong}
                isLiked={true}
                playlists={playlists}
                onAddToPlaylist={handleAddToPlaylist}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
