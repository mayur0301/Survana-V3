import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AudioPlayer from '../player/AudioPlayer';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

export default function Layout() {
  const { isSidebarOpen, setIsSidebarOpen } = useMusicPlayer();

  return (
    <div 
      className="relative h-screen w-screen overflow-hidden bg-bg-primary select-none md:grid transition-all duration-300"
      style={{
        gridTemplateColumns: isSidebarOpen ? '260px 1fr' : '88px 1fr'
      }}
    >
      {/* 1. Sidebar Panel */}
      <Sidebar />

      {/* 2. Main Content viewport */}
      <main className="flex flex-col h-full overflow-hidden relative">
        {/* Mobile Sidebar Drawer Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[190] md:hidden transition-opacity duration-300" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="flex-grow overflow-y-auto flex flex-col relative">
          <Header />

          <div className="px-6 pb-6 md:px-10 md:pb-10 flex-grow">
            <Outlet />
          </div>
        </div>

        {/* 3. Persistent Audio Player Bar */}
        <AudioPlayer />
      </main>
    </div>
  );
}
