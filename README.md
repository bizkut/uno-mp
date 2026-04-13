# 🃏 UNO MP - Self-Hosted Multiplayer UNO

A real-time multiplayer UNO game designed for both remote play and physical gatherings. This version is optimized for self-hosting using Docker Compose, Socket.io, and a local Redis instance.

## 🚀 Key Features

- **📱 Mobile Hand View**: Each player sees only their cards on their personal device.
- **📺 Optional Console Mode**: Shared game board for large screens.
- **⚡ Real-Time Sync**: Bi-directional communication via Socket.io WebSockets.
- **🐳 Dockerized**: Fully containerized for easy self-hosting.
- **💾 Local State**: Persistent game state using a local Redis container.
- **🛡️ Server-Authoritative**: All game logic runs on the Node.js server.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14/15](https://nextjs.org/)
- **Server**: Custom Node.js/Express server.
- **Real-time**: [Socket.io](https://socket.io/)
- **State Storage**: [Redis](https://redis.io/)
- **Styling**: Tailwind CSS
- **Orchestration**: Docker Compose

## 🏁 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

### Running with Docker Compose

1. **Clone the repo**:
   ```bash
   git clone https://github.com/bizkut/uno-mp.git
   cd uno-mp
   ```

2. **Start the containers**:
   ```bash
   docker-compose up --build
   ```

3. **Play!**
   - Access the app at `http://localhost:3000`.
   - Create a room on one device, join from others.
   - For Console Mode, visit `http://localhost:3000/console/[ROOM_ID]`.

### Local Development (without Docker)

If you have Redis running locally:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run build**:
   ```bash
   npm run build
   ```

3. **Start the server**:
   ```bash
   node server.js
   ```

## 🚢 Deployment

Simply run `docker-compose up -d` on any VPS with Docker installed. Ensure port `3000` is exposed.

## 📜 UNO Rules Implemented

- **Matching**: Color, number, or symbol.
- **Action Cards**: Skip, Reverse, Draw Two.
- **Wild Cards**: Wild, Wild Draw Four.
- **Winning**: Be the first to clear your hand.

---
*Created for fun by [bizkut](https://github.com/bizkut).*
