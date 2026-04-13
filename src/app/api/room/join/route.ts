import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { GameState, Player } from '@/lib/types';
import { pusherServer } from '@/lib/pusher';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerName, isHost } = await req.json();

    if (!roomId || !playerName) {
      return NextResponse.json({ error: 'Missing roomId or playerName' }, { status: 400 });
    }

    const state = await kv.get<GameState>(`game:${roomId}`);

    if (!state) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (state.status !== 'Lobby') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    const playerId = uuidv4();
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      hand: [],
      hasCalledUno: false,
      isHost: isHost || false,
    };

    const updatedState: GameState = {
      ...state,
      players: [...state.players, newPlayer],
    };

    await kv.set(`game:${roomId}`, updatedState);

    // Broadcast update via Pusher
    // Strip private data for broadcast
    const sanitizedState = {
        ...updatedState,
        deck: [], // Hide deck
        players: updatedState.players.map(p => ({
            ...p,
            hand: [], // Hide hands in public broadcast
            handCount: p.hand.length
        }))
    };

    await pusherServer.trigger(`presence-room-${roomId}`, 'state-updated', sanitizedState);

    return NextResponse.json({ roomId, playerId, player: newPlayer });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
