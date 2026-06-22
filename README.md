# 🎵 Survana V3 — The Ultimate Self-Hosted Music Hub

[![License: ISC](https://img.shields.io/badge/License-ISC-orange.svg)](https://opensource.org/licenses/ISC)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-red.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express.js-yellow.svg)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker-blue.svg)](https://www.docker.com/)

**Survana V3** is a gorgeous, premium, and self-hosted music search and streaming web application. Bypassing standard CORS limitations, it utilizes a custom range-request proxy powered by `yt-dlp` to stream high-quality audio directly in your browser. Complete with interactive visualizers, offline synced lyrics, and a unique two-tier caching system, Survana V3 redefines the self-hosted audio experience.

---

## ✨ Features

### 🎨 Fiery Glassmorphic Aesthetic
*   **Harmonious Color Palette:** Designed with beautiful HSL-based fiery orange, yellow, crimson, and charcoal tones.
*   **Immersive Layout:** Features floating UI micro-animations, glassmorphic translucent panels (`backdrop-filter`), custom scrollbars, and modern typography via Google Font's **Outfit**.
*   **Responsive Control:** Seamlessly adapts from desktop grids to sidebar-collapsed compact players.

### ⚡ Smart Streaming & Bypassing CORS
*   **Range-Request Forwarding:** Express server handles and forwards standard browser HTTP Range headers (e.g., `bytes=0-`) to proxy direct audio feeds smoothly.
*   **Scrubbing & Seeking:** Enables instant scrubbing to any timestamp of the song, even while it's still buffering.

### 💾 Revolutionary Dual-Tier Caching
*   **Server-Side Cache:** Automatically downloads and caches streamed songs in the background as `.webm` files inside the `/cache` directory, eliminating subsequent YouTube requests.
*   **Local Directory Picker Cache (Offline mode):** Leverages the cutting-edge HTML5 **File System Access API** (`showDirectoryPicker`). You can pick a local folder on your computer once, and Survana will save downloaded `.mp3` tracks directly onto your physical drive. If permission is granted on load, it plays files directly from your hard drive, enabling complete offline capability!

### 🎤 Synchronized Dynamic Lyrics
*   **LRCLib Integration:** Automatically retrieves plain and synchronized lyrics (LRC format) via the `lrclib.net` API.
*   **Scroll-to-Time:** Tracks audio playback down to the millisecond, automatically scrolling and highlighting active lyrics lines.

### 🌌 Interactive Live Audio Spectrum
*   **Web Audio API Analyser:** Connects the browser's audio source into a canvas analyser node.
*   **Spectacular Visualizer:** Animates double-sided frequency bars bouncing from the center, using custom shifting HSL hues and glow effects, surrounding a pulsing radial-gradient bass drum.

---

## 🛠️ Architecture & Technologies

### Frontend
*   **React 19 + Vite:** Hot module replacement, lightning-fast bundler.
*   **React Router DOM v7:** Client-side SPA routing.
*   **Lucide React:** Beautiful, consistent vector iconography.
*   **IndexedDB:** Persistently stores local folder handles so you only have to connect your music folder once.

### Backend
*   **Node.js & Express:** Custom REST API endpoints (`/api/search`, `/api/stream/:id`, `/api/download/:id`, `/api/lyrics`, etc.).
*   **yt-dlp Core:** Leverages Python-based `yt_dlp` with Deno/Node runtimes to bypass YouTube's signature challenges.
*   **Local File Database:** Lightweight JSON-based database (`playlists.json`, `liked.json`, `history.json`) for seamless portability.
*   **Middlewares:** `helmet` (configured for cross-origin resources), `cors`, `morgan`, and global exception handers.

---

## 🚀 Setup & Installation

### Prerequisites
Make sure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Python 3](https://www.python.org/) & `pip` (Required for running `yt-dlp`)
*   [FFmpeg](https://ffmpeg.org/) (Required for audio format extraction)

---

### Method 1: Local Development

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/mayur0301/Survana-V3.git
    cd Survana-V3
    ```

2.  **Install All Dependencies:**
    Use the root helper script to install root, backend, and frontend dependencies in one go:
    ```bash
    npm run install-all
    ```

3.  **Environment Variables:**
    Create a `.env` file inside the `backend/` directory:
    ```env
    PORT=5000
    NODE_ENV=development
    # Optional: Set browser to fetch cookies from if yt-dlp gets rate-limited (e.g. 'chrome', 'firefox')
    YT_DLP_COOKIES_BROWSER=chrome
    # Optional: Hardcoded cookies.txt string content to bypass bot detection on servers
    YT_DLP_COOKIES_TEXT=
    ```

4.  **Run Development Servers:**
    Start both the frontend Vite server and the backend Express server concurrently:
    ```bash
    npm run dev
    ```
    *   **Frontend:** `http://localhost:5173`
    *   **Backend:** `http://localhost:5000`

---

### Method 2: Docker (Recommended for Production)

Docker completely automates the installation of Node.js, Python, FFmpeg, and **Deno** (which `yt-dlp` uses to solve JS signature challenges).

1.  **Build the Docker Image:**
    ```bash
    docker build -t survana-v3 .
    ```

2.  **Run the Container:**
    Map port `5000` and mount a volume for cache and database persistence:
    ```bash
    docker run -d \
      -p 5000:5000 \
      -v survana-db:/app/backend/src/database \
      -v survana-cache:/app/backend/cache \
      --name survana-instance \
      survana-v3
    ```

3.  **Access App:**
    Open your browser and navigate to `http://localhost:5000`.

---

## 📡 API Endpoints Reference

### Songs Module
*   `GET /api/search?q=<query>`: Performs flat-playlist JSON dump search using `yt-dlp`.
*   `GET /api/stream/:id`: Resolves best audio URL, records song into history database, proxies stream, and initiates background download cache.
*   `GET /api/download/:id`: Initiates a server-side download and pipes the resulting `.webm` attachment directly to the client.

### Playlists & Likes Module
*   `GET /api/liked`: Retrieves list of user's liked tracks.
*   `POST /api/liked`: Adds a song to liked tracks.
*   `DELETE /api/liked/:id`: Removes a song from liked tracks.
*   `GET /api/playlists`: Retrieves all custom playlists.
*   `POST /api/playlists`: Creates a new playlist.
*   `POST /api/playlists/:id/songs`: Adds a song to a playlist.
*   `DELETE /api/playlists/:id`: Deletes a playlist.

### Lyrics Module
*   `GET /api/lyrics?title=<title>&artist=<artist>`: Fetches plain/synced lyrics from LRCLib.

---

## 🔒 Cookie & Challenge Solver Setup
To run seamlessly in cloud environments like Render/Railway/Fly.io without encountering YouTube's `"Sign in to confirm you are not a bot"` message:
1.  Place a `cookies.txt` file in the root directory.
2.  Alternatively, supply the contents of your `cookies.txt` file via the `YT_DLP_COOKIES_TEXT` environment variable.
3.  In docker builds, **Deno** is automatically installed and configured as the JS runtime solver (`--js-runtimes deno`) to solve challenges.

---

## 📝 License

Distributed under the ISC License. See `LICENSE` for more information.

---

<p align="center">Made with ❤️ for Lofi and Self-Hosted enthusiasts.</p>
