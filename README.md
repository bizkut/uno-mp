# 🃏 UNO MP - Real-time Multiplayer UNO

A high-performance, real-time multiplayer UNO game designed for both remote play and physical gatherings. Play using your mobile device as your private "hand" while optionally using a central shared screen (Console Mode) for a cinema-like game board experience.

## 🚀 Key Features

- **📱 Mobile Hand View**: Each player sees only their cards on their personal device.
- **📺 Optional Console Mode**: Transform any large screen (TV, Tablet, PC) into a shared game board that tracks the discard pile, current color, and turn order.
- **⚡ Real-Time Sync**: Instant card plays and turn updates via Pusher WebSockets.
- **🌍 Hybrid Play**: Works perfectly for friends in the same room OR friends scattered across the globe.
- **🎨 Visual Fidelity**: High-quality card assets with smooth CSS animations and responsive Tailwind-based design.
- **🛡️ Server-Authoritative**: Game logic and state are managed on the server (Vercel KV/Redis) to prevent cheating and ensure consistency.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Real-time**: [Pusher Channels](https://pusher.com/channels)
- **State Storage**: [Vercel KV](https://vercel.com/storage/kv) (Redis)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Language**: TypeScript

## 🏁 Getting Started

### Prerequisites

- Node.js 20+
- A Pusher account (free tier is enough)
- A Vercel KV store (free tier is enough)

### Local Development

1. **Clone the repo**:
   ```bash
   git clone https://github.com/bizkut/uno-mp.git
   cd uno-mp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your credentials:
   - `NEXT_PUBLIC_PUSHER_KEY`
   - `NEXT_PUBLIC_PUSHER_CLUSTER`
   - `PUSHER_APP_ID`
   - `PUSHER_SECRET`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

4. **Run the app**:
   ```bash
   npm run dev
   ```

5. **Play!**
   - Open `http://localhost:3000` to host or join as a player.
   - For Console Mode, join a room then visit `/console/[ROOM_ID]`.

## 🚢 Deployment

The easiest way to deploy is using [Vercel](https://vercel.com/new).

1. Connect your GitHub repository to Vercel.
2. Link a **Vercel KV** storage in the "Storage" tab of your Vercel project.
3. Add your **Pusher** credentials as Environment Variables in the project settings.
4. Deploy!

## 📜 UNO Rules Implemented

- **Matching**: Match the top card by color, number, or symbol.
- **Action Cards**:
  - **Skip**: Skips the next player's turn.
  - **Reverse**: Flips the direction of play.
  - **Draw Two**: Next player draws 2 and is skipped.
- **Wild Cards**:
  - **Wild**: Change the active color.
  - **Wild Draw Four**: Change the color, next player draws 4 and is skipped.
- **Winning**: First player to clear their hand wins!

---
*Created for fun by [bizkut](https://github.com/bizkut).*
