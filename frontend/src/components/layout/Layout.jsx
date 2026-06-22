import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AudioPlayer from '../player/AudioPlayer';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

export default function Layout() {
  const { isSidebarOpen, setIsSidebarOpen } = useMusicPlayer();

  return (
    <div className={`app-container ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Sidebar Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. Sidebar Panel */}
      <Sidebar />

      {/* 2. Main Content viewport */}
      <main className="main-content">
        <div className="main-scrollable-content">
          <Header />

          <div className="view-container">
            <Outlet />
          </div>
        </div>

        {/* 3. Persistent Audio Player Bar */}
        <AudioPlayer />
      </main>
    </div>
  );
}
