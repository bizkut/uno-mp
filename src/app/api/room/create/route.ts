import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { GameState } from '@/lib/types';
import { createDeck, shuffle } from '@/lib/game';

export async function POST(req: NextRequest) {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const initialState: GameState = {
      roomId,
      status: 'Lobby',
      players: [],
      deck: shuffle(createDeck()),
      discardPile: [],
      currentPlayerIndex: 0,
      direction: 1,
      currentColor: 'Red',
      winnerId: null,
      lastPlayedCard: null,
    };

    await kv.set(`game:${roomId}`, initialState);
    // Set expiration to 24 hours
    await kv.expire(`game:${roomId}`, 24 * 60 * 60);

    return NextResponse.json({ roomId });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
