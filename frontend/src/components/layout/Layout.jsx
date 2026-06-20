import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AudioPlayer from '../player/AudioPlayer';

export default function Layout() {
  return (
    <div className="app-container">
      {/* 1. Sidebar Panel */}
      <Sidebar />

      {/* 2. Main Content viewport */}
      <main className="main-content">
        <Header />

        <div className="view-container">
          <Outlet />
        </div>
      </main>

      {/* 3. Persistent Audio Player Bar */}
      <AudioPlayer />
    </div>
  );
}
