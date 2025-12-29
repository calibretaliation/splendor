import { ActionType, AIActionDecision, AIStrategyId, GameState, Player, Card } from '../../types';
import { MAX_GEMS, MAX_RESERVED } from '../../constants';
import { NON_GOLD_GEMS } from '../gameUtils';

// Helper contract supplied by the game engine so we avoid circular imports
export interface AIHelpers {
  canBuyCard: (player: Player, card: Card) => boolean;
  getGemCount: (player: Player) => number;
}

export interface ChooseAIMoveInput {
  state: GameState;
  player: Player;
  helpers: AIHelpers;
}


export const chooseAIMove = async ({ state, player, helpers }: ChooseAIMoveInput): Promise<AIActionDecision> => {
  const strategy: AIStrategyId = player.aiStrategyId ?? 'balanced';

  if (strategy === 'gemini' || strategy === 'gemma') {
    const remote = await requestGeminiMove(state, player, getModelForStrategy(strategy), strategy);
    if (remote) return remote;
  }

  return pickLocalStrategy(state, player, helpers, strategy === 'gemini' || strategy === 'gemma' ? 'balanced' : strategy);
};

// --- Local Strategy Engine ---

const pickLocalStrategy = (
  state: GameState,
  player: Player,
  helpers: AIHelpers,
  strategy: AIStrategyId,
): AIActionDecision => {
  if (strategy === 'random') {
    return randomAction(state, player, helpers);
  }
  if (strategy === 'aggressive') {
    return aggressiveAction(state, player, helpers);
  }
  if (strategy === 'defensive') {
    return defensiveAction(state, player, helpers);
  }
  // balanced fallback
  return balancedAction(state, player, helpers);
};

const aggressiveAction = (state: GameState, player: Player, helpers: AIHelpers): AIActionDecision => {
  const buyable = listAffordableCards(state, player, helpers).sort((a, b) => scoreCardAggressive(b.card) - scoreCardAggressive(a.card));
  if (buyable.length > 0) {
    return {
      kind: 'BUY',
      cardId: buyable[0].card.id,
      fromReserve: buyable[0].fromReserve,
      source: 'local',
      strategyUsed: 'aggressive',
      reasoning: 'Buying the highest value card available',
    };
  }

  if (player.reservedCards.length < MAX_RESERVED) {
    const candidate = pickHighestValueMarketCard(state);
    if (candidate) {
      return {
        kind: 'RESERVE',
        cardId: candidate.id,
        source: 'local',
        strategyUsed: 'aggressive',
        reasoning: 'Reserving a high value card to secure points',
      };
    }
  }

  const gemChoice = chooseGemTake(state, player, helpers, prioritizeNeededColors(state, player));
  if (gemChoice) {
    return {
      kind: 'TAKE_GEMS',
      gems: gemChoice,
      source: 'local',
      strategyUsed: 'aggressive',
      reasoning: 'Gathering gems to afford high value cards',
    };
  }

  return passDecision('aggressive');
};

const defensiveAction = (state: GameState, player: Player, helpers: AIHelpers): AIActionDecision => {
  const buyable = listAffordableCards(state, player, helpers);
  if (buyable.length > 0) {
    return {
      kind: 'BUY',
      cardId: buyable[0].card.id,
      fromReserve: buyable[0].fromReserve,
      source: 'local',
      strategyUsed: 'defensive',
      reasoning: 'Converting resources into secured points',
    };
  }

  if (player.reservedCards.length < MAX_RESERVED) {
    const blockCandidate = findBlockCandidate(state, player, helpers);
    if (blockCandidate) {
      return {
        kind: 'RESERVE',
        cardId: blockCandidate.id,
        source: 'local',
        strategyUsed: 'defensive',
        reasoning: 'Blocking an opponent who is close to buying',
      };
    }
  }

  const gemChoice = chooseGemTake(state, player, helpers, prioritizeNeededColors(state, player));
  if (gemChoice) {
    return {
      kind: 'TAKE_GEMS',
      gems: gemChoice,
      source: 'local',
      strategyUsed: 'defensive',
      reasoning: 'Collecting gems while limiting opponent access',
    };
  }

  return passDecision('defensive');
};

