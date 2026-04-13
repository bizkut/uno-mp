import PusherClient from 'pusher-js';

const pusherConfig = {
  appId: process.env.PUSHER_APP_ID || 'dummy',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy',
  secret: process.env.PUSHER_SECRET || 'dummy',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'dummy',
  useTLS: true,
};

let pusherServer: any;

try {
  // Use require to avoid ESM/CJS interop issues during build/runtime in Next.js
  const Pusher = require('pusher');
  pusherServer = new (Pusher.default || Pusher)(pusherConfig);
} catch (error) {
  console.warn('Pusher server could not be initialized:', error);
  pusherServer = {
    trigger: async () => {
      console.warn('Pusher trigger called but server not initialized');
      return {};
    },
  };
}

export { pusherServer };

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy',
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'dummy',
  }
);
