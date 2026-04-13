import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { GameState } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const playerId = searchParams.get('playerId');

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const state = await kv.get<GameState>(`game:${roomId}`);

    if (!state) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Sanitize state based on who is asking
    const sanitizedState = {
        ...state,
        deck: [], // Always hide deck
        players: state.players.map(p => ({
            ...p,
            // Only show hand to the player who owns it
            hand: p.id === playerId ? p.hand : [],
            handCount: p.hand.length
        }))
    };

    return NextResponse.json(sanitizedState);
  } catch (error) {
    console.error('Error fetching state:', error);
    return NextResponse.json({ error: 'Failed to fetch state' }, { status: 500 });
  }
}