const balancedAction = (state: GameState, player: Player, helpers: AIHelpers): AIActionDecision => {
  const roll = Math.random();
  const buyable = listAffordableCards(state, player, helpers).sort((a, b) => scoreCardBalanced(b.card) - scoreCardBalanced(a.card));

  if (buyable.length > 0 && roll < 0.45) {
    return {
      kind: 'BUY',
      cardId: buyable[0].card.id,
      fromReserve: buyable[0].fromReserve,
      source: 'local',
      strategyUsed: 'balanced',
      reasoning: 'Buying efficiently scored card',
    };
  }

  if (player.reservedCards.length < MAX_RESERVED && roll < 0.65) {
    const candidate = pickHighestValueMarketCard(state);
    if (candidate) {
      return {
        kind: 'RESERVE',
        cardId: candidate.id,
        source: 'local',
        strategyUsed: 'balanced',
        reasoning: 'Holding a useful card for later',
      };
    }
  }

  const gemChoice = chooseGemTake(state, player, helpers, prioritizeNeededColors(state, player));
  if (gemChoice) {
    return {
      kind: 'TAKE_GEMS',
      gems: gemChoice,
      source: 'local',
      strategyUsed: 'balanced',
      reasoning: 'Gathering gems to unlock more buys',
    };
  }

  if (buyable.length > 0) {
    return {
      kind: 'BUY',
      cardId: buyable[0].card.id,
      fromReserve: buyable[0].fromReserve,
      source: 'local',
      strategyUsed: 'balanced',
      reasoning: 'Fallback to available purchase',
    };
  }

  return passDecision('balanced');
};

const randomAction = (state: GameState, player: Player, helpers: AIHelpers): AIActionDecision => {
  const options: AIActionDecision[] = [];
  const buyable = listAffordableCards(state, player, helpers);
  buyable.forEach(b => options.push({ kind: 'BUY', cardId: b.card.id, fromReserve: b.fromReserve, source: 'local', strategyUsed: 'random' }));

  if (player.reservedCards.length < MAX_RESERVED) {
    const candidate = pickHighestValueMarketCard(state);
    if (candidate) options.push({ kind: 'RESERVE', cardId: candidate.id, source: 'local', strategyUsed: 'random' });
  }

  const gemChoice = chooseGemTake(state, player, helpers, prioritizeNeededColors(state, player));
  if (gemChoice) options.push({ kind: 'TAKE_GEMS', gems: gemChoice, source: 'local', strategyUsed: 'random' });

  if (options.length === 0) return passDecision('random');
  return options[Math.floor(Math.random() * options.length)];
};

// --- Gemini/Gemma (LLM) Strategy ---

const MODEL_CANDIDATES = ['gemma-3-27b-it', 'gemini-2.5-flash'] as const;
type ModelChoice = (typeof MODEL_CANDIDATES)[number];

const LLM_MODEL_BY_STRATEGY: Record<'gemini' | 'gemma', ModelChoice> = {
  gemini: 'gemini-2.5-flash',
  gemma: 'gemma-3-27b-it',
};

const getModelForStrategy = (strategy: 'gemini' | 'gemma'): ModelChoice => LLM_MODEL_BY_STRATEGY[strategy];

const requestGeminiMove = async (
  state: GameState,
  player: Player,
  model: ModelChoice,
  llmStrategy: 'gemini' | 'gemma',
): Promise<AIActionDecision | null> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = buildGeminiPrompt(state, player, model);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 160 },
      }),
    });

    if (!response.ok) {
      console.warn('Gemini/Gemma request failed', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = parseGeminiJson(rawText);
    if (!parsed) return null;

    const kind = normalizeActionKind(parsed.kind);
    if (!kind) return null;

    const decision: AIActionDecision = {
      kind,
      gems: parsed.gems as GemColor[] | undefined,
      cardId: parsed.cardId,
      fromReserve: parsed.fromReserve,
      reserveFromDeckLevel: parsed.reserveFromDeckLevel,
      reasoning: parsed.reasoning,
      source: llmStrategy,
      strategyUsed: llmStrategy,
    };

    return decision;
  } catch (error) {
    console.warn('Gemini/Gemma call error', error);
    return null;
  }
};

const getGeminiApiKey = (): string | undefined => {
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : undefined;
  return metaEnv?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.GEMINI_API_KEY : undefined);
};

