import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameState, GemColor, Card, PlayerConfig } from './types';
import { takeGems, reserveCard, buyCard, performAIMove } from './services/gameEngine';
import { Trophy, RotateCcw } from 'lucide-react';
import { cloneGameState } from './services/gameUtils';
import { saveGameState, fetchRoomRecord, clearGameState, type RoomStatus } from './services/roomService';

// Subcomponents
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Fireworks from './components/Fireworks';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isInLobby, setIsInLobby] = useState(true);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);
  const gameRevisionRef = useRef<number | null>(null);

  // Game Loop for AI
  useEffect(() => {
    if (!gameState || gameState.winnerId) return;
    if (!roomCode) return;
    if (!hostId || !localPlayerId || hostId !== localPlayerId) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isHuman) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const nextState = await performAIMove(gameState);
        if (!cancelled && nextState !== gameState) {
          await persistGameState(nextState);
        }
      } catch (error) {
        console.error('AI turn failed', error);
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gameState, roomCode, hostId, localPlayerId]);

  useEffect(() => {
    if (!roomCode) return;
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const record = await fetchRoomRecord(roomCode);
        if (cancelled) return;
        if (!record || !record.gameState) {
          setGameState(null);
          setIsInLobby(true);
          gameRevisionRef.current = null;
          return;
        }
        if (gameRevisionRef.current === record.revision) {
          setHostId(record.hostId ?? null);
          return;
        }
        gameRevisionRef.current = record.revision;
        setGameState(record.gameState);
        setHostId(record.hostId ?? null);
        setIsInLobby(record.status === 'LOBBY');
      } catch (error) {
        console.error('Failed to refresh room state', error);
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(poll, 2200);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [roomCode]);


  const reorderGameStateForLocal = (state: GameState, playerId: string): GameState => {
    const currentIndex = state.players.findIndex(p => p.id === playerId);
    if (currentIndex <= 0) {
      return state;
    }

    const rotatedPlayers = [...state.players.slice(currentIndex), ...state.players.slice(0, currentIndex)];
    const nextIndex = (state.currentPlayerIndex - currentIndex + state.players.length) % state.players.length;
    return {
      ...state,
      players: rotatedPlayers,
      currentPlayerIndex: nextIndex,
    };
  };

  const handleStartGame = ({ roomCode: nextRoomCode, gameState: remoteState, hostId: nextHostId, localPlayerId: localId }: { roomCode: string; gameState: GameState; hostId: string | null; localPlayerId: string; }) => {
    setHostId(nextHostId ?? null);
    setLocalPlayerId(localId);
    setRoomCode(nextRoomCode);
    setGlobalNotice(null);
    setGameState(remoteState);
    setIsInLobby(false);
    gameRevisionRef.current = null;
  };

  const handleRestart = async () => {
    if (roomCode && hostId && localPlayerId === hostId) {
      try {
        await clearGameState(roomCode);
      } catch (error) {
        console.error('Failed to reset mission state', error);
      }
    }
    setIsInLobby(true);
    setGameState(null);
    setHostId(null);
    gameRevisionRef.current = null;
  };

  const handleAbortMission = () => {
    if (!hostId || !localPlayerId || hostId !== localPlayerId || !roomCode) return;

    clearGameState(roomCode)
      .catch(error => {
        console.error('Failed to clear mission state', error);
      })
      .finally(() => {
        setGlobalNotice('Mission aborted by host. Refresh to join again.');
        setGameState(null);
        setIsInLobby(true);
        setHostId(null);
        gameRevisionRef.current = null;
      });
  };

  const renderedGameState = useMemo(() => {
    if (!gameState) return null;
    if (!localPlayerId) return gameState;
    return reorderGameStateForLocal(cloneGameState(gameState), localPlayerId);
  }, [gameState, localPlayerId]);

  const activeState = renderedGameState ?? gameState;

  const standings = useMemo(() => {
    if (!activeState) return [];
    return [...activeState.players]
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.nobles.length !== a.nobles.length) return b.nobles.length - a.nobles.length;
        return a.name.localeCompare(b.name);
      })
      .map((player, index) => ({ player, rank: index + 1 }));
  }, [activeState]);

  const championPlayer = useMemo(() => {
    if (!activeState || !activeState.winnerId) return null;
    return activeState.players.find(p => p.id === activeState.winnerId) ?? null;
  }, [activeState]);

  const persistGameState = async (nextState: GameState) => {
    setGameState(nextState);
    if (!roomCode) return;
    try {
      const status: RoomStatus = nextState.winnerId ? 'COMPLETE' : 'IN_PROGRESS';
      const record = await saveGameState(roomCode, nextState, status);
      gameRevisionRef.current = record.revision;
    } catch (error) {
      console.error('Failed to sync game state', error);
      setGlobalNotice('Failed to sync move with command. Refresh if the board desyncs.');
    }
  };

  // Actions passed to GameBoard
  const onTakeGems = (gems: GemColor[]) => {
    if (!gameState) return;
    const nextState = takeGems(gameState, gems);
    if (nextState === gameState) return;
    void persistGameState(nextState);
  };

  const onReserve = (card: Card) => {
    if (!gameState) return;
    const nextState = reserveCard(gameState, card);
    if (nextState === gameState) return;
    void persistGameState(nextState);
  };

  const onBuy = (card: Card, isReserved: boolean) => {
    if (!gameState) return;
    const nextState = buyCard(gameState, card, isReserved);
    if (nextState === gameState) return;
    void persistGameState(nextState);
  };

  return (
    <div className="min-h-dvh h-dvh w-full bg-space-black text-white font-mono crt overflow-hidden flex flex-col">
      {/* Background Starfield effect handled by CSS/Container */}
      
      {isInLobby && (
        <div className="flex-1 min-h-0">
          <Lobby
            onJoin={handleStartGame}
            initialPlayerId={localPlayerId}
            externalNotice={globalNotice}
            onClearNotice={() => setGlobalNotice(null)}
          />
        </div>
      )}

      {!isInLobby && activeState && !activeState.winnerId && localPlayerId && (
        <div className="flex-1 min-h-0">
          <GameBoard
            gameState={activeState}
            onTakeGems={onTakeGems}
            onReserve={onReserve}
            onBuy={onBuy}
            hostId={hostId}
            localPlayerId={localPlayerId}
            onAbortMission={handleAbortMission}
          />
        </div>
      )}

      {!isInLobby && activeState && activeState.winnerId && championPlayer && (
        <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 text-center bg-space-dark/90 overflow-hidden">
          <Fireworks />
          <div className="relative z-10 w-full max-w-4xl flex flex-col gap-5 sm:gap-6 items-center">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <Trophy size={64} className="text-yellow-400 animate-bounce" />
              <h1 className="text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-400 font-bold font-header leading-tight">
                {championPlayer.name} REIGNS SUPREME
              </h1>
              <p className="text-base sm:text-lg text-gray-300 uppercase tracking-[0.4em]">
                {championPlayer.points} Prestige Points
              </p>
            </div>

            <div className="w-full bg-space-black/70 border border-white/10 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.08)] p-3 sm:p-5 flex flex-col gap-2">
              <div className="text-left text-xs sm:text-sm uppercase tracking-[0.4em] text-gray-400 font-header pb-1 border-b border-white/10">
                Final Rankings
              </div>
              {standings.map(({ player, rank }) => {
                const isWinner = player.id === activeState.winnerId;
                const isLocal = localPlayerId === player.id;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 sm:gap-4 px-3 py-2 rounded-lg border ${
                      isWinner
                        ? 'border-yellow-400/80 bg-yellow-400/10'
                        : isLocal
                        ? 'border-purple-400/60 bg-purple-400/5'
                        : 'border-white/5 bg-white/5'
                    }`}
                  >
                    <div className="w-10 sm:w-12 text-left font-header text-lg sm:text-xl text-purple-200">#{rank}</div>
                    <div className="flex-1 text-left">
                      <div className="font-header text-base sm:text-lg text-white whitespace-pre-wrap leading-tight">
                        {player.name}
                      </div>
                      <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-gray-400">
                        {isWinner ? 'Champion' : isLocal ? 'You' : player.isHuman ? 'Human Pilot' : `${player.aiStrategyId ?? 'AI'} AI`}
                      </div>
                    </div>
                    <div className="text-right font-bold text-lg sm:text-xl text-white">
                      {player.points} pts
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-space-accent hover:bg-purple-600 text-white rounded-none border-2 border-white shadow-pixel transition-all hover:translate-y-1 hover:shadow-none"
            >
              <RotateCcw /> REINITIALIZE MISSION
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;