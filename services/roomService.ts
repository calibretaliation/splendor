import { neon, neonConfig } from '@neondatabase/serverless';
import type { GameState, LobbySnapshot } from '../types';

export type RoomStatus = 'LOBBY' | 'IN_PROGRESS' | 'COMPLETE';

export interface RemoteRoomRecord {
  roomCode: string;
  lobbySnapshot: LobbySnapshot;
  gameState: GameState | null;
  status: RoomStatus;
  hostId: string | null;
  revision: number;
  updatedAt: string;
}

const ROOM_TABLE = `
  CREATE TABLE IF NOT EXISTS cosmic_rooms (
    room_code TEXT PRIMARY KEY,
    lobby_snapshot JSONB NOT NULL,
    game_state JSONB,
    status TEXT NOT NULL DEFAULT 'LOBBY',
    host_id TEXT,
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

neonConfig.fetchConnectionCache = true;

const DATABASE_URL = import.meta.env.VITE_NEON_DATABASE_URL;

export const isNeonConfigured = (): boolean => Boolean(DATABASE_URL);

type NeonClient = ReturnType<typeof neon>;

type EnsureFn = () => Promise<void>;

let ensured: Promise<void> | null = null;
let client: NeonClient | null = null;

const getClient = (): NeonClient => {
  if (!DATABASE_URL) {
    throw new Error('VITE_NEON_DATABASE_URL is not configured.');
  }
  if (!client) {
    client = neon(DATABASE_URL);
  }
  return client;
};

const ensureSchema: EnsureFn = async () => {
  if (!ensured) {
    ensured = (async () => {
      const sql = getClient();
      await sql(ROOM_TABLE);
    })();
  }
  await ensured;
};

const runWithSchema = async <T>(runner: (sql: NeonClient) => Promise<T>): Promise<T> => {
  if (!DATABASE_URL) {
    throw new Error('VITE_NEON_DATABASE_URL is not configured.');
  }
  await ensureSchema();
  const sql = getClient();
  return runner(sql);
};

const mapRow = (row: Record<string, any>): RemoteRoomRecord => ({
  roomCode: row.room_code,
  lobbySnapshot: row.lobby_snapshot as LobbySnapshot,
  gameState: row.game_state ?? null,
  status: row.status as RoomStatus,
  hostId: row.host_id ?? null,
  revision: Number(row.revision ?? 0),
  updatedAt: row.updated_at,
});

const serializeJson = (value: unknown): string => JSON.stringify(value ?? null);

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const generateRoomCode = (): string => {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

export const createRoomRecord = async (snapshot: LobbySnapshot, desiredCode?: string): Promise<RemoteRoomRecord> => {
  return runWithSchema(async sql => {
    let attempts = 0;
    let code = desiredCode?.toUpperCase() ?? generateRoomCode();
    const snapshotJson = serializeJson(snapshot);

    while (attempts < 10) {
      const inserted = await sql<RemoteRoomRecord>`
        INSERT INTO cosmic_rooms (room_code, lobby_snapshot, game_state, status, host_id)
        VALUES (${code}, ${snapshotJson}::jsonb, NULL, 'LOBBY', ${snapshot.hostId})
        ON CONFLICT DO NOTHING
        RETURNING *;
      `;
      if (inserted.length > 0) {
        return mapRow(inserted[0]);
      }
      code = generateRoomCode();
      attempts++;
    }
    throw new Error('Failed to allocate a unique room code.');
  });
};

export const fetchRoomRecord = async (roomCode: string): Promise<RemoteRoomRecord | null> => {
  return runWithSchema(async sql => {
    const rows = await sql<RemoteRoomRecord>`
      SELECT * FROM cosmic_rooms WHERE room_code = ${roomCode.toUpperCase()};
    `;
    return rows.length ? mapRow(rows[0]) : null;
  });
};

export const saveLobbySnapshot = async (
  roomCode: string,
  snapshot: LobbySnapshot,
  status: RoomStatus = 'LOBBY',
): Promise<RemoteRoomRecord> => {
  const snapshotJson = serializeJson(snapshot);
  return runWithSchema(async sql => {
    const rows = await sql<RemoteRoomRecord>`
      UPDATE cosmic_rooms
      SET lobby_snapshot = ${snapshotJson}::jsonb,
          host_id = ${snapshot.hostId},
          status = ${status},
          revision = revision + 1,
          updated_at = NOW()
      WHERE room_code = ${roomCode.toUpperCase()}
      RETURNING *;
    `;
    if (!rows.length) {
      throw new Error('Room not found when saving snapshot.');
    }
    return mapRow(rows[0]);
  });
};

export const saveGameState = async (
  roomCode: string,
  state: GameState,
  status: RoomStatus = 'IN_PROGRESS',
): Promise<RemoteRoomRecord> => {
  const stateJson = serializeJson(state);
  return runWithSchema(async sql => {
    const rows = await sql<RemoteRoomRecord>`
      UPDATE cosmic_rooms
      SET game_state = ${stateJson}::jsonb,
          status = ${status},
          revision = revision + 1,
          updated_at = NOW()
      WHERE room_code = ${roomCode.toUpperCase()}
      RETURNING *;
    `;
    if (!rows.length) {
      throw new Error('Room not found when saving game state.');
    }
    return mapRow(rows[0]);
  });
};

export const deleteRoom = async (roomCode: string): Promise<void> => {
  await runWithSchema(async sql => {
    await sql`DELETE FROM cosmic_rooms WHERE room_code = ${roomCode.toUpperCase()};`;
  });
};

export const clearGameState = async (roomCode: string): Promise<RemoteRoomRecord> => {
  return runWithSchema(async sql => {
    const rows = await sql<RemoteRoomRecord>`
      UPDATE cosmic_rooms
      SET game_state = NULL,
          status = 'LOBBY',
          revision = revision + 1,
          updated_at = NOW()
      WHERE room_code = ${roomCode.toUpperCase()}
      RETURNING *;
    `;
    if (!rows.length) {
      throw new Error('Room not found when clearing game state.');
    }
    return mapRow(rows[0]);
  });
};
