import React, { useState, useEffect } from 'react';
import { GameState, GemColor, Card as CardType } from '../types';
import Card from './Card';
import GemToken from './GemToken';
import PlayerPanel from './PlayerPanel';
import { canBuyCard, getGemCount } from '../services/gameEngine';
import { MAX_GEMS, GEM_DISPLAY_COLORS } from '../constants';

interface GameBoardProps {
  gameState: GameState;
  onTakeGems: (gems: GemColor[]) => void;
  onReserve: (card: CardType) => void;
  onBuy: (card: CardType, isReserved: boolean) => void;
}

const COMPACT_MAX_HEIGHT = 520;
const COMPACT_MAX_WIDTH = 960;

const useCompactLayout = () => {
    const evaluate = () => {
        if (typeof window === 'undefined') return false;
        const { innerWidth, innerHeight } = window;
        return innerWidth > innerHeight && innerHeight <= COMPACT_MAX_HEIGHT && innerWidth <= COMPACT_MAX_WIDTH;
    };

    const [isCompact, setIsCompact] = useState<boolean>(evaluate);

    useEffect(() => {
        const handleResize = () => setIsCompact(evaluate());
        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    return isCompact;
};

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTakeGems, onReserve, onBuy }) => {
  const me = gameState.players[0]; 
  const opponents = gameState.players.slice(1);
  const isMyTurn = gameState.currentPlayerIndex === 0;

    const isCompact = useCompactLayout();

  const [selectedGems, setSelectedGems] = useState<GemColor[]>([]);
  const [showMyReserved, setShowMyReserved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // --- Interaction Handlers ---

  const handleGemClick = (color: GemColor) => {
    if (!isMyTurn || color === GemColor.Gold) return;
    
    if (gameState.gems[color] <= 0) {
        showMessage("No crystals left in this cluster.");
        return;
    }

    let newSelection = [...selectedGems];
    const countAlready = newSelection.filter(c => c === color).length;
    
    if (countAlready === 1) {
        if (gameState.gems[color] < 4) {
            showMessage("Need 4+ crystals to take 2 of the same kind.");
            return;
        }
        if (newSelection.length > 1) {
             showMessage("Cannot combine '2 same' with other colors.");
             return;
        }
        newSelection.push(color);
    } else if (countAlready === 0) {
        if (newSelection.length === 2 && newSelection[0] === newSelection[1]) {
            showMessage("Cannot add more crystals.");
            return;
        }
        if (newSelection.length >= 3) {
            showMessage("Max 3 crystals per turn.");
            return;
        }
        newSelection.push(color);
    } else {
        showMessage("Max 2 of the same crystal.");
        return;
    }
    
    setSelectedGems(newSelection);
  };

  const confirmGemSelection = () => {
    if (getGemCount(me) + selectedGems.length > MAX_GEMS) {
        showMessage(`Storage full! Limit ${MAX_GEMS}.`);
        setSelectedGems([]);
        return;
    }
    onTakeGems(selectedGems);
    setSelectedGems([]);
  };

  const showMessage = (msg: string) => {
      setMessage(msg);
      setTimeout(() => setMessage(null), 2000);
  };

  const handleCardClick = (card: CardType, isReserved: boolean = false) => {
    if (!isMyTurn) return;

    if (canBuyCard(me, card)) {
        onBuy(card, isReserved);
        if(isReserved) setShowMyReserved(false);
    } else if (!isReserved) {
        if (me.reservedCards.length < 3) {
             onReserve(card);
        } else {
             showMessage("Reserve slots full (Max 3).");
        }
    } else {
        showMessage("Cannot afford this module yet.");
    }
  };

  // Helper for Noble Colors
  const getRequirementStyle = (color: string) => {
      const palette = GEM_DISPLAY_COLORS[color as GemColor] ?? GEM_DISPLAY_COLORS[GemColor.White];
      return {
          backgroundColor: palette.base,
          borderColor: palette.border,
          color: palette.text,
      };
  };

    const opponentGridCols = opponents.length === 1 ? 'grid-cols-1' : opponents.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const selectionBadgeClass = isCompact
        ? 'absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse shadow-md border border-white'
        : 'absolute -top-3 -right-3 bg-green-500 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse shadow-md border border-white';
    const actionButtonText = isCompact ? 'text-[11px] py-1.5' : 'text-sm py-2';
    const messageClassName = isCompact
        ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 text-white px-4 py-3 border-2 border-white shadow-pixel font-bold animate-bounce font-header tracking-wider text-sm'
        : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 text-white px-6 py-4 border-2 border-white shadow-pixel font-bold animate-bounce font-header tracking-wider';

    const renderNobleCard = (variant: 'normal' | 'compact', noble: GameState['nobles'][number]) => {
        const containerClasses = variant === 'compact'
            ? 'w-14 h-18 p-1 text-[9px]'
            : 'w-20 h-24 p-1.5 text-xs';
        const pointsClasses = variant === 'compact' ? 'text-sm' : 'text-xl';
        const spacer = variant === 'compact' ? 'mb-1' : 'mb-2';

        return (
            <div
                key={noble.id}
                className={`${containerClasses} bg-space-light border-2 border-purple-500 flex flex-col shadow-md`}
                title={noble.name}
            >
                <div className={`flex items-center justify-between ${spacer}`}>
                    <span className={`text-white font-header font-bold leading-none ${pointsClasses}`}>{noble.points}</span>
                    <span className="text-[8px] text-purple-200 uppercase truncate max-w-[60%]">{noble.name ?? ''}</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 justify-start">
                    {Object.entries(noble.requirements).map(([color, count]) => {
                        if (!count) return null;
                        return (
                            <div
                                key={color}
                                className={`${variant === 'compact' ? 'h-4 text-[9px] px-1' : 'h-5 text-xs px-1.5'} w-full rounded-sm border font-bold flex items-center leading-none`}
                                style={getRequirementStyle(color)}
                            >
                                {count}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMyPanel = (variant: 'normal' | 'compact') => (
        <div className={`${variant === 'compact' ? 'relative h-full' : 'h-[28%] min-h-[180px] w-full relative'}`}>
            <PlayerPanel player={me} isMe={true} isActive={isMyTurn} density={variant === 'compact' ? 'compact' : 'normal'} />
            <button
                onClick={() => setShowMyReserved(!showMyReserved)}
                className={`${variant === 'compact' ? 'absolute top-2 right-2 bg-yellow-600 border border-yellow-400 text-[11px] px-2.5 py-1 z-20 font-bold font-header tracking-wider hover:bg-yellow-500' : 'absolute top-3 right-3 bg-yellow-600 border border-yellow-400 text-xs px-3 py-1.5 z-20 font-bold font-header tracking-wider hover:bg-yellow-500'}`}
            >
                {showMyReserved ? 'CLOSE RESERVES' : `VIEW RESERVES (${me.reservedCards.length})`}
            </button>
            {showMyReserved && (
                <div className={`${variant === 'compact' ? 'absolute inset-0 bg-black/95 z-30 flex flex-col items-center justify-center p-3 gap-4' : 'absolute inset-0 bg-black/95 z-30 flex flex-col items-center justify-center p-4 gap-6 animate-in fade-in slide-in-from-bottom-10'}`}>
                    <h3 className={`${variant === 'compact' ? 'text-lg' : 'text-xl'} text-yellow-500 font-header tracking-widest`}>
                        RESERVED MODULES
                    </h3>
                    <div className={`${variant === 'compact' ? 'flex flex-wrap w-full justify-center gap-2' : 'flex gap-4 overflow-x-auto w-full justify-center p-4'}`}>
                        {me.reservedCards.length === 0 && <span className="text-gray-500 font-mono">NO DATA RESERVED</span>}
                        {me.reservedCards.map(card => (
                            <Card
                                key={card.id}
                                card={card}
                                canBuy={isMyTurn && canBuyCard(me, card)}
                                isReservedView={true}
                                onClick={() => handleCardClick(card, true)}
                                density={variant === 'compact' ? 'compact' : 'normal'}
                            />
                        ))}
                    </div>
                    <button
                        onClick={() => setShowMyReserved(false)}
                        className={`${variant === 'compact' ? 'text-gray-400 hover:text-white text-xs font-mono underline' : 'text-gray-400 hover:text-white mt-4 font-mono underline'}`}
                    >
                        CLOSE
                    </button>
                </div>
            )}
        </div>
    );

    const renderLog = (variant: 'normal' | 'compact') => {
        if (variant === 'compact') {
            return (
                <div className="bg-black/80 backdrop-blur text-green-400 text-[11px] py-1 px-2 text-center font-mono border-t border-green-900/50 tracking-wide">
                    LOG: {gameState.lastAction}
                </div>
            );
        }

        return (
            <div className="absolute bottom-[28%] left-0 right-0 bg-black/80 backdrop-blur text-green-400 text-sm py-1 px-2 text-center pointer-events-none font-mono border-t border-green-900/50 tracking-wide">
                LOG: {gameState.lastAction}
            </div>
        );
    };

    if (isCompact) {
        return (
            <div className="relative h-full w-full overflow-hidden grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-2 p-2">
                {message && <div className={messageClassName}>{message}</div>}

                <div className="col-[1/2] row-[1/3] flex bg-space-dark/80 border border-space-black rounded-lg overflow-hidden">
                    <div className="w-24 bg-space-black border-r border-gray-800 flex flex-col">
                        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2">
                            {([GemColor.White, GemColor.Blue, GemColor.Green, GemColor.Red, GemColor.Black, GemColor.Gold] as GemColor[]).map(color => (
                                <div key={color} className="relative">
                                    <GemToken
                                        color={color}
                                        count={gameState.gems[color]}
                                        size="sm"
                                        onClick={() => handleGemClick(color)}
                                        disabled={!isMyTurn || color === GemColor.Gold}
                                    />
                                    {selectedGems.includes(color) && (
                                        <div className={selectionBadgeClass}>
                                            {selectedGems.filter(c => c === color).length}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="h-20 border-t border-gray-800 bg-gray-900/70 p-2 flex flex-col justify-center gap-2">
                            {selectedGems.length > 0 ? (
                                <>
                                    <button
                                        onClick={confirmGemSelection}
                                        className={`w-full bg-green-600 text-white font-bold border border-green-400 hover:bg-green-500 font-header uppercase shadow-lg ${actionButtonText}`}
                                    >
                                        CONFIRM
                                    </button>
                                    <button
                                        onClick={() => setSelectedGems([])}
                                        className={`w-full bg-red-600 text-white font-bold border border-red-400 hover:bg-red-500 font-header uppercase shadow-lg ${actionButtonText}`}
                                    >
                                        CANCEL
                                    </button>
                                </>
                            ) : (
                                <div className="text-center text-gray-500 font-mono text-[11px]">
                                    SELECT CRYSTALS
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 p-1.5 overflow-hidden">
                        {[3, 2, 1].map(level => {
                            const lvlKey = `level${level}` as keyof typeof gameState.market;
                            const cards = gameState.market[lvlKey];
                            const deckCount = gameState.decks[lvlKey].length;

                            return (
                                <div key={level} className="flex gap-1.5 items-center flex-1 min-h-0">
                                    <div className="w-14 h-18 rounded border border-dashed border-gray-600 flex flex-col items-center justify-center bg-gray-900 text-gray-400 font-mono text-[11px] shrink-0">
                                        <div>LVL {level}</div>
                                        <div>[{deckCount}]</div>
                                    </div>
                                    <div className="flex-1 flex gap-2 justify-center items-center">
                                        {cards.map(card => (
                                            <Card
                                                key={card.id}
                                                card={card}
                                                canBuy={isMyTurn && canBuyCard(me, card)}
                                                canReserve={isMyTurn && me.reservedCards.length < 3}
                                                onClick={() => handleCardClick(card)}
                                                onReserve={() => onReserve(card)}
                                                density="compact"
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="col-[2/3] row-[1/2] flex flex-col bg-space-dark/80 border border-space-black rounded-lg overflow-hidden">
                    <div className="px-2 py-1 border-b border-space-black">
                        <div className="text-[11px] text-purple-300 font-bold uppercase tracking-wider text-center font-header">
                            Alien Overlords
                        </div>
                        <div className="mt-1 flex flex-nowrap justify-between gap-1 overflow-hidden">
                            {gameState.nobles.map(noble => renderNobleCard('compact', noble))}
                        </div>
                    </div>
                    <div className={`flex-1 p-2 grid ${opponentGridCols} gap-1 auto-rows-fr`}>
                        {opponents.map((opp, idx) => (
                            <PlayerPanel
                                key={opp.id}
                                player={opp}
                                isMe={false}
                                isActive={gameState.currentPlayerIndex === idx + 1}
                                density="compact"
                            />
                        ))}
                    </div>
                </div>

                <div className="col-[2/3] row-[2/3] flex flex-col bg-space-black/90 border border-space-black rounded-lg overflow-hidden">
                    <div className="flex-1 relative">
                        {renderMyPanel('compact')}
                    </div>
                    {renderLog('compact')}
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full w-full overflow-hidden">
            {message && <div className={messageClassName}>{message}</div>}

            <div className="h-[28%] bg-space-dark border-b-4 border-space-black flex shrink-0">
                <div className="w-1/3 md:w-1/4 border-r-4 border-space-black bg-purple-900/10 p-2 overflow-y-auto custom-scrollbar">
                    <div className="text-sm text-purple-300 font-bold mb-2 uppercase tracking-wider text-center font-header">Alien Overlords</div>
                    <div className="flex flex-wrap justify-center gap-3 p-1">
                        {gameState.nobles.map(noble => renderNobleCard('normal', noble))}
                    </div>
                </div>
                <div className={`flex-1 grid ${opponentGridCols} gap-1 p-1 bg-space-dark`}>
                    {opponents.map((opp, idx) => (
                        <PlayerPanel
                            key={opp.id}
                            player={opp}
                            isMe={false}
                            isActive={gameState.currentPlayerIndex === idx + 1}
                        />
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className="w-32 md:w-40 bg-space-black border-r-4 border-gray-800 flex flex-col">
                    <div className="flex-1 overflow-y-auto py-4 flex flex-col items-center gap-4 custom-scrollbar">
                        {([GemColor.White, GemColor.Blue, GemColor.Green, GemColor.Red, GemColor.Black, GemColor.Gold] as GemColor[]).map(color => (
                            <div key={color} className="relative group shrink-0">
                                <GemToken
                                    color={color}
                                    count={gameState.gems[color]}
                                    size="md"
                                    onClick={() => handleGemClick(color)}
                                    disabled={!isMyTurn || color === GemColor.Gold}
                                />
                                {selectedGems.includes(color) && (
                                    <div className={selectionBadgeClass}>
                                        {selectedGems.filter(c => c === color).length}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="h-28 shrink-0 border-t-2 border-gray-800 bg-gray-900/50 p-3 flex flex-col justify-center gap-2">
                        {selectedGems.length > 0 ? (
                            <>
                                <button
                                    onClick={confirmGemSelection}
                                    className="w-full bg-green-600 text-white text-sm py-2 font-bold border-2 border-green-400 hover:bg-green-500 font-header uppercase shadow-lg"
                                >
                                    CONFIRM
                                </button>
                                <button
                                    onClick={() => setSelectedGems([])}
                                    className="w-full bg-red-600 text-white text-sm py-2 font-bold border-2 border-red-400 hover:bg-red-500 font-header uppercase shadow-lg"
                                >
                                    CANCEL
                                </button>
                            </>
                        ) : (
                            <div className="text-center text-gray-600 font-mono text-xs">
                                SELECT CRYSTALS
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-between p-2 md:p-4 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                    {[3, 2, 1].map(level => {
                        const lvlKey = `level${level}` as keyof typeof gameState.market;
                        const cards = gameState.market[lvlKey];
                        const deckCount = gameState.decks[lvlKey].length;

                        return (
                            <div key={level} className="flex gap-4 items-center mb-4">
                                <div className="w-20 h-28 md:w-24 md:h-32 rounded border-2 border-dashed border-gray-600 flex items-center justify-center bg-gray-900 text-gray-500 font-mono text-sm text-center shrink-0">
                                    <div>
                                        LVL {level}
                                        <br />
                                        [{deckCount}]
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar-hide">
                                    {cards.map(card => (
                                        <Card
                                            key={card.id}
                                            card={card}
                                            canBuy={isMyTurn && canBuyCard(me, card)}
                                            canReserve={isMyTurn && me.reservedCards.length < 3}
                                            onClick={() => handleCardClick(card)}
                                            onReserve={() => onReserve(card)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {renderMyPanel('normal')}
            {renderLog('normal')}
        </div>
    );
};

export default GameBoard;