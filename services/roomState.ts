import { AIStrategyId, LobbySeatState, LobbySnapshot, PlayerConfig } from '../types';
import { AVATAR_NAMES, DEFAULT_AI_STRATEGIES, TARGET_SCORE_DEFAULT } from '../constants';

const SEAT_COUNT = 4;

const cloneSeat = (seat: LobbySeatState): LobbySeatState => ({
  aiStrategyId: seat.aiStrategyId,
  occupant: seat.occupant ? { ...seat.occupant } : null,
});

const sanitizeStrategy = (strategy?: AIStrategyId, fallback?: AIStrategyId): AIStrategyId => {
  return strategy ?? fallback ?? 'balanced';
};

export const createLobbySeats = (defaultStrategy: AIStrategyId): LobbySeatState[] => {
  return Array.from({ length: SEAT_COUNT }, () => ({
    aiStrategyId: defaultStrategy,
    occupant: null,
  }));
};

export const createLobbySnapshot = (overrides?: Partial<LobbySnapshot>): LobbySnapshot => {
  const defaultStrategy = overrides?.defaultAIStrategy ?? 'balanced';
  return {
    seats: overrides?.seats
      ? overrides.seats.map(cloneSeat)
      : createLobbySeats(defaultStrategy),
    hostId: overrides?.hostId ?? null,
    targetScore: overrides?.targetScore ?? TARGET_SCORE_DEFAULT,
    defaultAIStrategy: defaultStrategy,
  };
};

const removeOccupant = (seats: LobbySeatState[], occupantId: string): LobbySeatState[] => {
  return seats.map(seat => {
    if (seat.occupant?.id !== occupantId) {
      return cloneSeat(seat);
    }
    return {
      aiStrategyId: seat.aiStrategyId,
      occupant: null,
    };
  });
};

const firstOpenSeatIndex = (seats: LobbySeatState[]): number => {
  return seats.findIndex(seat => seat.occupant === null);
};

export interface AssignSeatResult {
  snapshot: LobbySnapshot;
  seatIndex: number;
}

export const assignOccupantToSeat = (
  snapshot: LobbySnapshot,
  occupant: PlayerConfig,
  preferredIndex?: number,
): AssignSeatResult => {
  const sanitizedOccupant: PlayerConfig = {
    ...occupant,
    id: occupant.id,
    name: occupant.name,
    isHuman: occupant.isHuman,
    aiStrategyId: occupant.aiStrategyId,
    avatarId: occupant.avatarId,
  };

  const baseSeats = removeOccupant(snapshot.seats, sanitizedOccupant.id);
  const nextSeats = baseSeats.map(cloneSeat);

  let seatIndex = typeof preferredIndex === 'number' ? preferredIndex : firstOpenSeatIndex(nextSeats);
  if (seatIndex < 0 || seatIndex >= SEAT_COUNT) {
    return { snapshot: { ...snapshot, seats: nextSeats }, seatIndex: -1 };
  }

  nextSeats[seatIndex] = {
    aiStrategyId: nextSeats[seatIndex].aiStrategyId,
    occupant: sanitizedOccupant,
  };

  const nextHostId = snapshot.hostId ?? sanitizedOccupant.id;

  return {
    snapshot: {
      ...snapshot,
      seats: nextSeats,
      hostId: nextHostId,
    },
    seatIndex,
  };
};

export const removeOccupantById = (
  snapshot: LobbySnapshot,
  occupantId: string,
): LobbySnapshot => {
  const seatsWithout = removeOccupant(snapshot.seats, occupantId);
  const remainingHostId = snapshot.hostId === occupantId
    ? seatsWithout.find(seat => seat.occupant)?.occupant?.id ?? null
    : snapshot.hostId;

  return createLobbySnapshot({
    seats: seatsWithout,
    hostId: remainingHostId,
    targetScore: snapshot.targetScore,
    defaultAIStrategy: snapshot.defaultAIStrategy,
  });
};

export const resetLobbyForHost = (
  snapshot: LobbySnapshot,
  newHostId: string,
): LobbySnapshot => {
  const hostSeatIndex = snapshot.seats.findIndex(seat => seat.occupant?.id === newHostId);
  if (hostSeatIndex === -1) return snapshot;

  const nextSeats = snapshot.seats.map((seat, idx) => {
    if (idx === hostSeatIndex) {
      return cloneSeat(seat);
    }
    return {
      aiStrategyId: seat.aiStrategyId,
      occupant: null,
    };
  });

  const seeded = createLobbySnapshot({
    seats: nextSeats,
    hostId: newHostId,
    targetScore: snapshot.targetScore,
    defaultAIStrategy: snapshot.defaultAIStrategy,
  });

  return seeded;
};

export const updateSeatStrategy = (
  snapshot: LobbySnapshot,
  seatIndex: number,
  strategy: AIStrategyId,
): LobbySnapshot => {
  if (seatIndex < 0 || seatIndex >= snapshot.seats.length) return snapshot;
  const nextSeats = snapshot.seats.map((seat, idx) => {
    if (idx !== seatIndex) return cloneSeat(seat);
    return {
      aiStrategyId: sanitizeStrategy(strategy, snapshot.defaultAIStrategy),
      occupant: seat.occupant ? { ...seat.occupant } : null,
    };
  });
  return { ...snapshot, seats: nextSeats };
};

export const setDefaultAIStrategy = (
  snapshot: LobbySnapshot,
  strategy: AIStrategyId,
): LobbySnapshot => {
  const nextSeats = snapshot.seats.map(seat => ({
    aiStrategyId: seat.occupant ? seat.aiStrategyId : strategy,
    occupant: seat.occupant ? { ...seat.occupant } : null,
  }));

  return {
    ...snapshot,
    defaultAIStrategy: strategy,
    seats: nextSeats,
  };
};

export const toPlayerConfigList = (seats: LobbySeatState[]): PlayerConfig[] => {
  return seats.map((seat, index) => {
    if (seat.occupant) {
      return { ...seat.occupant };
    }
    const fallbackStrategy = sanitizeStrategy(
      seat.aiStrategyId,
      DEFAULT_AI_STRATEGIES[index % DEFAULT_AI_STRATEGIES.length] as AIStrategyId,
    );
    return {
      id: `ai-${index + 1}`,
      name: AVATAR_NAMES[index] ?? `AI ${index + 1}`,
      isHuman: false,
      aiStrategyId: fallbackStrategy,
      avatarId: index + 5,
    };
  });
};
