import React, { useState, useEffect } from 'react';
import { GameState, GemColor, Card, AIStrategyId } from './types';
import { initializeGame, takeGems, reserveCard, buyCard, performAIMove } from './services/gameEngine';
import { Trophy, Users, Zap, RotateCcw, Monitor } from 'lucide-react';

// Subcomponents
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [targetScore, setTargetScore] = useState(15);
  const [isInLobby, setIsInLobby] = useState(true);
  const [aiStrategy, setAiStrategy] = useState<AIStrategyId>('balanced');

  // Attempt to keep the experience locked to landscape on supported browsers/devices.
  useEffect(() => {
    const lockLandscape = async () => {
      try {
        if (window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch (error) {
        console.warn('Orientation lock failed', error);
      }
    };

    lockLandscape();
    const handleOrientationChange = () => lockLandscape();
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  // Game Loop for AI
  useEffect(() => {
    if (!gameState || gameState.winnerId) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.isHuman) {
      let cancelled = false;
      const timer = setTimeout(async () => {
        try {
          const nextState = await performAIMove(gameState);
          if (!cancelled) {
            setGameState(nextState);
          }
        } catch (error) {
          console.error('AI turn failed', error);
        }
      }, 1500); // AI Thinking time
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, [gameState]);

  const handleStartGame = (
    players: { name: string, isHuman: boolean, id: string }[],
    score: number,
    aiStrat: AIStrategyId,
    aiStrategiesBySeat?: AIStrategyId[],
  ) => {
    setTargetScore(score);
    setAiStrategy(aiStrat);
    const initial = initializeGame(players, score, aiStrat, aiStrategiesBySeat);
    setGameState(initial);
    setIsInLobby(false);
  };

  const handleRestart = () => {
    setIsInLobby(true);
    setGameState(null);
  };

  // Actions passed to GameBoard
  const onTakeGems = (gems: GemColor[]) => {
    if (!gameState) return;
    setGameState(takeGems(gameState, gems));
  };

  const onReserve = (card: Card) => {
    if (!gameState) return;
    setGameState(reserveCard(gameState, card));
  };

  const onBuy = (card: Card, isReserved: boolean) => {
    if (!gameState) return;
    setGameState(buyCard(gameState, card, isReserved));
  };

  return (
    <div className="h-dvh max-h-dvh w-full bg-space-black text-white font-mono crt overflow-hidden flex flex-col">
      {/* Background Starfield effect handled by CSS/Container */}
      
      {isInLobby && (
        <Lobby onJoin={handleStartGame} />
      )}

      {!isInLobby && gameState && !gameState.winnerId && (
        <GameBoard 
          gameState={gameState} 
          onTakeGems={onTakeGems}
          onReserve={onReserve}
          onBuy={onBuy}
        />
      )}

      {!isInLobby && gameState && gameState.winnerId && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-6 sm:space-y-8 z-10 bg-space-dark/90">
            <Trophy size={56} className="text-yellow-400 animate-bounce" />
            <h1 className="text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 font-bold font-header leading-tight">
              {gameState.players.find(p => p.id === gameState.winnerId)?.name} WINS!
            </h1>
            <p className="text-lg sm:text-xl text-gray-300">
              Score: {gameState.players.find(p => p.id === gameState.winnerId)?.points}
            </p>
            <button 
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-space-accent hover:bg-purple-600 text-white rounded-none border-2 border-white shadow-pixel transition-all hover:translate-y-1 hover:shadow-none"
            >
              <RotateCcw /> REINITIALIZE MISSION
            </button>
        </div>
      )}
    </div>
  );
};

export default App;