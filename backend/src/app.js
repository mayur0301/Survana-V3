const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const { errorHandler } = require('./middleware');

// Route Imports
const songsRoutes = require('./modules/songs/songs.routes');
const likedRoutes = require('./modules/liked/liked.routes');
const playlistsRoutes = require('./modules/playlists/playlists.routes');
const historyRoutes = require('./modules/history/history.routes');
const lyricsRoutes = require('./modules/lyrics/lyrics.routes');

const app = express();

// Standard Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to allow browser streaming without CORS blockage
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Range']
}));
app.use(morgan('dev'));
app.use(express.json());

// API Routes Mounting
app.use('/api', songsRoutes); // Mounts /api/search, /api/stream/:id, /api/download/:id
app.use('/api/liked', likedRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/lyrics', lyricsRoutes);

// Serve static frontend files in production
if (config.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  
  // Wildcard fallback to serve index.html for React SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error Handling Middleware
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`Survana V3 server is running on port ${config.PORT}`);
});