const buildGeminiPrompt = (state: GameState, player: Player, model: string): string => {
  const otherActions = (state.history || [])
    .filter(h => h.playerId !== player.id)
    .slice(-2)
    .map(h => ({ p: h.playerName, k: h.kind, s: h.summary }));

  const payload = {
    turn: state.turn,
    target: state.targetScore,
    cp: player.id,
    stock: state.gems,
    m: {
      l1: state.market.level1.map(stripCardCompact),
      l2: state.market.level2.map(stripCardCompact),
      l3: state.market.level3.map(stripCardCompact),
    },
    nobles: state.nobles.map(n => ({ id: n.id, pts: n.points, req: n.requirements })),
    self: {
      id: player.id,
      g: player.gems,
      b: player.bonuses,
      r: player.reservedCards.map(stripCardCompact),
    },
    players: state.players.map(p => ({ id: p.id, pts: p.points, g: p.gems, b: p.bonuses })),
    hist: (state.history || []).slice(-6).map(h => ({ p: h.playerId, k: h.kind })),
    othersLast2: otherActions,
    model,
  };

  const rules = 'Rules: TAKE_GEMS=3 distinct colors OR 2 same (pile>=4), no gold directly, keep total gems<=10. RESERVE from market by cardId or blind deck via reserveFromDeckLevel (1-3), max 3 reserved. BUY only if affordable with bonuses+gems+gold. Always return a legal move.';

  return [
    `You are the AI (${player.aiStrategyId ?? 'gemini'} | model=${model}). Output ONLY one minified JSON object on a single line. Do NOT use code fences or markdown.`,
    'Schema {"kind":"BUY|RESERVE|TAKE_GEMS|PASS","cardId":"string?","fromReserve":boolean,"reserveFromDeckLevel":1|2|3|null,"gems":["red"...],"reasoning":"short"}.',
    'If unsure, choose a legal TAKE_GEMS or PASS. Ensure action obeys rules; adjust gems list to available stock.',
    rules,
    `State:${JSON.stringify(payload)}`,
  ].join(' ');
};

