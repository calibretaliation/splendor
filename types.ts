export enum GemColor {
  White = 'white', // Diamond/Quartz
  Blue = 'blue',   // Sapphire/Tanzanite
  Green = 'green', // Emerald/Kryptonite
  Red = 'red',     // Ruby/Magma
  Black = 'black', // Onyx/Obsidian
  Gold = 'gold',   // Joker/Gold
}

export type AIStrategyId = 'aggressive' | 'defensive' | 'balanced' | 'random' | 'gemini' | 'gemma';

export type AIMoveSource = 'local' | 'gemini' | 'gemma';
export type AIActionKind = ActionType | 'PASS';

export interface AIActionDecision {
  kind: AIActionKind;
  gems?: GemColor[]; // For TAKE_GEMS
  cardId?: string; // For BUY or RESERVE
  fromReserve?: boolean; // If BUY from reserved
  reserveFromDeckLevel?: 1 | 2 | 3; // For blind reserve
  reasoning?: string;
  strategyUsed?: AIStrategyId;
  source: AIMoveSource;
}

export interface Cost {
  [GemColor.White]?: number;
  [GemColor.Blue]?: number;
  [GemColor.Green]?: number;
  [GemColor.Red]?: number;
  [GemColor.Black]?: number;
}

export interface Card {
  id: string;
  level: 1 | 2 | 3;
  points: number;
  bonus: GemColor; // The gem this card produces
  cost: Cost;
  name?: string; // Flavor text
  imageIndex?: number; // For pixel art variance
}

export interface Noble {
  id: string;
  points: number;
  requirements: Cost;
  name?: string;
}

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  avatarId: number;
  aiStrategyId?: AIStrategyId;
  gems: { [key in GemColor]: number };
  bonuses: { [key in GemColor]: number }; // Total cards bought of each color
  reservedCards: Card[];
  points: number;
  nobles: Noble[];
  lastAction?: string;
}

export interface PlayerConfig {
  id: string;
  name: string;
  isHuman: boolean;
  aiStrategyId?: AIStrategyId;
  avatarId?: number;
}

export interface LobbySeatState {
  occupant: PlayerConfig | null;
  aiStrategyId: AIStrategyId;
}

export interface LobbySnapshot {
  seats: LobbySeatState[];
  hostId: string | null;
  targetScore: number;
  defaultAIStrategy: AIStrategyId;
}

export type LogEventKind = ActionType | 'PASS' | 'NOBLE' | 'SYSTEM';

export interface ActionLogEntry {
  turn: number;
  playerId: string;
  playerName: string;
  kind: LogEventKind;
  summary: string;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  market: {
    level1: Card[];
    level2: Card[];
    level3: Card[];
  };
  nobles: Noble[];
  gems: { [key in GemColor]: number };
  decks: {
    level1: Card[];
    level2: Card[];
    level3: Card[];
  };
  winnerId: string | null;
  targetScore: number;
  turn: number;
  lastAction?: string;
  history: ActionLogEntry[];
}

export type ActionType = 'TAKE_GEMS' | 'RESERVE' | 'BUY';