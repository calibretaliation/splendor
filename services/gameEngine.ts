import { GameState, Player, GemColor, Card, Noble, ActionType, AIActionDecision, AIStrategyId, LogEventKind, AIMoveSource, PlayerConfig } from '../types';
import { INITIAL_DECKS, NOBLES, TARGET_SCORE_DEFAULT, MAX_GEMS, MAX_RESERVED, AVATAR_NAMES, DEFAULT_AI_STRATEGIES } from '../constants';
import { chooseAIMove } from './ai/decisionEngine';
import {
  createPlayer,
  cloneGameState,
  shuffle,
  drawMany,
  drawTop,
  getGemCount,
  canBuyCard,
  replenishMarketSlot,
  nextPlayerIndex,
  NON_GOLD_GEMS,
} from './gameUtils';

export { getGemCount, canBuyCard } from './gameUtils';

// --- Initialization ---

export interface InitializeGameArgs {
  seats: PlayerConfig[];
  targetScore?: number;
}

export const initializeGame = ({
  seats,
  targetScore = TARGET_SCORE_DEFAULT,
}: InitializeGameArgs): GameState => {
  const deckLevel1 = shuffle(INITIAL_DECKS.level1);
  const deckLevel2 = shuffle(INITIAL_DECKS.level2);
  const deckLevel3 = shuffle(INITIAL_DECKS.level3);

  const { drawn: marketLevel1, deck: remainingLevel1 } = drawMany(deckLevel1, 4);
  const { drawn: marketLevel2, deck: remainingLevel2 } = drawMany(deckLevel2, 4);
  const { drawn: marketLevel3, deck: remainingLevel3 } = drawMany(deckLevel3, 4);

  const decks = {
    level1: remainingLevel1,
    level2: remainingLevel2,
    level3: remainingLevel3,
  };

  const market = {
    level1: marketLevel1,
    level2: marketLevel2,
    level3: marketLevel3,
  };

  const nobles = shuffle(NOBLES).slice(0, 5);

  const totalPlayers = 4;
  const players: Player[] = Array.from({ length: totalPlayers }, (_, seatIndex) => {
    const provided = seats[seatIndex];
    if (provided) {
      const name = provided.name || `Explorer ${seatIndex + 1}`;
      const avatarId = provided.avatarId ?? (provided.isHuman ? seatIndex + 1 : seatIndex + 5);
      const id = provided.id || (provided.isHuman ? `player-${seatIndex + 1}` : `ai-${seatIndex + 1}`);
      return createPlayer({
        id,
        name,
        isHuman: provided.isHuman,
        avatarId,
        aiStrategyId: provided.aiStrategyId,
      });
    }

    const aiName = AVATAR_NAMES[seatIndex] ?? `AI ${seatIndex + 1}`;
    const aiStrategy = DEFAULT_AI_STRATEGIES[seatIndex % DEFAULT_AI_STRATEGIES.length] as AIStrategyId;
    return createPlayer({
      id: `ai-${seatIndex + 1}`,
      name: aiName,
      isHuman: false,
      avatarId: seatIndex + 5,
      aiStrategyId: aiStrategy,
    });
  });

  return {
    players,
    currentPlayerIndex: 0,
    market,
    decks,
    nobles,
    gems: { white: 7, blue: 7, green: 7, red: 7, black: 7, gold: 5 },
    winnerId: null,
    targetScore,
    turn: 1,
    lastAction: "Mission Started",
    history: [],
  };
};
const logAction = (state: GameState, kind: LogEventKind, summary: string, payload?: Record<string, unknown>) => {
  if (!state.history) state.history = [];
  const actor = state.players[state.currentPlayerIndex];

  state.history.push({
    turn: state.turn,
    playerId: actor.id,
    playerName: actor.name,
    kind,
    summary,
    payload,
    timestamp: Date.now(),
  });
};

const formatBonusLabel = (color: GemColor): string => color.charAt(0).toUpperCase() + color.slice(1);

// --- Action Handlers ---

