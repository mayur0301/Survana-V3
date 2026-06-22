const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const connectDB = require('./database/mongodb');
const { errorHandler } = require('./middleware');

// Route Imports
const songsRoutes = require('./modules/songs/songs.routes');
const likedRoutes = require('./modules/liked/liked.routes');
const playlistsRoutes = require('./modules/playlists/playlists.routes');
const historyRoutes = require('./modules/history/history.routes');
const lyricsRoutes = require('./modules/lyrics/lyrics.routes');
const configRoutes = require('./modules/config/config.routes');

const app = express();

// Connect to MongoDB
connectDB();

// Standard Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to allow browser streaming without CORS blockage
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS']
}));
app.use(morgan('dev'));
app.use(express.json());

// API Routes Mounting
app.use('/api', songsRoutes); // Mounts /api/search, /api/stream/:id, /api/download/:id
app.use('/api/liked', likedRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/lyrics', lyricsRoutes);
app.use('/api/config', configRoutes);

// Serve static frontend files in production or if dist build exists
const distPath = path.join(__dirname, '../../frontend/dist');
if (config.NODE_ENV === 'production' || fs.existsSync(distPath)) {
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
