import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { GameState, Card, Color } from '@/lib/types';
import { pusherServer } from '@/lib/pusher';
import { canPlayCard } from '@/lib/game';

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId, cardId, chosenColor } = await req.json();

    const state = await kv.get<GameState>(`game:${roomId}`);

    if (!state || state.status !== 'Playing') {
      return NextResponse.json({ error: 'Game not in progress' }, { status: 400 });
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    const playerHand = [...currentPlayer.hand];
    const cardIndex = playerHand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return NextResponse.json({ error: 'Card not in hand' }, { status: 400 });
    }

    const card = playerHand[cardIndex];
    if (!canPlayCard(card, state)) {
      return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }

    // Move card from hand to discard pile
    playerHand.splice(cardIndex, 1);
    const updatedPlayers = [...state.players];
    updatedPlayers[state.currentPlayerIndex] = { ...currentPlayer, hand: playerHand };

    let nextPlayerIndex = state.currentPlayerIndex;
    let nextDirection = state.direction;
    let nextColor: Color = card.color === 'Wild' ? (chosenColor as Color) : card.color;

    // Apply card effects
    let skipNext = false;
    let drawCount = 0;

    if (card.value === 'Skip') {
      skipNext = true;
    } else if (card.value === 'Reverse') {
      if (state.players.length === 2) {
          skipNext = true; // In 2 player games, Reverse acts like Skip
      } else {
          nextDirection = (state.direction === 1 ? -1 : 1) as 1 | -1;
      }
    } else if (card.value === 'DrawTwo') {
      skipNext = true;
      drawCount = 2;
    } else if (card.value === 'WildDrawFour') {
      skipNext = true;
      drawCount = 4;
    }

    // Advance turn
    const advanceTurn = (currentIndex: number, direction: number, playerCount: number) => {
        let next = currentIndex + direction;
        if (next < 0) next = playerCount - 1;
        if (next >= playerCount) next = 0;
        return next;
    };

    nextPlayerIndex = advanceTurn(nextPlayerIndex, nextDirection, state.players.length);
    
    // Apply Skip (including those from DrawTwo/DrawFour)
    if (skipNext) {
        // If there's a draw count, the next player draws cards
        if (drawCount > 0) {
            const victim = updatedPlayers[nextPlayerIndex];
            const victimHand = [...victim.hand];
            const deck = [...state.deck];
            for (let i = 0; i < drawCount; i++) {
                const drawn = deck.pop();
                if (drawn) victimHand.push(drawn);
            }
            updatedPlayers[nextPlayerIndex] = { ...victim, hand: victimHand };
            state.deck = deck; // Update state deck if we drew
        }
        nextPlayerIndex = advanceTurn(nextPlayerIndex, nextDirection, state.players.length);
    }

    // Check for win
    let status: GameState['status'] = state.status;
    let winnerId = state.winnerId;
    if (playerHand.length === 0) {
      status = 'Finished';
      winnerId = playerId;
    }

    const updatedState: GameState = {
      ...state,
      status,
      players: updatedPlayers,
      discardPile: [...state.discardPile, card],
      currentPlayerIndex: nextPlayerIndex,
      direction: nextDirection,
      currentColor: nextColor,
      winnerId,
      lastPlayedCard: card,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error playing card:', error);
    return NextResponse.json({ error: 'Failed to play card' }, { status: 500 });
  }
}
