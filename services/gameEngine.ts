import { GameState, Player, GemColor, Card, Noble, ActionType, Cost, AIActionDecision, AIStrategyId, LogEventKind, AIMoveSource } from '../types';
import { INITIAL_DECKS, NOBLES, TARGET_SCORE_DEFAULT, MAX_GEMS, MAX_RESERVED, AVATAR_NAMES, DEFAULT_AI_STRATEGIES } from '../constants';
import { chooseAIMove } from './ai/decisionEngine';

// --- Initialization ---

export interface PlayerConfig {
  name: string;
  isHuman: boolean;
  id: string;
}

export const initializeGame = (
  playerConfigs: PlayerConfig[],
  targetScore: number = TARGET_SCORE_DEFAULT,
  aiStrategyOverride?: AIStrategyId,
  aiStrategiesBySeat?: AIStrategyId[],
): GameState => {
  const decks = {
    level1: [...INITIAL_DECKS.level1].sort(() => Math.random() - 0.5),
    level2: [...INITIAL_DECKS.level2].sort(() => Math.random() - 0.5),
    level3: [...INITIAL_DECKS.level3].sort(() => Math.random() - 0.5),
  };

  const market = {
    level1: decks.level1.splice(0, 4),
    level2: decks.level2.splice(0, 4),
    level3: decks.level3.splice(0, 4),
  };

  const nobles = [...NOBLES].sort(() => Math.random() - 0.5).slice(0, 5);

  const totalPlayers = 4;
  const players: Player[] = [];

  // Add human players
  playerConfigs.forEach((config, index) => {
    players.push({
      id: config.id,
      name: config.name || `Explorer ${index + 1}`,
      isHuman: true,
      avatarId: index + 1,
      gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
      bonuses: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
      reservedCards: [],
      points: 0,
      nobles: [],
    });
  });

  // Fill rest with AI
  const humansCount = players.length;
  for (let i = humansCount; i < totalPlayers; i++) {
    players.push({
      id: `ai-${i + 1}`,
      name: AVATAR_NAMES[i],
      isHuman: false,
      avatarId: i + 5,
      aiStrategyId: aiStrategiesBySeat?.[i] || aiStrategyOverride || (DEFAULT_AI_STRATEGIES[(i - humansCount) % DEFAULT_AI_STRATEGIES.length] as AIStrategyId),
      gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
      bonuses: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
      reservedCards: [],
      points: 0,
      nobles: [],
    });
  }

  // Shuffle players order? Optional. For now keeping order of join.

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

// --- Helper Functions ---

export const getGemCount = (player: Player): number => {
  return Object.values(player.gems).reduce((a, b) => a + b, 0);
};

export const canBuyCard = (player: Player, card: Card): boolean => {
  let goldNeeded = 0;
  
  for (const color of Object.keys(card.cost) as GemColor[]) {
    if (color === GemColor.Gold) continue;
    
    const cost = card.cost[color] || 0;
    const bonus = player.bonuses[color] || 0;
    const owned = player.gems[color] || 0;
    
    const remainingCost = Math.max(0, cost - bonus);
    if (owned < remainingCost) {
      goldNeeded += (remainingCost - owned);
    }
  }
  
  return player.gems.gold >= goldNeeded;
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

// --- Action Handlers ---

export const takeGems = (state: GameState, gemsToTake: GemColor[]): GameState => {
  const newState = JSON.parse(JSON.stringify(state)); // Deep copy
  const player = newState.players[newState.currentPlayerIndex];
  
  // Validation
  if (gemsToTake.includes(GemColor.Gold)) return state; // Cannot take gold directly
  if (getGemCount(player) + gemsToTake.length > MAX_GEMS) return state; // Over limit (simplified: just block action)
  
  // Logic for 2 same color (must have 4 available)
  if (gemsToTake.length === 2 && gemsToTake[0] === gemsToTake[1]) {
    if (newState.gems[gemsToTake[0]] < 4) return state;
  }
  
  // Logic for 3 different (must have > 0)
  for (const color of gemsToTake) {
    if (newState.gems[color] <= 0) return state;
  }

  // Execute
  gemsToTake.forEach(color => {
    newState.gems[color]--;
    player.gems[color]++;
  });

  player.lastAction = `Took ${gemsToTake.join(', ')}`;
  newState.lastAction = `${player.name} took gems`;
    logAction(newState, 'TAKE_GEMS', newState.lastAction, { gems: gemsToTake });
  return checkNoblesAndEndTurn(newState);
};

  export const reserveCard = (state: GameState, card?: Card, fromDeckLevel?: 1 | 2 | 3): GameState => {
  const newState = JSON.parse(JSON.stringify(state));
  const player = newState.players[newState.currentPlayerIndex];

  if (player.reservedCards.length >= MAX_RESERVED) return state;

  let actualCard = card;
  
  // If reserving from deck (blind)
  if (fromDeckLevel) {
     const deckKey = `level${fromDeckLevel}` as keyof typeof newState.decks;
     if (newState.decks[deckKey].length === 0) return state;
     actualCard = newState.decks[deckKey].pop();
  } else {
     // Remove from market
      if (!card) return state;
     const levelKey = `level${card.level}` as keyof typeof newState.market;
     const idx = newState.market[levelKey].findIndex((c: Card) => c.id === card.id);
     if (idx === -1) return state; // Should not happen
     
     // Replenish
     const deckKey = `level${card.level}` as keyof typeof newState.decks;
     const newCard = newState.decks[deckKey].length > 0 ? newState.decks[deckKey].pop() : null;
     if (newCard) {
        newState.market[levelKey][idx] = newCard;
     } else {
        newState.market[levelKey].splice(idx, 1);
     }
  }

    if (!actualCard) return state;
  // Add to player
  player.reservedCards.push(actualCard);

  // Take Gold if available
  if (newState.gems.gold > 0 && getGemCount(player) < MAX_GEMS) {
    newState.gems.gold--;
    player.gems.gold++;
  }

  player.lastAction = `Reserved ${actualCard.id}`;
  newState.lastAction = `${player.name} reserved a card`;
  logAction(newState, 'RESERVE', newState.lastAction, { cardId: actualCard.id, fromDeckLevel });
  return checkNoblesAndEndTurn(newState);
};

export const buyCard = (state: GameState, card: Card, isReserved: boolean): GameState => {
  if (!canBuyCard(state.players[state.currentPlayerIndex], card)) return state;

  const newState = JSON.parse(JSON.stringify(state));
  const player = newState.players[newState.currentPlayerIndex];

  // Pay cost
  for (const color of Object.keys(card.cost) as GemColor[]) {
    if (color === GemColor.Gold) continue;
    const cost = card.cost[color] || 0;
    const bonus = player.bonuses[color] || 0;
    const effectiveCost = Math.max(0, cost - bonus);
    
    const owned = player.gems[color] || 0;
    
    if (owned >= effectiveCost) {
      player.gems[color] -= effectiveCost;
      newState.gems[color] += effectiveCost;
    } else {
      // Pay with gems + gold
      const goldNeeded = effectiveCost - owned;
      player.gems[color] -= owned;
      newState.gems[color] += owned;
      player.gems.gold -= goldNeeded;
      newState.gems.gold += goldNeeded;
    }
  }

  // Add card benefits
  player.bonuses[card.bonus]++;
  player.points += card.points;

  // Remove from source
  if (isReserved) {
    const rIdx = player.reservedCards.findIndex((c: Card) => c.id === card.id);
    player.reservedCards.splice(rIdx, 1);
  } else {
     const levelKey = `level${card.level}` as keyof typeof newState.market;
     const idx = newState.market[levelKey].findIndex((c: Card) => c.id === card.id);
     
     // Replenish
     const deckKey = `level${card.level}` as keyof typeof newState.decks;
     const newCard = newState.decks[deckKey].length > 0 ? newState.decks[deckKey].pop() : null;
     if (newCard) {
        newState.market[levelKey][idx] = newCard;
     } else {
        newState.market[levelKey].splice(idx, 1);
     }
  }

  player.lastAction = `Built ${card.id}`;
  newState.lastAction = `${player.name} built a module`;
  logAction(newState, 'BUY', newState.lastAction, { cardId: card.id, isReserved });
  return checkNoblesAndEndTurn(newState);
};

// --- Turn Management ---

const checkNoblesAndEndTurn = (state: GameState): GameState => {
  const player = state.players[state.currentPlayerIndex];
  
  // Check nobles
  const availableNobles = [...state.nobles];
  for (let i = availableNobles.length - 1; i >= 0; i--) {
    const noble = availableNobles[i];
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
      state.nobles.splice(i, 1); // Remove from board
      logAction(state, 'NOBLE', `${player.name} gained ${noble.name || noble.id}`, { nobleId: noble.id });
      // Only 1 noble per turn technically, but for simplicity taking one is fine. 
      // Splendor rules say you pick one if multiple. We'll auto-pick the first match.
      break; 
    }
  }

  // Check Win Condition (Immediate check or end of round? Rules say finish round)
  // For simplicity: Check if score >= target.
  // Ideally we finish the round (Player 4 goes last). 
  
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 4;
  if (state.currentPlayerIndex === 0) {
      state.turn++;
      // Check winners at start of new round or end of p4
      const winners = state.players.filter(p => p.points >= state.targetScore);
      if (winners.length > 0) {
          // Tie breaker: fewest dev cards. Ignored for simplicity.
          winners.sort((a,b) => b.points - a.points);
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
  const newState = JSON.parse(JSON.stringify(state));
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