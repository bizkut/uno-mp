import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { GameState, Card } from '@/lib/types';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const { roomId } = await req.json();

    const state = await kv.get<GameState>(`game:${roomId}`);

    if (!state) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (state.players.length < 2) {
        return NextResponse.json({ error: 'At least 2 players are required' }, { status: 400 });
    }

    const deck = [...state.deck];
    const players = state.players.map((player) => {
      const hand: Card[] = [];
      for (let i = 0; i < 7; i++) {
        const card = deck.pop();
        if (card) hand.push(card);
      }
      return { ...player, hand };
    });

    // Initial discard
    let initialDiscard = deck.pop()!;
    // Standard UNO: if the first card is Wild Draw 4, put it back and reshuffle or just pick another.
    // For simplicity, we just pick until it's not a Wild Draw 4 or Wild.
    while (initialDiscard.color === 'Wild') {
        deck.unshift(initialDiscard);
        initialDiscard = deck.pop()!;
    }

    const updatedState: GameState = {
      ...state,
      status: 'Playing',
      players,
      deck,
      discardPile: [initialDiscard],
      currentPlayerIndex: 0,
      currentColor: initialDiscard.color,
      lastPlayedCard: initialDiscard,
    };

    await kv.set(`game:${roomId}`, updatedState);

    // Broadcast sanitized state
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
