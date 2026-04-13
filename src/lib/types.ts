export type Color = 'Red' | 'Blue' | 'Green' | 'Yellow' | 'Wild';
export type Value = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'Skip'|'Reverse'|'DrawTwo'|'Wild'|'WildDrawFour';

export interface Card {
  id: string; // Unique ID (e.g., 'Red_Skip_1')
  filename: string; // e.g., 'Red_Skip.jpg'
  color: Color;
  value: Value;
}

export interface Player {
  id: string; // Unique session/user ID
  name: string;
  hand: Card[];
  handCount?: number; // Added for public state broadcasts
  hasCalledUno: boolean;
  isHost: boolean;
}

export interface GameState {
  roomId: string;
  status: 'Lobby' | 'Playing' | 'Finished';
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  currentColor: Color;
  winnerId: string | null;
  lastPlayedCard: Card | null;
}

export interface ServerToClientEvents {
  'game-updated': (state: GameState) => void;
  'player-joined': (player: Player) => void;
}
