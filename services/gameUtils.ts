import { AIStrategyId, Card, GemColor, GameState, Player } from '../types';

export const NON_GOLD_GEMS: GemColor[] = [
  GemColor.White,
  GemColor.Blue,
  GemColor.Green,
  GemColor.Red,
  GemColor.Black,
];

export const ALL_GEMS: GemColor[] = [...NON_GOLD_GEMS, GemColor.Gold];

export const createEmptyGemInventory = (): Record<GemColor, number> => ({
  [GemColor.White]: 0,
  [GemColor.Blue]: 0,
  [GemColor.Green]: 0,
  [GemColor.Red]: 0,
  [GemColor.Black]: 0,
  [GemColor.Gold]: 0,
});

export const createEmptyBonusMap = (): Record<GemColor, number> => ({
  [GemColor.White]: 0,
  [GemColor.Blue]: 0,
  [GemColor.Green]: 0,
  [GemColor.Red]: 0,
  [GemColor.Black]: 0,
  [GemColor.Gold]: 0,
});

export interface CreatePlayerArgs {
  id: string;
  name: string;
  isHuman: boolean;
  avatarId: number;
  aiStrategyId?: AIStrategyId;
}

export const createPlayer = ({ id, name, isHuman, avatarId, aiStrategyId }: CreatePlayerArgs): Player => ({
  id,
  name,
  isHuman,
  avatarId,
  aiStrategyId,
  gems: createEmptyGemInventory(),
  bonuses: createEmptyBonusMap(),
  reservedCards: [],
  points: 0,
  nobles: [],
});

export const cloneGameState = <T>(value: T): T => {
  const structuredCloneFn: ((input: T) => T) | undefined = (globalThis as unknown as { structuredClone?: (input: T) => T }).structuredClone;
  if (typeof structuredCloneFn === 'function') {
    return structuredCloneFn(value);
  }
  return JSON.parse(JSON.stringify(value));
};

export const shuffle = <T>(items: readonly T[], rng: () => number = Math.random): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const drawMany = <T>(deck: T[], count: number): { drawn: T[]; deck: T[] } => {
  const copy = [...deck];
  const drawn = copy.splice(0, count);
  return { drawn, deck: copy };
};

export const drawTop = <T>(deck: T[]): { card: T | undefined; deck: T[] } => {
  const copy = [...deck];
  const card = copy.shift();
  return { card, deck: copy };
};

export const getGemCount = (player: Player): number => {
  return ALL_GEMS.reduce((total, gem) => total + (player.gems[gem] ?? 0), 0);
};

export const canBuyCard = (player: Player, card: Card): boolean => {
  let goldNeeded = 0;

  for (const color of NON_GOLD_GEMS) {
    const cost = card.cost[color] ?? 0;
    if (cost === 0) continue;

    const bonus = player.bonuses[color] ?? 0;
    const owned = player.gems[color] ?? 0;

    const remainingCost = Math.max(0, cost - bonus);
    if (owned < remainingCost) {
      goldNeeded += remainingCost - owned;
    }
  }

  return player.gems[GemColor.Gold] >= goldNeeded;
};

export const nextPlayerIndex = (current: number, total: number): number => {
  return (current + 1) % total;
};

export const replenishMarketSlot = (
  state: GameState,
  level: 1 | 2 | 3,
  slotIndex: number,
): void => {
  const levelKey = `level${level}` as const;
  const { card, deck } = drawTop(state.decks[levelKey]);
  state.decks[levelKey] = deck;
  if (card) {
    state.market[levelKey][slotIndex] = card;
  } else {
    state.market[levelKey].splice(slotIndex, 1);
  }
};