export const takeGems = (state: GameState, gemsToTake: GemColor[]): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (gemsToTake.includes(GemColor.Gold)) return state;
  if (getGemCount(currentPlayer) + gemsToTake.length > MAX_GEMS) return state;

  if (gemsToTake.length === 2 && gemsToTake[0] === gemsToTake[1]) {
    if (state.gems[gemsToTake[0]] < 4) return state;
  }

  for (const color of gemsToTake) {
    if (state.gems[color] <= 0) return state;
  }

  const newState = cloneGameState(state);
  const player = newState.players[newState.currentPlayerIndex];

  gemsToTake.forEach(color => {
    newState.gems[color]--;
    player.gems[color]++;
  });

  const gemCounts = gemsToTake.reduce<Partial<Record<GemColor, number>>>((acc, color) => {
    acc[color] = (acc[color] ?? 0) + 1;
    return acc;
  }, {});

  player.lastAction = `Took ${gemsToTake.join(', ')}`;
  newState.lastAction = `${player.name} took gems`;
  logAction(newState, 'TAKE_GEMS', newState.lastAction, { gems: gemsToTake, gemCounts });
  return checkNoblesAndEndTurn(newState);
};

export const reserveCard = (state: GameState, card?: Card, fromDeckLevel?: 1 | 2 | 3): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.reservedCards.length >= MAX_RESERVED) return state;

  let selectedCard: Card | undefined = card;
  if (fromDeckLevel) {
    const deckKey = `level${fromDeckLevel}` as const;
    if (state.decks[deckKey].length === 0) return state;
  } else {
    if (!card) return state;
    const levelKey = `level${card.level}` as const;
    const exists = state.market[levelKey].some(c => c.id === card.id);
    if (!exists) return state;
  }

  const newState = cloneGameState(state);
  const player = newState.players[newState.currentPlayerIndex];

  if (fromDeckLevel) {
    const deckKey = `level${fromDeckLevel}` as const;
    const { card: drawn, deck } = drawTop(newState.decks[deckKey]);
    if (!drawn) return state;
    newState.decks[deckKey] = deck;
    selectedCard = drawn;
  } else if (selectedCard) {
    const levelKey = `level${selectedCard.level}` as const;
    const slotIndex = newState.market[levelKey].findIndex(c => c.id === selectedCard?.id);
    if (slotIndex === -1) return state;
    selectedCard = newState.market[levelKey][slotIndex];
    replenishMarketSlot(newState, selectedCard.level, slotIndex);
  }

  if (!selectedCard) return state;

  player.reservedCards.push(selectedCard);

  if (newState.gems.gold > 0 && getGemCount(player) < MAX_GEMS) {
    newState.gems.gold--;
    player.gems.gold++;
  }

  player.lastAction = `Reserved ${selectedCard.id}`;
  newState.lastAction = `${player.name} reserved a card`;
  logAction(newState, 'RESERVE', newState.lastAction, {
    cardId: selectedCard.id,
    cardName: selectedCard.name,
    cardLevel: selectedCard.level,
    cardPoints: selectedCard.points,
    cardBonus: selectedCard.bonus,
    fromDeckLevel,
  });
  return checkNoblesAndEndTurn(newState);
};

export const buyCard = (state: GameState, card: Card, isReserved: boolean): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!canBuyCard(currentPlayer, card)) return state;

  if (!isReserved) {
    const levelKey = `level${card.level}` as const;
    const exists = state.market[levelKey].some(c => c.id === card.id);
    if (!exists) return state;
  } else {
    const owned = currentPlayer.reservedCards.some(c => c.id === card.id);
    if (!owned) return state;
  }

  const newState = cloneGameState(state);
  const player = newState.players[newState.currentPlayerIndex];

  for (const color of NON_GOLD_GEMS) {
    const cost = card.cost[color] ?? 0;
    if (cost === 0) continue;

    const bonus = player.bonuses[color] ?? 0;
    const effectiveCost = Math.max(0, cost - bonus);
    if (effectiveCost === 0) continue;

    const available = player.gems[color];
    const spentFromColor = Math.min(available, effectiveCost);
    player.gems[color] -= spentFromColor;
    newState.gems[color] += spentFromColor;

    const remaining = effectiveCost - spentFromColor;
    if (remaining > 0) {
      player.gems[GemColor.Gold] -= remaining;
      newState.gems[GemColor.Gold] += remaining;
    }
  }

  player.bonuses[card.bonus] = (player.bonuses[card.bonus] ?? 0) + 1;
  player.points += card.points;

  if (isReserved) {
    player.reservedCards = player.reservedCards.filter(c => c.id !== card.id);
  } else {
    const levelKey = `level${card.level}` as const;
    const slotIndex = newState.market[levelKey].findIndex(c => c.id === card.id);
    if (slotIndex !== -1) {
      replenishMarketSlot(newState, card.level, slotIndex);
    }
  }

  const bonusLabel = formatBonusLabel(card.bonus);
  const pointsLabel = typeof card.points === 'number' ? card.points : 0;

  player.lastAction = `Built ${card.id} (${bonusLabel}, ${pointsLabel} pts)`;
  newState.lastAction = `${player.name} built ${bonusLabel} module (${pointsLabel} pts)`;
  logAction(newState, 'BUY', newState.lastAction, {
    cardId: card.id,
    cardName: card.name,
    cardLevel: card.level,
    cardPoints: card.points,
    cardBonus: card.bonus,
    isReserved,
  });
  return checkNoblesAndEndTurn(newState);
};

