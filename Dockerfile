# Build Stage for Frontend
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm install --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# Production Stage
FROM node:20-bookworm-slim
WORKDIR /app

# Install Python 3, pip, ffmpeg, curl and clean up cache
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno (officially recommended JS runtime for yt-dlp challenge solving)
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Setup Python virtual environment and install yt-dlp globally in env
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -U yt-dlp

# Copy package files and install backend dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install --prefix backend

# Copy built frontend assets and backend source
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY backend/ ./backend/

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start backend server
CMD ["npm", "start", "--prefix", "backend"]
