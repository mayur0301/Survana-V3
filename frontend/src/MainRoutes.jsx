import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Liked from './pages/Liked';
import History from './pages/History';
import PlaylistDetail from './pages/PlaylistDetail';

export default function MainRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="liked" element={<Liked />} />
        <Route path="history" element={<History />} />
        <Route path="playlist/:id" element={<PlaylistDetail />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
