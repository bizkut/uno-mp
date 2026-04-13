const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const next = require('next');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

function canPlayCard(card, state) {
  const topCard = state.discardPile[state.discardPile.length - 1];
  if (!topCard) return true;
  if (card.color === 'Wild' || card.value === 'WildDrawFour') return true;
  return card.color === state.currentColor || card.value === topCard.value;
}

function sanitizeState(state, playerId) {
  return {
    ...state,
    deck: [],
    players: state.players.map(p => ({
      ...p,
      hand: p.id === playerId ? p.hand : [],
      handCount: p.hand.length
    }))
  };
}

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer);

  // Helper to broadcast to everyone in a room with their private hands
  async function broadcastState(roomId, state) {
    const sockets = await io.in(`room-${roomId}`).fetchSockets();
    // This is slightly inefficient for many players but perfect for UNO
    // We'll store socketId -> playerId mapping in memory or Redis
    // For MVP, we'll just send a personalized event to each socket if they have a playerId
    
    // Actually, a simpler way: broadcast the sanitized state (no hands) to the room,
    // and let players have a way to know their hand.
    // Or, emit a specific 'your-hand' event.
    
    // Let's do: broadcast sanitized state (no hands) to the room
    io.to(`room-${roomId}`).emit('state-updated', sanitizeState(state, null));
    
    // And for each player, we need to send their hand. 
    // We'll just rely on them having their hand from the 'joined' or 'sync-state' or 'private-update'
    // Let's use the 'sync-state' approach where they can ask for it, 
    // OR better: the server.js will send a private event to each socket.
  }

  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentPlayerId = null;

    socket.on('create-room', async () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const colors = ['Red', 'Blue', 'Green', 'Yellow'];
        const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'DrawTwo'];
        const deck = [];
        colors.forEach(c => {
            deck.push({ id: `${c}_0_${uuidv4()}`, filename: `${c}_0.jpg`, color: c, value: '0' });
            values.slice(1).forEach(v => {
                const f = (v === 'DrawTwo') ? 'Draw_2' : v;
                const rf = (c === 'Red' && v === 'Reverse') ? 'RED_Reverse.jpg' : `${c}_${f}.jpg`;
                deck.push({ id: `${c}_${v}_${uuidv4()}`, filename: rf, color: c, value: v });
                deck.push({ id: `${c}_${v}_${uuidv4()}`, filename: rf, color: c, value: v });
            });
        });
        for(let i=0; i<4; i++) {
            deck.push({ id: `Wild_Wild_${uuidv4()}`, filename: 'Wild.jpg', color: 'Wild', value: 'Wild' });
            deck.push({ id: `Wild_W4_${uuidv4()}`, filename: 'Wild_Draw_4.jpg', color: 'Wild', value: 'WildDrawFour' });
        }

        const state = {
          roomId,
          status: 'Lobby',
          players: [],
          deck: deck.sort(() => Math.random() - 0.5),
          discardPile: [],
          currentPlayerIndex: 0,
          direction: 1,
          currentColor: 'Red',
          winnerId: null,
          lastPlayedCard: null,
        };

        await redis.set(`game:${roomId}`, JSON.stringify(state));
        await redis.expire(`game:${roomId}`, 24 * 60 * 60);
        socket.emit('room-created', { roomId });
    });

    socket.on('join-room', async ({ roomId, playerName, isHost }) => {
      roomId = roomId.toUpperCase();
      let state = JSON.parse(await redis.get(`game:${roomId}`));
      
      if (!state) {
        socket.emit('error', 'Room not found');
        return;
      }

      if (state.status !== 'Lobby') {
        socket.emit('error', 'Game already started');
        return;
      }

      const playerId = uuidv4();
      const newPlayer = {
        id: playerId,
        name: playerName,
        hand: [],
        hasCalledUno: false,
        isHost: !!isHost,
      };

      state.players.push(newPlayer);
      await redis.set(`game:${roomId}`, JSON.stringify(state));
      
      currentRoomId = roomId;
      currentPlayerId = playerId;
      socket.join(`room-${roomId}`);
      
      socket.emit('joined', { roomId, playerId, player: newPlayer });
      io.to(`room-${roomId}`).emit('state-updated', sanitizeState(state, null));
    });

    socket.on('sync-state', async ({ roomId, playerId }) => {
        socket.join(`room-${roomId}`);
        const state = JSON.parse(await redis.get(`game:${roomId}`));
        if (state) {
            socket.emit('state-updated', sanitizeState(state, playerId));
        }
    });

    socket.on('start-game', async ({ roomId, playerId }) => {
      let state = JSON.parse(await redis.get(`game:${roomId}`));
      if (!state) return;
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.isHost) return;

      const deck = [...state.deck];
      state.players = state.players.map((p) => {
        const hand = [];
        for (let i = 0; i < 7; i++) {
          const card = deck.pop();
          if (card) hand.push(card);
        }
        return { ...p, hand };
      });

      let initialDiscard = deck.pop();
      while (initialDiscard.color === 'Wild') {
        deck.unshift(initialDiscard);
        initialDiscard = deck.pop();
      }

      state.status = 'Playing';
      state.deck = deck;
      state.discardPile = [initialDiscard];
      state.currentPlayerIndex = 0;
      state.currentColor = initialDiscard.color;
      state.lastPlayedCard = initialDiscard;

      await redis.set(`game:${roomId}`, JSON.stringify(state));
      
      // Personalized broadcast
      const sockets = await io.in(`room-${roomId}`).fetchSockets();
      // This is MVP, so we'll just send everyone a signal to re-sync
      io.to(`room-${roomId}`).emit('re-sync');
    });

    socket.on('play-card', async ({ roomId, playerId, cardId, chosenColor }) => {
      let state = JSON.parse(await redis.get(`game:${roomId}`));
      if (!state || state.status !== 'Playing') return;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.id !== playerId) return;

      const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      const card = currentPlayer.hand[cardIndex];
      if (!canPlayCard(card, state)) return;

      currentPlayer.hand.splice(cardIndex, 1);
      
      let nextDirection = state.direction;
      let nextColor = card.color === 'Wild' ? chosenColor : card.color;
      let skipNext = false;
      let drawCount = 0;

      if (card.value === 'Skip') skipNext = true;
      else if (card.value === 'Reverse') {
        if (state.players.length === 2) skipNext = true;
        else nextDirection = state.direction === 1 ? -1 : 1;
      }
      else if (card.value === 'DrawTwo') { skipNext = true; drawCount = 2; }
      else if (card.value === 'WildDrawFour') { skipNext = true; drawCount = 4; }

      const advance = (idx, dir, count) => {
        let n = idx + dir;
        if (n < 0) n = count - 1;
        if (n >= count) n = 0;
        return n;
      };

      state.currentPlayerIndex = advance(state.currentPlayerIndex, nextDirection, state.players.length);

      if (skipNext) {
        if (drawCount > 0) {
          const victim = state.players[state.currentPlayerIndex];
          for (let i = 0; i < drawCount; i++) {
            const c = state.deck.pop();
            if (c) victim.hand.push(c);
          }
        }
        state.currentPlayerIndex = advance(state.currentPlayerIndex, nextDirection, state.players.length);
      }

      if (currentPlayer.hand.length === 0) {
        state.status = 'Finished';
        state.winnerId = playerId;
      }

      state.direction = nextDirection;
      state.currentColor = nextColor;
      state.lastPlayedCard = card;
      state.discardPile.push(card);

      await redis.set(`game:${roomId}`, JSON.stringify(state));
      io.to(`room-${roomId}`).emit('re-sync');
    });

    socket.on('draw-card', async ({ roomId, playerId }) => {
      let state = JSON.parse(await redis.get(`game:${roomId}`));
      if (!state || state.status !== 'Playing') return;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.id !== playerId) return;

      if (state.deck.length === 0) {
        const top = state.discardPile.pop();
        state.deck = state.discardPile.sort(() => Math.random() - 0.5);
        state.discardPile = [top];
      }

      const drawn = state.deck.pop();
      if (drawn) {
        currentPlayer.hand.push(drawn);
        if (!canPlayCard(drawn, state)) {
           const n = state.currentPlayerIndex + state.direction;
           state.currentPlayerIndex = (n < 0) ? state.players.length - 1 : (n >= state.players.length ? 0 : n);
        }
      }

      await redis.set(`game:${roomId}`, JSON.stringify(state));
      io.to(`room-${roomId}`).emit('re-sync');
    });
  });

  server.all('*', (req, res) => handle(req, res));

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
