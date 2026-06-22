import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, History, FolderHeart, Plus, Trash2 } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import bigLogo from '../../assets/Logo/Big Logo.png';
import smallLogo from '../../assets/Logo/Small Logo.png';

export default function Sidebar() {
  const navigate = useNavigate();
  const {
    playlists,
    handleCreatePlaylist,
    handleDeletePlaylist,
    isSidebarOpen,
    confirmAction
  } = useMusicPlayer();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      handleCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowAddForm(false);
    }
  };

  const handleDelete = (e, plId, plName) => {
    e.preventDefault();
    e.stopPropagation();
    confirmAction({
      title: 'Delete Playlist',
      message: `Delete playlist "${plName}"?`,
      onConfirm: async () => {
        await handleDeletePlaylist(plId);
        navigate('/');
      }
    });
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-[200] flex flex-col bg-bg-secondary border-r border-border-glass transition-all duration-300 h-full md:relative md:translate-x-0 ${isSidebarOpen ? 'w-64 p-6 translate-x-0' : 'w-[88px] p-4 -translate-x-full md:translate-x-0'}`}>
      <Link to="/" className="flex items-center justify-center mb-8 h-12 overflow-hidden">
        <img 
          src={isSidebarOpen ? bigLogo : smallLogo} 
          alt="Survana V3" 
          className={`transition-all duration-300 object-contain ${isSidebarOpen ? 'h-[70px] -my-[10px]' : 'h-10'}`}
        />
      </Link>

      <nav>
        <ul className="flex flex-col gap-2 p-0 m-0 list-none">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => `flex items-center gap-4 py-3.5 px-4 rounded-xl font-medium transition-all duration-200 text-decoration-none ${!isSidebarOpen ? 'justify-center' : ''} ${isActive ? 'bg-gradient-to-r from-accent-purple/20 to-accent-pink/10 border border-border-glass text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              title="Home"
            >
              <Home size={20} className="flex-shrink-0" />
              <span className={isSidebarOpen ? 'inline' : 'hidden'}>Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/search"
              className={({ isActive }) => `flex items-center gap-4 py-3.5 px-4 rounded-xl font-medium transition-all duration-200 text-decoration-none ${!isSidebarOpen ? 'justify-center' : ''} ${isActive ? 'bg-gradient-to-r from-accent-purple/20 to-accent-pink/10 border border-border-glass text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              title="Search"
            >
              <Search size={20} className="flex-shrink-0" />
              <span className={isSidebarOpen ? 'inline' : 'hidden'}>Search</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/liked"
              className={({ isActive }) => `flex items-center gap-4 py-3.5 px-4 rounded-xl font-medium transition-all duration-200 text-decoration-none ${!isSidebarOpen ? 'justify-center' : ''} ${isActive ? 'bg-gradient-to-r from-accent-purple/20 to-accent-pink/10 border border-border-glass text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              title="Liked Songs"
            >
              <Heart size={20} className="flex-shrink-0" />
              <span className={isSidebarOpen ? 'inline' : 'hidden'}>Liked Songs</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/history"
              className={({ isActive }) => `flex items-center gap-4 py-3.5 px-4 rounded-xl font-medium transition-all duration-200 text-decoration-none ${!isSidebarOpen ? 'justify-center' : ''} ${isActive ? 'bg-gradient-to-r from-accent-purple/20 to-accent-pink/10 border border-border-glass text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              title="History"
            >
              <History size={20} className="flex-shrink-0" />
              <span className={isSidebarOpen ? 'inline' : 'hidden'}>History</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="flex flex-col flex-grow mt-6 border-t border-border-glass/40 pt-6 overflow-hidden">
        <div className={`items-center justify-between text-xs font-bold tracking-wider text-zinc-500 uppercase px-3 mb-4 ${isSidebarOpen ? 'flex' : 'hidden'}`}>
          <span>Playlists</span>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-border-glass transition-all duration-200 cursor-pointer"
            title="Create Playlist"
          >
            <Plus size={16} />
          </button>
        </div>

        {showAddForm && isSidebarOpen && (
          <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="bg-bg-tertiary border border-border-glass px-3 py-1.5 rounded-lg text-xs text-white w-full focus:outline-none focus:border-accent-purple"
              autoFocus
            />
            <button
              type="submit"
              className="bg-accent-purple text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent-purple/80 cursor-pointer"
            >
              Add
            </button>
          </form>
        )}

        <div className="flex flex-col gap-1 overflow-y-auto pr-1 flex-grow">
          {playlists.length === 0 ? (
            <div className={`text-xs text-zinc-500 px-3 py-2 ${isSidebarOpen ? 'block' : 'hidden'}`}>
              No playlists
            </div>
          ) : (
            playlists.map((pl) => (
              <NavLink 
                key={pl.id} 
                to={`/playlist/${pl.id}`}
                className={({ isActive }) => `flex items-center justify-between py-2.5 px-3 rounded-lg text-sm text-zinc-400 transition-all duration-200 text-decoration-none hover:bg-white/5 hover:text-white ${!isSidebarOpen ? 'justify-center' : ''} ${isActive ? 'bg-white/5 text-white font-medium' : ''}`}
                title={pl.name}
              >
                <div className={`flex items-center gap-2 overflow-hidden w-full ${!isSidebarOpen ? 'justify-center' : ''}`}>
                  <FolderHeart size={16} className="text-accent-cyan flex-shrink-0" />
                  <span className={`truncate ${isSidebarOpen ? 'inline' : 'hidden'}`}>
                    {pl.name}
                  </span>
                </div>
                {isSidebarOpen && (
                  <button
                    onClick={(e) => handleDelete(e, pl.id, pl.name)}
                    className="p-1 rounded text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 ml-2 cursor-pointer"
                    title="Delete playlist"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </NavLink>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
