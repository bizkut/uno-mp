import { Card, Color, Value, GameState, Player } from './types';
import { v4 as uuidv4 } from 'uuid';

export const COLORS: Color[] = ['Red', 'Blue', 'Green', 'Yellow'];
export const VALUES: Value[] = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'Skip', 'Reverse', 'DrawTwo'
];

export function createDeck(): Card[] {
  const deck: Card[] = [];

  COLORS.forEach((color) => {
    // One '0' card
    deck.push(createCard(color, '0'));

    // Two of each '1'-'9' and action cards
    const others: Value[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'DrawTwo'];
    others.forEach((value) => {
      deck.push(createCard(color, value));
      deck.push(createCard(color, value));
    });
  });

  // Four Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push(createCard('Wild', 'Wild'));
  }

  // Four Wild Draw Four cards
  for (let i = 0; i < 4; i++) {
    deck.push(createCard('Wild', 'WildDrawFour'));
  }

  return deck;
}

function createCard(color: Color, value: Value): Card {
  let filename = '';
  if (color === 'Wild') {
    if (value === 'Wild') filename = 'Wild.jpg';
    if (value === 'WildDrawFour') filename = 'Wild_Draw_4.jpg';
  } else {
    let valueStr = value as string;
    if (value === 'DrawTwo') valueStr = 'Draw_2';
    
    // Special case for RED_Reverse.jpg
    if (color === 'Red' && value === 'Reverse') {
        filename = `RED_Reverse.jpg`;
    } else {
        filename = `${color}_${valueStr}.jpg`;
    }
  }

  return {
    id: `${color}_${value}_${uuidv4().substring(0, 8)}`,
    filename,
    color,
    value,
  };
}

export function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function canPlayCard(card: Card, gameState: GameState): boolean {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  
  if (card.color === 'Wild' || card.value === 'WildDrawFour') return true;
  
  // Match by color or value or symbol
  return card.color === gameState.currentColor || card.value === topCard.value;
}
