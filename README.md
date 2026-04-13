# UNO MP - Multiplayer UNO Game

A real-time multiplayer UNO game designed for physical and remote play.

## Features
- **Player Mode:** Use your mobile device as your hand. Works independently for remote play.
- **Console Mode:** Use a shared screen (Tablet/TV) as a central game board for physical gatherings.
- **Real-time:** Instant updates via Pusher.
- **Serverless:** Built with Next.js and Vercel KV.

## Prerequisites
- Node.js 20+
- A [Pusher](https://pusher.com/) account (Channels).
- A [Vercel](https://vercel.com/) account (KV/Redis).

## Setup
1. Clone the project.
2. Navigate to the `app` directory: `cd app`.
3. Install dependencies: `npm install`.
4. Copy `.env.example` to `.env.local` and fill in your Pusher and Vercel KV credentials.
5. Run the development server: `npm run dev`.

## Deployment
Deploy directly to Vercel. Ensure you link your Vercel KV store and add the Pusher environment variables in the Vercel project settings.