const parseGeminiJson = (raw: string): any | null => {
  const tryParse = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const stripFences = (text: string) => text.replace(/```json|```/gi, '').trim();

  const extractBraceBlock = (text: string) => {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) return null;
    return text.slice(first, last + 1);
  };

  const loosen = (text: string) => {
    // Quote bare keys
    let t = text.replace(/([,{\s])([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
    // Replace single quotes with double quotes
    t = t.replace(/'/g, '"');
    return t;
  };

  const salvageByRegex = (text: string) => {
    const kindMatch = text.match(/"kind"\s*:\s*"([A-Za-z_]+)"/i);
    if (!kindMatch) return null;
    const cardMatch = text.match(/"cardId"\s*:\s*"([^"]+)"/i);
    const fromReserveMatch = text.match(/"fromReserve"\s*:\s*(true|false)/i);
    const deckMatch = text.match(/"reserveFromDeckLevel"\s*:\s*(1|2|3)/i);
    const gemsMatch = text.match(/"gems"\s*:\s*\[([^\]]*)\]/i);

    const gems = gemsMatch
      ? gemsMatch[1]
          .split(',')
          .map(s => s.replace(/"/g, '').trim())
          .filter(Boolean)
      : undefined;

    return {
      kind: kindMatch[1],
      cardId: cardMatch?.[1],
      fromReserve: fromReserveMatch ? fromReserveMatch[1].toLowerCase() === 'true' : undefined,
      reserveFromDeckLevel: deckMatch ? Number(deckMatch[1]) : undefined,
      gems,
    };
  };

  const salvageByKeyword = (text: string) => {
    const upper = text.toUpperCase();
    const pickKind = (k: ActionType | 'PASS') => ({ kind: k });
    if (upper.includes('TAKE_GEMS') || upper.includes('TAKE')) return pickKind('TAKE_GEMS');
    if (upper.includes('RESERVE')) return pickKind('RESERVE');
    if (upper.includes('BUY')) return pickKind('BUY');
    if (upper.includes('PASS')) return pickKind('PASS');
    return null;
  };

  const salvageByPrefix = (text: string) => {
    const t = text.trim();
    if (t.startsWith('{"kind":"TA')) return { kind: 'TAKE_GEMS' };
    if (t.startsWith('{"kind":"RE')) return { kind: 'RESERVE' };
    if (t.startsWith('{"kind":"BU')) return { kind: 'BUY' };
    if (t.startsWith('{"kind":"PA')) return { kind: 'PASS' };
    return null;
  };

  const trimmed = stripFences(raw);

  // Direct parse
  const direct = tryParse(trimmed);
  if (direct) return direct;

  // Extract first brace block and try
  const block = extractBraceBlock(trimmed);
  if (block) {
    const parsedBlock = tryParse(block);
    if (parsedBlock) return parsedBlock;

    const loosened = tryParse(loosen(block));
    if (loosened) return loosened;
  }

  // Loosen whole text
  const loosenedWhole = tryParse(loosen(trimmed));
  if (loosenedWhole) return loosenedWhole;

  // Salvage with regex extraction
  const salvaged = salvageByRegex(trimmed);
  if (salvaged) return salvaged;

  const keywordSalvage = salvageByKeyword(trimmed);
  if (keywordSalvage) return keywordSalvage;

  const prefixSalvage = salvageByPrefix(trimmed);
  if (prefixSalvage) return prefixSalvage;

  console.warn('Gemini JSON parse failed', raw);
  return null;
};

const normalizeActionKind = (kind: string | undefined): ActionType | 'PASS' | null => {
  if (!kind) return null;
  const upper = kind.toUpperCase();
  if (upper === 'BUY' || upper === 'RESERVE' || upper === 'TAKE_GEMS') return upper as ActionType;
  if (upper === 'PASS') return 'PASS';
  return null;
};

// --- Local Helpers ---

type AffordableCard = { card: Card; fromReserve: boolean };

const listAffordableCards = (state: GameState, player: Player, helpers: AIHelpers): AffordableCard[] => {
  const cards: AffordableCard[] = [];

  player.reservedCards.forEach(card => {
    if (helpers.canBuyCard(player, card)) cards.push({ card, fromReserve: true });
  });

  [state.market.level3, state.market.level2, state.market.level1].forEach(level => {
    level.forEach(card => {
      if (helpers.canBuyCard(player, card)) cards.push({ card, fromReserve: false });
    });
  });

  return cards;
};

const pickHighestValueMarketCard = (state: GameState): Card | null => {
  const all = [...state.market.level3, ...state.market.level2, ...state.market.level1];
  if (all.length === 0) return null;
  return [...all].sort((a, b) => scoreCardAggressive(b) - scoreCardAggressive(a))[0];
};

const scoreCardAggressive = (card: Card): number => (card.points * 3) + card.bonus.length - totalCost(card);
const scoreCardBalanced = (card: Card): number => (card.points * 2) + card.bonus.length - totalCost(card);

const totalCost = (card: Card): number => Object.values(card.cost).reduce((a, b) => a + (b || 0), 0);

const prioritizeNeededColors = (state: GameState, player: Player): GemColor[] => {
  const marketTop = pickHighestValueMarketCard(state);
  if (!marketTop) return NON_GOLD_GEMS;

  const needs = NON_GOLD_GEMS.map(color => {
    const cost = marketTop.cost[color] || 0;
    const owned = (player.gems[color] || 0) + (player.bonuses[color] || 0);
    return { color, missing: Math.max(0, cost - owned) };
  });

  return needs.sort((a, b) => b.missing - a.missing).map(n => n.color);
};

const chooseGemTake = (state: GameState, player: Player, helpers: AIHelpers, priority: GemColor[]): GemColor[] | null => {
  const capacity = MAX_GEMS - helpers.getGemCount(player);
  if (capacity <= 0) return null;

  const available = NON_GOLD_GEMS.filter(c => state.gems[c] > 0);
  if (available.length === 0) return null;

  // Try 3 distinct following priority
  if (capacity >= 3 && available.length >= 3) {
    const ordered = priority.filter(c => available.includes(c));
    const distinct = Array.from(new Set([...ordered, ...available]));
    const pick = distinct.slice(0, 3);
    if (pick.length === 3) return pick;
  }

  // Try 2 of same color if pile has 4+
  if (capacity >= 2) {
    const double = available.find(c => state.gems[c] >= 4);
    if (double) return [double, double];
  }

  // Fallback single
  return [priority.find(c => available.includes(c)) ?? available[0]];
};

const findBlockCandidate = (state: GameState, player: Player, helpers: AIHelpers): Card | null => {
  const opponents = state.players.filter(p => p.id !== player.id);
  let best: { card: Card; pressure: number } | null = null;

  const marketCards = [...state.market.level3, ...state.market.level2, ...state.market.level1];
  marketCards.forEach(card => {
    const pressure = opponents.reduce((acc, opp) => acc + threatScore(opp, card, helpers), 0);
    if (!best || pressure > best.pressure) {
      best = { card, pressure };
    }
  });

  return best?.pressure ? best.card : null;
};

const threatScore = (opponent: Player, card: Card, helpers: AIHelpers): number => {
  const costGap = cardMissingCost(opponent, card);
  const canSoonBuy = costGap <= 2 ? 3 : costGap <= 4 ? 1 : 0;
  const nobleSynergy = card.points >= 3 ? 1 : 0;
  return canSoonBuy + nobleSynergy;
};

const cardMissingCost = (player: Player, card: Card): number => {
  let missing = 0;
  for (const color of Object.keys(card.cost) as GemColor[]) {
    const need = (card.cost[color] || 0) - (player.bonuses[color] || 0) - (player.gems[color] || 0);
    missing += Math.max(0, need);
  }
  return missing;
};

const stripCard = (card: Card) => ({ id: card.id, level: card.level, points: card.points, bonus: card.bonus, cost: card.cost });
const stripCardCompact = (card: Card) => ({ id: card.id, lvl: card.level, pts: card.points, b: card.bonus, c: card.cost });

const passDecision = (strategyUsed: AIStrategyId): AIActionDecision => ({
  kind: 'PASS',
  source: 'local',
  strategyUsed,
  reasoning: 'No valid move found',
});
