import { AIStrategyId, Card, GemColor, Noble } from './types';
// Card definitions come from cards.txt; Vite's ?raw imports the text content at build time.
import cardsRaw from './cards.txt?raw';

export const TARGET_SCORE_DEFAULT = 15;
export const MAX_GEMS = 10;
export const MAX_RESERVED = 3;

export const GEM_DISPLAY_COLORS: Record<GemColor, { base: string; border: string; text: string }> = {
  [GemColor.White]: { base: '#f4f4f5', border: '#e4e4e7', text: '#111827' }, // white
  [GemColor.Blue]: { base: '#3b82f6', border: '#2563eb', text: '#e0f2fe' },    // blue
  [GemColor.Green]: { base: '#22c55e', border: '#16a34a', text: '#ecfdf5' },  // green
  [GemColor.Red]: { base: '#ef4444', border: '#dc2626', text: '#fee2e2' },    // red
  [GemColor.Black]: { base: '#9ca3af', border: '#6b7280', text: '#111827' },  // grey
  [GemColor.Gold]: { base: '#fb923c', border: '#f97316', text: '#431407' },   // orange
};

export const CARD_LEVEL_BORDER_COLORS: Record<1 | 2 | 3, string> = {
  1: '#22c55e', // green
  2: '#facc15', // yellow
  3: '#a855f7', // violet
};

// Helper to create cost objects
const c = (w: number, u: number, g: number, r: number, k: number) => ({
  [GemColor.White]: w,
  [GemColor.Blue]: u,
  [GemColor.Green]: g,
  [GemColor.Red]: r,
  [GemColor.Black]: k,
});

// Build the entire deck from cards.txt (CSV-like). Levels are provided by the "Tier" column.
const parseCards = (): Card[] => {
  const colorMap: Record<string, GemColor> = {
    Black: GemColor.Black,
    Blue: GemColor.Blue,
    Green: GemColor.Green,
    Red: GemColor.Red,
    White: GemColor.White,
  };

  return cardsRaw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.toLowerCase().startsWith('color'))
    .map((line, idx) => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 8) return null;

      const [colorLabel, pointsStr, costBlack, costWhite, costRed, costBlue, costGreen, tierStr] = parts;
      const bonus = colorMap[colorLabel];
      if (!bonus) return null;

      const points = Number(pointsStr) || 0;
      const level = Math.max(1, Math.min(3, Number(tierStr) || 1)) as 1 | 2 | 3;
      const cost = {
        [GemColor.Black]: Number(costBlack) || 0,
        [GemColor.White]: Number(costWhite) || 0,
        [GemColor.Red]: Number(costRed) || 0,
        [GemColor.Blue]: Number(costBlue) || 0,
        [GemColor.Green]: Number(costGreen) || 0,
      };

      return {
        id: `card-${idx}`,
        level,
        points,
        bonus,
        cost,
        imageIndex: idx % 5,
      } as Card;
    })
    .filter((card): card is Card => Boolean(card));
};

const ALL_CARDS: Card[] = parseCards();

export const INITIAL_DECKS = {
  level1: ALL_CARDS.filter(c => c.level === 1),
  level2: ALL_CARDS.filter(c => c.level === 2),
  level3: ALL_CARDS.filter(c => c.level === 3),
};

export const NOBLES: Noble[] = [
  { id: 'n1', points: 3, requirements: c(3,3,3,0,0), name: "Galactic Council" },
  { id: 'n2', points: 3, requirements: c(0,3,3,3,0), name: "Star Fleet Admiral" },
  { id: 'n3', points: 3, requirements: c(0,0,3,3,3), name: "Nebula Merchant" },
  { id: 'n4', points: 3, requirements: c(3,0,0,3,3), name: "Cyber Lord" },
  { id: 'n5', points: 3, requirements: c(3,3,0,0,3), name: "Void Walker" },
  { id: 'n6', points: 3, requirements: c(4,4,0,0,0), name: "Tech Priest" },
  { id: 'n7', points: 3, requirements: c(0,4,4,0,0), name: "Bio Engineer" },
  { id: 'n8', points: 3, requirements: c(0,0,4,4,0), name: "Red Dwarf Miner" },
  { id: 'n9', points: 3, requirements: c(0,0,0,4,4), name: "Black Hole Physicist" },
  { id: 'n10', points: 3, requirements: c(4,0,0,0,4), name: "Quantum Theorist" },
];

export const AVATAR_NAMES = [
  "Capt. Pixel", "Unit 734", "X-Æ-12", "Star Gazer", 
  "Void Runner", "Nebula", "Quasar", "Pulsar"
];

export const DEFAULT_AI_STRATEGIES: AIStrategyId[] = [
  'aggressive',
  'defensive',
  'balanced',
  'random',
];