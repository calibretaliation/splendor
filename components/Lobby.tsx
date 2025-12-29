import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rocket, Sliders, Radio } from 'lucide-react';
import { AIStrategyId, GameState, LobbySnapshot, PlayerConfig } from '../types';
import {
  assignOccupantToSeat,
  createLobbySnapshot,
  toPlayerConfigList,
  updateSeatStrategy,
  removeOccupantById,
} from '../services/roomState';
import { initializeGame } from '../services/gameEngine';
import {
  createRoomRecord,
  fetchRoomRecord,
  saveLobbySnapshot,
  saveGameState,
  RemoteRoomRecord,
  isNeonConfigured,
} from '../services/roomService';

interface StartGamePayload {
  roomCode: string;
  gameState: GameState;
  hostId: string | null;
  localPlayerId: string;
}

interface LobbyProps {
  onJoin: (payload: StartGamePayload) => void;
  initialPlayerId?: string | null;
  externalNotice?: string | null;
  onClearNotice?: () => void;
}

const ROOM_CODE_STORAGE_KEY = 'cosmic_room_code';

const generatePlayerId = () => 'p-' + Math.random().toString(36).substring(2, 9);

const Lobby: React.FC<LobbyProps> = ({ onJoin, initialPlayerId, externalNotice, onClearNotice }) => {
  const [name, setName] = useState('');
  const [score, setScore] = useState(15);
  const [phase, setPhase] = useState<'enter' | 'waiting'>('enter');
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
  const [myId, setMyId] = useState(() => initialPlayerId ?? generatePlayerId());
  const [lobby, setLobby] = useState<LobbySnapshot>(() => createLobbySnapshot());
  const [notice, setNotice] = useState<string | null>(externalNotice ?? null);
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(ROOM_CODE_STORAGE_KEY);
  });
  const [roomRecord, setRoomRecord] = useState<RemoteRoomRecord | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [hasLaunched, setHasLaunched] = useState(false);
  const lastRevisionRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const multiplayerReady = isNeonConfigured();

  useEffect(() => {
    if (initialPlayerId && initialPlayerId !== myId) {
      setMyId(initialPlayerId);
    }
  }, [initialPlayerId, myId]);

  useEffect(() => {
    if (externalNotice) {
      setNotice(externalNotice);
      onClearNotice?.();
    }
  }, [externalNotice, onClearNotice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (roomCode) {
      sessionStorage.setItem(ROOM_CODE_STORAGE_KEY, roomCode);
    } else {
      sessionStorage.removeItem(ROOM_CODE_STORAGE_KEY);
    }
  }, [roomCode]);
  const clearNotice = () => {
    setNotice(null);
    setPollError(null);
    onClearNotice?.();
  };

  const applySnapshot = useCallback((snapshot: LobbySnapshot): number => {
    const cloned = createLobbySnapshot(snapshot);
    setLobby(cloned);
    setScore(cloned.targetScore);
    const seatIdx = cloned.seats.findIndex(seat => seat.occupant?.id === myId);
    setMySeatIndex(seatIdx >= 0 ? seatIdx : null);
    setPhase(seatIdx >= 0 ? 'waiting' : 'enter');
    return seatIdx;
  }, [myId]);

  const persistSnapshot = useCallback(async (
    builder: (draft: LobbySnapshot) => LobbySnapshot,
    status: 'LOBBY' | 'IN_PROGRESS' | 'COMPLETE' = 'LOBBY',
  ): Promise<RemoteRoomRecord | null> => {
    if (!roomCode) return null;
    const nextSnapshot = builder(createLobbySnapshot(lobby));
    applySnapshot(nextSnapshot);
    try {
      const record = await saveLobbySnapshot(roomCode, nextSnapshot, status);
      setRoomRecord(record);
      lastRevisionRef.current = record.revision;
      return record;
    } catch (error) {
      console.error('Failed to persist snapshot', error);
      setNotice('Failed to sync with command. Please retry.');
      return null;
    }
  }, [roomCode, lobby, applySnapshot]);

  useEffect(() => {
    if (!roomCode) return;
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const poll = async () => {
      try {
        const latest = await fetchRoomRecord(roomCode);
        if (cancelled) return;
        if (!latest) {
          setNotice('Room closed by command.');
          setRoomCode(null);
          setRoomRecord(null);
          lastRevisionRef.current = null;
          return;
        }
        if (lastRevisionRef.current === latest.revision) {
          return;
        }
        lastRevisionRef.current = latest.revision;
        setRoomRecord(latest);
        const seatIdx = applySnapshot(latest.lobbySnapshot);
        if (seatIdx < 0) {
          setNotice('You no longer occupy a seat in this hangar.');
          setRoomCode(null);
          setRoomRecord(null);
          lastRevisionRef.current = null;
        }
        setPollError(null);
      } catch (error) {
        console.error('Room poll failed', error);
        if (!cancelled) {
          setPollError('Signal lost. Retrying…');
        }
      } finally {
        if (!cancelled) {
          pollTimerRef.current = window.setTimeout(poll, 2500);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [roomCode, applySnapshot]);

  useEffect(() => {
    if (!roomRecord) return;
    if (roomRecord.status === 'LOBBY') {
      setHasLaunched(false);
      return;
    }
    if (!hasLaunched && roomRecord.status === 'IN_PROGRESS' && roomRecord.gameState) {
      setHasLaunched(true);
      onJoin({
        roomCode: roomRecord.roomCode,
        gameState: roomRecord.gameState,
        hostId: roomRecord.hostId,
        localPlayerId: myId,
      });
    }
  }, [roomRecord, hasLaunched, onJoin, myId]);

  useEffect(() => {
    if (!roomCode || lobby.hostId !== myId) return;
    if (lobby.targetScore === score) return;
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      void persistSnapshot(draft => ({ ...draft, targetScore: score }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [score, roomCode, lobby.hostId, myId, lobby.targetScore, persistSnapshot]);

  const handleCreateRoom = async () => {
    if (!multiplayerReady) {
      setNotice('Neon credentials missing. Multiplayer is offline.');
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNotice('Enter your explorer ID first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const occupant: PlayerConfig = { id: myId, name: trimmedName, isHuman: true };
      const seeded = createLobbySnapshot({
        hostId: occupant.id,
        targetScore: score,
        defaultAIStrategy: lobby.defaultAIStrategy,
      });
      const assignResult = assignOccupantToSeat(seeded, occupant, 0);
      if (assignResult.seatIndex === -1) {
        setNotice('Unable to secure a seat. Try again.');
        return;
      }
      const record = await createRoomRecord(assignResult.snapshot);
      lastRevisionRef.current = record.revision;
      setRoomCode(record.roomCode);
      setRoomRecord(record);
      applySnapshot(record.lobbySnapshot);
      setNotice(`Room code ${record.roomCode} confirmed. Share it with your crew.`);
    } catch (error) {
      console.error('Failed to create room', error);
      setNotice('Hangar creation failed. Check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!multiplayerReady) {
      setNotice('Neon credentials missing. Multiplayer is offline.');
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNotice('Enter your explorer ID first.');
      return;
    }
    const normalizedCode = joinCodeInput.trim().toUpperCase();
    if (normalizedCode.length < 4) {
      setNotice('Enter a valid room code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const existing = await fetchRoomRecord(normalizedCode);
      if (!existing) {
        setNotice('No hangar found with that code.');
        return;
      }
      const occupant: PlayerConfig = { id: myId, name: trimmedName, isHuman: true };
      const assignment = assignOccupantToSeat(createLobbySnapshot(existing.lobbySnapshot), occupant);
      if (assignment.seatIndex === -1) {
        setNotice('That hangar is already full.');
        return;
      }
      const record = await saveLobbySnapshot(normalizedCode, assignment.snapshot);
      lastRevisionRef.current = record.revision;
      setRoomCode(record.roomCode);
      setRoomRecord(record);
      applySnapshot(record.lobbySnapshot);
      setJoinCodeInput(normalizedCode);
      clearNotice();
    } catch (error) {
      console.error('Failed to join room', error);
      setNotice('Unable to join hangar. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomCode) return;
    await persistSnapshot(draft => removeOccupantById(draft, myId));
    setRoomCode(null);
    setRoomRecord(null);
    setPhase('enter');
    setMySeatIndex(null);
    setNotice('You left the hangar.');
  };

  const handleSeatStrategyChange = (seatIndex: number, strategy: AIStrategyId) => {
    if (lobby.hostId !== myId || !roomCode) return;
    void persistSnapshot(draft => updateSeatStrategy(draft, seatIndex, strategy));
  };

  const handleKickPlayer = async (playerId: string) => {
    if (lobby.hostId !== myId || !roomCode) return;
    const target = lobby.seats.find(seat => seat.occupant?.id === playerId)?.occupant;
    if (!target) return;
    const confirmKick = window.confirm(`Remove ${target.name} from the hangar?`);
    if (!confirmKick) return;
    await persistSnapshot(draft => removeOccupantById(draft, playerId));
  };

  const handleStartGame = async () => {
    if (lobby.hostId !== myId || !roomCode) return;
    try {
      const startSnapshot = createLobbySnapshot({
        seats: lobby.seats,
        hostId: lobby.hostId,
        targetScore: score,
        defaultAIStrategy: lobby.defaultAIStrategy,
      });
      applySnapshot(startSnapshot);
      await saveLobbySnapshot(roomCode, startSnapshot, 'IN_PROGRESS');
      const initialState = initializeGame({
        seats: toPlayerConfigList(startSnapshot.seats),
        targetScore: startSnapshot.targetScore,
      });
      const record = await saveGameState(roomCode, initialState, 'IN_PROGRESS');
      setRoomRecord(record);
      lastRevisionRef.current = record.revision;
    } catch (error) {
      console.error('Failed to launch mission', error);
      setNotice('Launch failed. Try again.');
    }
  };

  if (phase === 'enter') {
    return (
      <div className="h-dvh w-full relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/space/1920/1080')] opacity-20 bg-cover pointer-events-none"></div>
        <div className="relative h-full w-full flex items-center justify-center p-3 sm:p-4 [@media(max-height:520px)]:items-start [@media(orientation:landscape)]:py-4">
          <div className="w-full max-w-4xl bg-space-dark border-3 sm:border-4 border-space-accent shadow-neon-blue relative p-4 sm:p-6 [@media(orientation:landscape)]:p-5 [@media(max-height:520px)]:p-3.5">
            <div className="grid gap-4 sm:gap-6 [@media(orientation:landscape)]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] [@media(orientation:landscape)]:items-stretch [@media(max-height:520px)]:gap-3">
              <div className="hidden [@media(orientation:landscape)]:flex flex-col justify-between bg-space-black/60 border border-space-accent/40 p-3 rounded-sm [@media(max-height:520px)]:hidden">
                <div>
                  <h1 className="text-3xl text-cyan-400 uppercase tracking-widest drop-shadow-lg font-bold leading-tight [@media(max-height:520px)]:text-2xl">Cosmic Splendor</h1>
                  <p className="mt-3 text-xs text-gray-300 font-mono leading-relaxed">
                    Dock your call sign, calibrate mission parameters, and link with AI wingmates before ignition.
                  </p>
                </div>
                <div className="text-[11px] text-gray-400 font-mono space-y-1">
                  <p>• 4 explorer slots</p>
                  <p>• Configure target prestige {score}</p>
                  <p>• AI inherit default strategy</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 [@media(orientation:landscape)]:space-y-2 [@media(max-height:520px)]:space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h1 className="text-[26px] sm:text-3xl text-cyan-400 uppercase tracking-widest drop-shadow-lg font-bold leading-tight sm:leading-none [@media(orientation:landscape)]:text-2xl [@media(max-height:520px)]:text-xl">
                    Cosmic Splendor
                  </h1>
                  {(notice || pollError) && (
                    <button
                      onClick={clearNotice}
                      className="mt-2 sm:mt-0 text-[11px] text-yellow-300 underline font-mono [@media(max-height:520px)]:text-[10px]"
                    >
                      Dismiss notice
                    </button>
                  )}
                </div>
                {notice && (
                  <div className="bg-yellow-900/40 border border-yellow-600 text-yellow-200 text-xs sm:text-sm font-mono p-2 [@media(orientation:landscape)]:text-[11px] [@media(max-height:520px)]:text-[10px] [@media(max-height:520px)]:p-1.5">
                    {notice}
                  </div>
                )}
                {pollError && (
                  <div className="bg-red-900/40 border border-red-600 text-red-200 text-xs sm:text-sm font-mono p-2">
                    {pollError}
                  </div>
                )}
                {!multiplayerReady && (
                  <div className="bg-purple-900/30 border border-purple-600 text-purple-100 text-xs sm:text-sm font-mono p-2">
                    Multiplayer database credentials missing. Provide VITE_NEON_DATABASE_URL to enable cross-device play.
                  </div>
                )}

                <div className="grid gap-3 [@media(orientation:landscape)]:grid-cols-2 [@media(orientation:landscape)]:gap-4 [@media(max-height:520px)]:gap-2.5">
                  <div className="flex flex-col gap-1.5 [@media(max-height:520px)]:gap-1">
                    <label className="text-space-accent text-xs sm:text-sm uppercase font-bold tracking-wider">Explorer ID</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={12}
                      className="w-full bg-space-black border-2 border-gray-600 px-3 py-2 text-base sm:text-lg text-white focus:border-cyan-400 focus:outline-none placeholder-gray-700 font-mono [@media(max-height:520px)]:py-1.5 [@media(max-height:520px)]:text-sm"
                      placeholder="ENTER NAME"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 [@media(max-height:520px)]:gap-1">
                    <label className="flex items-center justify-between text-space-accent text-xs sm:text-sm uppercase font-bold tracking-wider">
                      <span className="flex items-center gap-2"><Sliders size={14}/> Target Score</span>
                      <span className="text-white font-mono text-base sm:text-lg [@media(max-height:520px)]:text-sm">{score}</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="25"
                      value={score}
                      onChange={(e) => setScore(parseInt(e.target.value))}
                      className="w-full accent-cyan-400 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={!name.trim() || isSubmitting || !multiplayerReady}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base sm:text-lg py-2.5 sm:py-3 border-b-4 border-cyan-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest [@media(orientation:landscape)]:text-sm [@media(max-height:520px)]:py-2 [@media(max-height:520px)]:text-sm"
                >
                  Claim host and enter the hangar <Rocket size={22} />
                </button>

                <div className="bg-space-black/60 border border-space-accent/30 p-3 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs sm:text-sm uppercase tracking-widest text-gray-200 font-bold">Join Existing Hangar</p>
                    <span className="text-[11px] text-gray-400 font-mono">Ask the host for the 5-letter code.</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      maxLength={5}
                      placeholder="ROOM CODE"
                      className="flex-1 bg-space-black border-2 border-gray-600 px-3 py-2 text-base sm:text-lg text-white focus:border-cyan-400 focus:outline-none font-mono tracking-[0.4em] text-center"
                    />
                    <button
                      onClick={handleJoinRoom}
                      disabled={!joinCodeInput.trim() || !name.trim() || isSubmitting || !multiplayerReady}
                      className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white uppercase font-bold tracking-widest border-b-2 border-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Join Room
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isHost = lobby.hostId === myId;
  const hostOccupant = lobby.seats.find(seat => seat.occupant?.id === lobby.hostId)?.occupant;
  const formattedRoomCode = roomCode ? roomCode.toUpperCase() : '-----';
  const canLeave = mySeatIndex !== null && !!roomCode;
  const hostLabel = hostOccupant ? `${hostOccupant.name}${hostOccupant.id === myId ? ' (You)' : ''}` : 'Awaiting host';

  return (
    <div className="h-dvh w-full relative z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/space/1920/1080')] opacity-20 bg-cover pointer-events-none"></div>

      <div className="relative h-full w-full flex items-center justify-center p-3 sm:p-4 [@media(max-height:520px)]:items-start">
        <div className="w-full max-w-5xl bg-space-dark border-3 sm:border-4 border-space-accent p-4 sm:p-6 shadow-neon-blue relative [@media(max-height:520px)]:p-3.5">
          <div className="grid gap-4 sm:gap-6 [@media(orientation:landscape)]:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] [@media(orientation:landscape)]:items-stretch [@media(max-height:520px)]:gap-3">
            <div className="flex flex-col gap-3 sm:gap-4 [@media(max-height:520px)]:gap-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl sm:text-3xl text-white uppercase tracking-widest flex items-center gap-3 [@media(max-height:520px)]:text-xl">
                    <Radio className="animate-pulse text-green-500"/> Mission Hangar
                  </h2>
                  <span className="inline-flex items-center gap-2 bg-space-black/70 border border-space-accent px-3 py-1 font-mono text-xs uppercase tracking-[0.4em] text-white">
                    {formattedRoomCode}
                  </span>
                </div>
                {(notice || pollError) && (
                  <button
                    onClick={clearNotice}
                    className="text-[11px] text-yellow-300 underline font-mono [@media(max-height:520px)]:text-[10px]"
                  >
                    Dismiss
                  </button>
                )}
              </div>
              {notice && (
                <div className="bg-yellow-900/40 border border-yellow-600 text-yellow-200 text-xs sm:text-sm font-mono p-2 [@media(max-height:520px)]:text-[10px] [@media(max-height:520px)]:p-1.5">
                  {notice}
                </div>
              )}
              {pollError && (
                <div className="bg-red-900/30 border border-red-600 text-red-100 text-xs sm:text-sm font-mono p-2 [@media(max-height:520px)]:text-[10px] [@media(max-height:520px)]:p-1.5">
                  {pollError}
                </div>
              )}

              <div className="flex-1 bg-space-black border-2 border-gray-700 p-3 sm:p-4 rounded relative min-h-0 [@media(max-height:520px)]:p-2.5">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/10 pointer-events-none animate-scan"></div>
                <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 min-h-0 [@media(orientation:landscape)]:grid-cols-2 [@media(orientation:landscape)]:grid-rows-2 [@media(orientation:landscape)]:auto-rows-fr [@media(max-height:520px)]:gap-2">
                  {lobby.seats.map((seat, idx) => {
                const slotLabel = `P${idx + 1}`;
                const occupant = seat.occupant;
                const isMine = mySeatIndex === idx;

                if (occupant) {
                  const occupantIsHost = lobby.hostId === occupant.id;
                  const occupantRole = occupantIsHost
                    ? 'HOST'
                    : occupant.isHuman
                    ? 'CREW MEMBER'
                    : 'AI PILOT';

                  return (
                    <div
                      key={occupant.id}
                      className={`relative bg-space-light border p-3 flex items-center gap-3 animate-in fade-in slide-in-from-left-4 [@media(orientation:landscape)]:p-2 [@media(orientation:landscape)]:gap-2 [@media(max-height:520px)]:p-2 [@media(max-height:520px)]:gap-2 ${
                        isMine ? 'border-cyan-400' : 'border-cyan-700'
                      }`}
                    >
                      {lobby.hostId === myId && occupant.id !== myId && (
                        <button
                          onClick={() => handleKickPlayer(occupant.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-full border border-white shadow-lg"
                          title="Remove explorer"
                        >
                          ×
                        </button>
                      )}
                      <div className="w-10 h-10 bg-cyan-900 flex items-center justify-center border border-cyan-500 text-cyan-300 font-bold text-lg [@media(orientation:landscape)]:w-9 [@media(orientation:landscape)]:h-9 [@media(orientation:landscape)]:text-base [@media(max-height:520px)]:w-8 [@media(max-height:520px)]:h-8 [@media(max-height:520px)]:text-sm">
                        {slotLabel}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold text-lg leading-none [@media(orientation:landscape)]:text-base [@media(max-height:520px)]:text-sm">{occupant.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-1 [@media(orientation:landscape)]:text-[11px] [@media(max-height:520px)]:text-[10px]">{occupantRole}</div>
                      </div>
                      {occupant.id === myId && <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_#00ff00]"></div>}
                    </div>
                  );
                }

                return (
                  <div
                    key={`empty-${idx}`}
                    className={`border border-dashed border-gray-700 p-3 flex flex-col gap-2 opacity-90 bg-space-black/60 [@media(orientation:landscape)]:p-2 [@media(orientation:landscape)]:gap-1.5 [@media(max-height:520px)]:p-2 [@media(max-height:520px)]:gap-1.5 ${
                      isMine ? 'ring-1 ring-cyan-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-900 flex items-center justify-center border border-gray-700 text-gray-500 [@media(orientation:landscape)]:w-9 [@media(orientation:landscape)]:h-9 [@media(max-height:520px)]:w-8 [@media(max-height:520px)]:h-8">
                        {slotLabel}
                      </div>
                      <div className="text-gray-400 font-mono text-sm [@media(orientation:landscape)]:text-xs [@media(max-height:520px)]:text-[11px]">Empty — AI drone awaiting orders</div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase text-space-accent font-bold [@media(orientation:landscape)]:text-[10px] [@media(max-height:520px)]:text-[10px]">AI Strategy</label>
                      <select
                        value={seat.aiStrategyId}
                        onChange={(e) => handleSeatStrategyChange(idx, e.target.value as AIStrategyId)}
                        disabled={lobby.hostId !== myId}
                        className="w-full bg-space-black border-2 border-gray-700 p-2 text-sm text-white font-mono disabled:opacity-50 [@media(orientation:landscape)]:text-xs [@media(orientation:landscape)]:p-1.5 [@media(max-height:520px)]:p-1.5 [@media(max-height:520px)]:text-xs"
                      >
                        <option value="balanced">Easy</option>
                        <option value="aggressive">Medium-Aggressive</option>
                        <option value="defensive">Medium-Defensive</option>
                        <option value="random">Random</option>
                        <option value="gemma">AI (Cheap)</option>
                        <option value="gemini">AI (Expensive)</option>
                      </select>
                    </div>
                  </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4 bg-space-black/70 border-2 border-gray-700 rounded p-3 sm:p-4 [@media(max-height:520px)]:gap-2.5 [@media(max-height:520px)]:p-2.5">
              <div className="space-y-2 text-xs sm:text-sm text-gray-300 font-mono [@media(max-height:520px)]:space-y-1.5 [@media(max-height:520px)]:text-[11px]">
                <p>Target score: <span className="text-white font-bold">{lobby.targetScore}</span></p>
                <p>Default AI: <span className="text-white font-bold uppercase">{lobby.defaultAIStrategy}</span></p>
                <p>Host: <span className="text-white font-bold">{hostLabel}</span></p>
                <p>Room Code: <span className="text-white font-bold tracking-[0.4em]">{formattedRoomCode}</span></p>
              </div>

              {isHost ? (
                <>
                  <button
                    onClick={handleStartGame}
                    className="w-full bg-green-600 hover:bg-green-500 text-white text-lg sm:text-xl py-2.5 sm:py-3 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.5)] [@media(max-height:520px)]:py-2 [@media(max-height:520px)]:text-base"
                  >
                    Launch Mission <Rocket size={24} />
                  </button>
                  <p className="text-gray-400 text-xs sm:text-sm font-mono text-center">
                    Empty slots deploy AI drones automatically.
                  </p>
                </>
              ) : (
                <div className="text-center p-3 bg-space-black border border-yellow-700/50 [@media(max-height:520px)]:p-2">
                  <p className="text-yellow-500 font-mono text-base sm:text-lg animate-pulse [@media(max-height:520px)]:text-sm">Waiting for host...</p>
                </div>
              )}

              {canLeave && (
                <button
                  onClick={handleLeaveRoom}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm sm:text-base py-2 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 transition-all font-bold uppercase tracking-widest [@media(max-height:520px)]:py-1.5"
                >
                  Leave Hangar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;