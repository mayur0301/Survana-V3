import React from 'react';
import { Search, Menu } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

export default function Header() {
  const { searchQuery, setSearchQuery, handleSearch, isSidebarOpen, setIsSidebarOpen } = useMusicPlayer();

  return (
    <header className="flex items-center justify-between px-6 py-6 md:px-10 sticky top-0 z-[5] bg-gradient-to-b from-bg-secondary to-transparent gap-4">
      <div className="flex items-center gap-4 flex-grow">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white p-2 rounded-lg transition-colors duration-200 hover:bg-white/5 cursor-pointer flex items-center justify-center"
          title="Toggle Sidebar"
        >
          <Menu size={22} />
        </button>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-3 bg-bg-secondary border border-border-glass rounded-xl px-4 py-2.5 w-full max-w-[450px] focus-within:border-accent-purple transition-all duration-200"
        >
          <Search size={18} className="text-zinc-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search artists, tracks, podcasts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 text-sm text-white w-full focus:outline-none placeholder-zinc-500"
          />
        </form>
      </div>
      
      <div className="flex gap-4 items-center flex-shrink-0">
        <span className="text-sm text-zinc-400 hidden sm:inline">Welcome to Survana V3</span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-cyan flex-shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.3)]"></div>
      </div>
    </header>
  );
}
