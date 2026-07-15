# Phase 5: Advanced UI/UX & Diagnostics Telemetry

This phase focuses on enhancing the frontend experience with synchronized lyrics parsing, persisting user state, custom styling options, and backend monitoring.

---

## 1. LRC Synchronized Lyrics Parser
Allow users to view scrolling lyrics synchronized with the music time updates in real-time.

### Parsing Utility (`frontend/src/utils/lyricsParser.js`)
```javascript
export function parseLRC(lrcText) {
  const lines = lrcText.split('\n');
  const lyrics = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3]);
      
      const timeInSeconds = minutes * 60 + seconds + (milliseconds > 99 ? milliseconds / 1000 : milliseconds / 100);
      const text = line.replace(timeRegex, '').trim();
      
      if (text) {
        lyrics.push({ time: timeInSeconds, text });
      }
    }
  }

  // Sort lyrics by time code
  return lyrics.sort((a, b) => a.time - b.time);
}
```

### Component Implementation (`frontend/src/components/player/LyricsOverlay.jsx`)
```jsx
import React, { useState, useEffect } from 'react';

export default function LyricsOverlay({ lyrics, currentTime }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    // Find active lyric index matching the current playback time
    const idx = lyrics.findIndex((lyric, index) => {
      const nextLyric = lyrics[index + 1];
      return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time);
    });
    
    if (idx !== -1) setActiveIndex(idx);
  }, [currentTime, lyrics]);

  return (
    <div className="w-full max-h-60 overflow-y-auto flex flex-col items-center gap-4 py-8 scroll-smooth">
      {lyrics.map((line, idx) => (
        <span
          key={idx}
          className={`text-center transition-all duration-300 font-semibold ${
            idx === activeIndex
              ? 'text-accent-purple scale-110 text-lg opacity-100 glow-sm'
              : 'text-zinc-500 text-sm opacity-60'
          }`}
        >
          {line.text}
        </span>
      ))}
    </div>
  );
}
```

---

## 2. Playback State & Queue Persistence
Ensure that if a user reloads the browser, their current song, volume, loop mode, and active queue index are restored.

### Context Integration (`frontend/src/context/MusicPlayerContext.jsx`)
```javascript
// Load initial state from LocalStorage
const savedQueue = JSON.parse(localStorage.getItem('survana_queue') || '[]');
const savedSong = JSON.parse(localStorage.getItem('survana_current_song') || 'null');
const savedIndex = parseInt(localStorage.getItem('survana_queue_index') || '-1');

const [queue, setQueue] = useState(savedQueue);
const [currentSong, setCurrentSong] = useState(savedSong);
const [activeQueueIndex, setActiveQueueIndex] = useState(savedIndex);

// Save state to LocalStorage on updates
useEffect(() => {
  localStorage.setItem('survana_queue', JSON.stringify(queue));
  localStorage.setItem('survana_current_song', JSON.stringify(currentSong));
  localStorage.setItem('survana_queue_index', activeQueueIndex.toString());
}, [queue, currentSong, activeQueueIndex]);
```

---

## 3. Premium Interface Customization (Themes)
Allow users to switch between three premium design themes:
- **Default (Glass Obsidian)**: Deep obsidian background with translucent borders.
- **OLED Dark**: True black background (saving battery on mobile screens) with vibrant neon accents.
- **Cyberpunk Orange**: Vibrant orange theme with glow filters.

### Implementation Class Toggle
Toggle CSS classes on `document.documentElement` to alter the CSS theme variables:
```javascript
const applyTheme = (themeName) => {
  const root = document.documentElement;
  root.classList.remove('theme-obsidian', 'theme-oled', 'theme-cyberpunk');
  root.classList.add(`theme-${themeName}`);
};
```

---

## 4. Winston Centralized Server Diagnostics Telemetry
Replace the basic `console.log` statements with a professional Logger system that writes structured files for runtime errors and performance anomalies.

### Code Implementation (`backend/src/utils/logger.js`)
```javascript
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'survana-backend' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

module.exports = logger;
```
