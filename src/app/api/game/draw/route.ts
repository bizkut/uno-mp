import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { GameState, Card } from '@/lib/types';
import { pusherServer } from '@/lib/pusher';
import { createDeck, shuffle, canPlayCard } from '@/lib/game';

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId } = await req.json();

    const state = await kv.get<GameState>(`game:${roomId}`);

    if (!state || state.status !== 'Playing') {
      return NextResponse.json({ error: 'Game not in progress' }, { status: 400 });
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    let deck = [...state.deck];
    if (deck.length === 0) {
      // Reshuffle discard pile back into deck
      const discard = [...state.discardPile];
      const topCard = discard.pop()!;
      deck = shuffle(discard);
      state.discardPile = [topCard];
    }

    const drawnCard = deck.pop();
    if (!drawnCard) {
        return NextResponse.json({ error: 'Deck is empty' }, { status: 500 });
    }

    const updatedPlayers = [...state.players];
    const playerHand = [...currentPlayer.hand, drawnCard];
    updatedPlayers[state.currentPlayerIndex] = { ...currentPlayer, hand: playerHand };

    // Standard rules: If the drawn card is playable, the player CAN play it immediately.
    // However, for simplicity in MVP, we can just give the card and end turn OR let them try playing.
    // Let's check if the card is playable. If NOT, we end their turn.
    // If it IS playable, we give them the card and let them play it in the next request (or they can draw and it ends turn).
    
    // In many versions, drawing ends your turn immediately unless you play that specific card.
    // Let's implement: Draw 1 card, if it's playable, stay on current turn (let them play it), otherwise end turn.
    
    let nextPlayerIndex = state.currentPlayerIndex;
    if (!canPlayCard(drawnCard, state)) {
        // End turn
        const advanceTurn = (currentIndex: number, direction: number, playerCount: number) => {
            let next = currentIndex + direction;
            if (next < 0) next = playerCount - 1;
            if (next >= playerCount) next = 0;
            return next;
        };
        nextPlayerIndex = advanceTurn(state.currentPlayerIndex, state.direction, state.players.length);
    }

    const updatedState: GameState = {
      ...state,
      players: updatedPlayers,
      deck,
      currentPlayerIndex: nextPlayerIndex,
    };

    await kv.set(`game:${roomId}`, updatedState);

    // Broadcast sanitized state
    const sanitizedState = {
        ...updatedState,
        deck: [],
        players: updatedState.players.map(p => ({
            ...p,
            hand: [],
            handCount: p.hand.length
        }))
    };

    await pusherServer.trigger(`presence-room-${roomId}`, 'state-updated', sanitizedState);

    return NextResponse.json({ success: true, drawnCardId: drawnCard.id });
  } catch (error) {
    console.error('Error drawing card:', error);
    return NextResponse.json({ error: 'Failed to draw card' }, { status: 500 });
  }
}
