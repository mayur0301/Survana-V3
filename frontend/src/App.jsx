import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { MusicPlayerProvider } from './context/MusicPlayerContext';
import MainRoutes from './MainRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <MusicPlayerProvider>
        <MainRoutes />
      </MusicPlayerProvider>
    </BrowserRouter>
  );
}