// --- Turn Management ---

const checkNoblesAndEndTurn = (state: GameState): GameState => {
  const player = state.players[state.currentPlayerIndex];

  for (let i = state.nobles.length - 1; i >= 0; i--) {
    const noble = state.nobles[i];
    let qualifies = true;
    for (const color of Object.keys(noble.requirements) as GemColor[]) {
      if (player.bonuses[color] < (noble.requirements[color] || 0)) {
        qualifies = false;
        break;
      }
    }
    if (qualifies) {
      player.nobles.push(noble);
      player.points += noble.points;
      state.nobles.splice(i, 1);
      logAction(state, 'NOBLE', `${player.name} gained ${noble.name || noble.id}`, { nobleId: noble.id });
      break; 
    }
  }

  const nextIndex = nextPlayerIndex(state.currentPlayerIndex, state.players.length);
  state.currentPlayerIndex = nextIndex;
  if (nextIndex === 0) {
    state.turn++;
    const winners = state.players.filter(p => p.points >= state.targetScore);
    if (winners.length > 0) {
      winners.sort((a, b) => b.points - a.points);
      state.winnerId = winners[0].id;
    }
  }

  return state;
};


// --- AI Logic (Strategy + Gemini) ---

const findCardInMarket = (state: GameState, cardId: string): Card | null => {
  const levels: Array<keyof typeof state.market> = ['level3', 'level2', 'level1'];
  for (const level of levels) {
    const match = state.market[level].find(c => c.id === cardId);
    if (match) return match;
  }
  return null;
};

const passTurn = (state: GameState, strategy?: AIStrategyId, source?: AIMoveSource): GameState => {
  const newState = cloneGameState(state);
  const aiPlayer = newState.players[newState.currentPlayerIndex];
  newState.lastAction = `${aiPlayer.name} passed`;
  logAction(newState, 'PASS', newState.lastAction, { strategy, source });
  return checkNoblesAndEndTurn(newState);
};

const applyAIDecision = (state: GameState, decision: AIActionDecision): GameState => {
  if (!decision) return passTurn(state);

  switch (decision.kind) {
    case 'TAKE_GEMS':
      if (decision.gems && decision.gems.length > 0) {
        return takeGems(state, decision.gems);
      }
      return passTurn(state, decision.strategyUsed, decision.source);

    case 'RESERVE': {
      if (decision.reserveFromDeckLevel) {
        return reserveCard(state, undefined, decision.reserveFromDeckLevel);
      }
      if (decision.cardId) {
        const target = findCardInMarket(state, decision.cardId);
        if (target) return reserveCard(state, target);
      }
      return passTurn(state, decision.strategyUsed, decision.source);
    }

    case 'BUY': {
      if (!decision.cardId) return passTurn(state, decision.strategyUsed, decision.source);
      const player = state.players[state.currentPlayerIndex];
      const fromReserve = decision.fromReserve ?? player.reservedCards.some(c => c.id === decision.cardId);
      const target = fromReserve
        ? player.reservedCards.find(c => c.id === decision.cardId)
        : findCardInMarket(state, decision.cardId);
      if (target) {
        return buyCard(state, target, !!fromReserve);
      }
      return passTurn(state, decision.strategyUsed, decision.source);
    }

    case 'PASS':
    default:
      return passTurn(state, decision.strategyUsed, decision.source);
  }
};

export const performAIMove = async (state: GameState): Promise<GameState> => {
  const aiPlayer = state.players[state.currentPlayerIndex];
  if (aiPlayer.isHuman) return state;

  const decision = await chooseAIMove({ state, player: aiPlayer, helpers: { canBuyCard, getGemCount } });
  console.log(`[AI] ${aiPlayer.name} strategy=${aiPlayer.aiStrategyId ?? 'balanced'} source=${decision?.source ?? 'unknown'} kind=${decision?.kind ?? 'none'}`);
  return applyAIDecision(state, decision);
};