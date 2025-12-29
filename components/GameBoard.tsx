import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { GameState, GemColor, Card as CardType, Noble, Player, ActionLogEntry } from '../types';
import Card from './Card';
import GemToken from './GemToken';
import PlayerPanel from './PlayerPanel';
import { canBuyCard, getGemCount } from '../services/gameEngine';
import { MAX_GEMS, MAX_RESERVED, GEM_DISPLAY_COLORS } from '../constants';
import { ALL_GEMS } from '../services/gameUtils';
import { useBoardLayout, BoardLayout } from './board/layout';

interface GameBoardProps {
    gameState: GameState;
    onTakeGems: (gems: GemColor[]) => void;
    onReserve: (card: CardType) => void;
    onBuy: (card: CardType, isReserved: boolean) => void;
    hostId: string | null;
    localPlayerId: string;
    onAbortMission: () => void;
}

type RequirementStyleFn = (color: string) => React.CSSProperties;

interface NobleCardProps {
    noble: Noble;
    layout: BoardLayout;
    requirementStyle: RequirementStyleFn;
}

const nobleSizing: Record<BoardLayout, {
    container: string;
    points: string;
    spacer: string;
    name: string;
    requirementsWrapper: string;
    requirementsGap: string;
    requirementSize: string;
}> = {
    mobilePortrait: {
        container: 'w-[76px] h-[90px] p-1.5 text-[9px]',
        points: 'text-base',
        spacer: 'mb-1',
        name: 'text-[8px]',
        requirementsWrapper: 'px-1 w-full',
        requirementsGap: 'gap-1',
        requirementSize: 'w-4 h-5 text-[9px]',
    },
    mobileLandscape: {
        container: 'w-[54px] h-[64px] p-1 text-[7px]',
        points: 'text-[11px]',
        spacer: 'mb-1',
        name: 'text-[6px]',
        requirementsWrapper: 'px-0.5 w-full',
        requirementsGap: 'gap-0.5',
        requirementSize: 'w-2.5 h-4 text-[8px]',
    },
    tablet: {
        container: 'w-[72px] h-[94px] p-1.5 text-[9px]',
        points: 'text-sm',
        spacer: 'mb-1',
        name: 'text-[8px]',
        requirementsWrapper: 'px-1.5 w-full',
        requirementsGap: 'gap-1',
        requirementSize: 'w-4.5 h-6 text-[10px]',
    },
    desktop: {
        container: 'w-[80px] h-[102px] p-1.5 text-[11px]',
        points: 'text-lg',
        spacer: 'mb-1.5',
        name: 'text-[9px]',
        requirementsWrapper: 'px-2 w-full',
        requirementsGap: 'gap-1',
        requirementSize: 'w-6 h-7 text-[11px]',
    },
};

const NobleCard: React.FC<NobleCardProps> = ({ noble, layout, requirementStyle }) => {
    const sizing = nobleSizing[layout];
    const requirements = Object.entries(noble.requirements).filter(([, count]) => count);

    return (
        <div className={`${sizing.container} bg-space-light border-2 border-purple-500 flex flex-col shadow-md shrink-0`} title={noble.name}>
            <div className={`flex items-center justify-between ${sizing.spacer}`}>
                <span className={`text-white font-header font-bold leading-none ${sizing.points}`}>{noble.points}</span>
                <span className={`${sizing.name} text-purple-200 uppercase text-right leading-tight max-w-[75%] whitespace-normal break-words`}>
                    {noble.name ?? ''}
                </span>
            </div>
            <div className={`flex-1 flex items-end justify-start w-full ${sizing.requirementsWrapper}`}>
                <div
                    className={`flex flex-nowrap items-end justify-start ${sizing.requirementsGap} overflow-x-auto scrollbar-hide`}
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {requirements.map(([color, count]) => (
                        <div
                            key={color}
                            className={`${sizing.requirementSize} inline-flex rounded-full border flex-none items-center justify-center font-bold shadow-none`}
                            style={{
                                ...requirementStyle(color),
                                borderRadius: '999px',
                            }}
                        >
                            {count}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface NobleShelfProps {
    nobles: Noble[];
    layout: BoardLayout;
    requirementStyle: RequirementStyleFn;
}

const NobleShelf: React.FC<NobleShelfProps> = ({ nobles, layout, requirementStyle }) => (
    <>
        {nobles.slice(0, 4).map(noble => (
            <NobleCard key={noble.id} noble={noble} layout={layout} requirementStyle={requirementStyle} />
        ))}
    </>
);

interface GemRackProps {
    layout: BoardLayout;
    isMyTurn: boolean;
    supply: GameState['gems'];
    selected: GemColor[];
    onSelect: (color: GemColor) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

const GemRack: React.FC<GemRackProps> = ({ layout, isMyTurn, supply, selected, onSelect, onConfirm, onCancel }) => {
    if (layout === 'mobilePortrait') {
        return (
            <div className="bg-space-black/80 border border-space-black rounded-lg p-3 flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {ALL_GEMS.map(color => (
                        <div key={color} className="relative shrink-0">
                            <GemToken
                                color={color}
                                count={supply[color]}
                                size="lg"
                                onClick={() => onSelect(color)}
                                disabled={!isMyTurn || color === GemColor.Gold}
                            />
                            {selected.includes(color) && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse shadow-md border border-white">
                                    {selected.filter(c => c === color).length}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {selected.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onConfirm} className="bg-green-600 text-white font-bold border border-green-400 hover:bg-green-500 font-header uppercase text-xs py-2 rounded-sm">
                            Confirm
                        </button>
                        <button onClick={onCancel} className="bg-red-600 text-white font-bold border border-red-400 hover:bg-red-500 font-header uppercase text-xs py-2 rounded-sm">
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 font-mono text-[11px]">Select crystals</div>
                )}
            </div>
        );
    }

    if (layout === 'mobileLandscape') {
        return (
            <div className="w-[68px] bg-space-black/85 border border-space-black rounded-lg flex flex-col min-h-0">
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2">
                    {ALL_GEMS.map(color => (
                        <div key={color} className="relative">
                            <GemToken
                                color={color}
                                count={supply[color]}
                                size="lg"
                                onClick={() => onSelect(color)}
                                disabled={!isMyTurn || color === GemColor.Gold}
                            />
                            {selected.includes(color) && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse shadow-md border border-white">
                                    {selected.filter(c => c === color).length}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="border-t border-gray-800 bg-gray-900/60 p-2 flex flex-col gap-2">
                    {selected.length > 0 ? (
                        <>
                            <button onClick={onConfirm} className="w-full bg-green-600 text-white text-[11px] py-1.5 font-bold border border-green-400 hover:bg-green-500 font-header uppercase shadow-md">
                                Confirm
                            </button>
                            <button onClick={onCancel} className="w-full bg-red-600 text-white text-[11px] py-1.5 font-bold border border-red-400 hover:bg-red-500 font-header uppercase shadow-md">
                                Cancel
                            </button>
                        </>
                    ) : (
                        <div className="text-center text-gray-500 font-mono text-[10px]">Select crystals</div>
                    )}
                </div>
            </div>
        );
    }

    const isTablet = layout === 'tablet';
    const tokenSize = isTablet ? 'md' : 'lg';
    const containerClass = isTablet
        ? 'bg-space-black/85 border border-space-black rounded-lg flex flex-col min-h-0'
        : 'w-32 xl:w-40 bg-space-black border-r-4 border-gray-800 flex flex-col';
    const rackClass = isTablet
        ? 'flex-1 flex flex-row md:flex-col md:items-center gap-2 md:gap-3 overflow-x-auto md:overflow-y-auto py-3 px-2'
        : 'flex-1 overflow-y-auto py-4 flex flex-col items-center gap-4 custom-scrollbar';
    const actionAreaClass = isTablet
        ? 'p-3 border-t border-gray-800 bg-gray-900/60 flex flex-col gap-2'
        : 'h-28 shrink-0 border-t-2 border-gray-800 bg-gray-900/50 p-3 flex flex-col justify-center gap-2';
    const actionButtonClass = isTablet
        ? 'w-full bg-green-600 text-white text-xs py-2 font-bold border border-green-400 hover:bg-green-500 font-header uppercase shadow-lg'
        : 'w-full bg-green-600 text-white text-sm py-2 font-bold border-2 border-green-400 hover:bg-green-500 font-header uppercase shadow-lg';
    const cancelButtonClass = isTablet
        ? 'w-full bg-red-600 text-white text-xs py-2 font-bold border border-red-400 hover:bg-red-500 font-header uppercase shadow-lg'
        : 'w-full bg-red-600 text-white text-sm py-2 font-bold border-2 border-red-400 hover:bg-red-500 font-header uppercase shadow-lg';
    const emptyTextClass = isTablet
        ? 'text-center text-gray-500 font-mono text-xs'
        : 'text-center text-gray-600 font-mono text-xs';

    const selectionBadgeClass = isTablet
        ? 'absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse shadow-md border border-white'
        : 'absolute -top-3 -right-3 bg-green-500 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse shadow-md border border-white';

    return (
        <div className={containerClass}>
            <div className={rackClass}>
                {ALL_GEMS.map(color => (
                    <div key={color} className="relative shrink-0">
                        <GemToken
                            color={color}
                            count={supply[color]}
                            size={tokenSize}
                            onClick={() => onSelect(color)}
                            disabled={!isMyTurn || color === GemColor.Gold}
                        />
                        {selected.includes(color) && (
                            <div className={selectionBadgeClass}>{selected.filter(c => c === color).length}</div>
                        )}
                    </div>
                ))}
            </div>
            <div className={actionAreaClass}>
                {selected.length > 0 ? (
                    <>
                        <button onClick={onConfirm} className={actionButtonClass}>CONFIRM</button>
                        <button onClick={onCancel} className={cancelButtonClass}>CANCEL</button>
                    </>
                ) : (
                    <div className={emptyTextClass}>SELECT CRYSTALS</div>
                )}
            </div>
        </div>
    );
};

interface MarketSectionProps {
    layout: BoardLayout;
    gameState: GameState;
    canAct: (card: CardType) => boolean;
    canReserve: boolean;
    selectedCardId: string | null;
    futureBuyableCardIds: Set<string>;
    onSelectCard: (card: CardType) => void;
    onBuildCard: (card: CardType) => void;
    onReserveCard: (card: CardType) => void;
}

const MarketSection: React.FC<MarketSectionProps> = ({ layout, gameState, canAct, canReserve, selectedCardId, futureBuyableCardIds, onSelectCard, onBuildCard, onReserveCard }) => {
    if (layout === 'mobilePortrait') {
        const density: 'compact' | 'micro' = 'compact';
        return (
            <div className="bg-space-dark/85 border border-space-black rounded-lg p-3 flex flex-col gap-3 min-h-0">
                {[3, 2, 1].map(level => {
                    const levelKey = `level${level}` as keyof typeof gameState.market;
                    const cards = gameState.market[levelKey];
                    const deckCount = gameState.decks[levelKey].length;
                    return (
                        <div key={level} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs text-gray-300 font-mono uppercase">
                                <span className="flex items-center gap-1">Level {level}</span>
                                <span className="text-[10px] text-gray-500">Deck {deckCount}</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide justify-center">
                                {cards.map(card => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        canBuy={canAct(card)}
                                        canReserve={canReserve}
                                        onSelect={() => onSelectCard(card)}
                                        onBuild={() => onBuildCard(card)}
                                        onReserve={() => onReserveCard(card)}
                                        isSelected={selectedCardId === card.id}
                                        highlight={futureBuyableCardIds.has(card.id)}
                                        density={density}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (layout === 'mobileLandscape') {
        return (
            <div className="flex-[1.2] min-w-0 flex flex-col gap-2 pb-1">
                {[3, 2, 1].map(level => {
                    const levelKey = `level${level}` as keyof typeof gameState.market;
                    const cards = gameState.market[levelKey];
                    const deckCount = gameState.decks[levelKey].length;
                    return (
                        <div key={level} className="flex gap-2 items-stretch flex-1 min-h-[92px] min-w-0">
                            <div className="w-9 rounded border border-dashed border-gray-600 flex flex-col items-center justify-center bg-gray-900 text-gray-400 font-mono text-[9px] shrink-0">
                                <div>LV {level}</div>
                                <div>[{deckCount}]</div>
                            </div>
                            <div className="flex-1 min-w-0 flex gap-2.5 overflow-x-auto pb-1 pr-1 scrollbar-hide items-center justify-center">
                                {cards.map(card => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        canBuy={canAct(card)}
                                        canReserve={canReserve}
                                        onSelect={() => onSelectCard(card)}
                                        onBuild={() => onBuildCard(card)}
                                        onReserve={() => onReserveCard(card)}
                                        isSelected={selectedCardId === card.id}
                                        highlight={futureBuyableCardIds.has(card.id)}
                                        density="micro"
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const density = layout === 'desktop' ? 'normal' : 'compact';
    const isTablet = layout === 'tablet';
    const containerClass = isTablet
        ? 'bg-space-dark/85 border border-space-black rounded-lg p-3 flex flex-col gap-3 min-h-0'
        : 'flex-[1.25] min-w-0 flex flex-col justify-between p-4 overflow-y-auto bg-space-dark/80 border-l-4 border-space-black rounded-r-lg gap-4';
    const rowClass = isTablet ? 'flex gap-3 items-center min-h-0' : 'flex gap-4 items-center';
    const cardsWrapperClass = isTablet
        ? 'flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide justify-center'
        : 'flex gap-4 overflow-x-auto pb-4 px-1 scrollbar-hide justify-center';
    const deckClass = isTablet
        ? 'w-16 h-24 rounded border border-dashed border-gray-600 flex flex-col items-center justify-center bg-gray-900 text-gray-400 font-mono text-[11px] shrink-0'
        : 'w-24 h-32 rounded border-2 border-dashed border-gray-600 flex flex-col items-center justify-center bg-gray-900 text-gray-500 font-mono text-sm text-center shrink-0';

    return (
        <div className={containerClass}>
            {[3, 2, 1].map(level => {
                const levelKey = `level${level}` as keyof typeof gameState.market;
                const cards = gameState.market[levelKey];
                const deckCount = gameState.decks[levelKey].length;

                return (
                    <div key={level} className={rowClass}>
                        <div className={deckClass}>
                            <div>LVL {level}</div>
                            <div>[{deckCount}]</div>
                        </div>
                        <div className={cardsWrapperClass}>
                            {cards.map(card => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    canBuy={canAct(card)}
                                    canReserve={canReserve}
                                    onSelect={() => onSelectCard(card)}
                                    onBuild={() => onBuildCard(card)}
                                    onReserve={() => onReserveCard(card)}
                                    isSelected={selectedCardId === card.id}
                                    highlight={futureBuyableCardIds.has(card.id)}
                                    density={density}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface OpponentsGridProps {
    layout: BoardLayout;
    opponents: Player[];
    activePlayerId: string | null;
}

const OpponentsGrid: React.FC<OpponentsGridProps> = ({ layout, opponents, activePlayerId }) => {
    if (opponents.length === 0) {
        return <div className="text-center text-xs text-gray-500 font-mono">No other explorers</div>;
    }

    if (layout === 'mobilePortrait') {
        return (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {opponents.map(opp => (
                    <div key={opp.id} className="min-w-[160px]">
                        <PlayerPanel
                            player={opp}
                            isMe={false}
                            isActive={activePlayerId === opp.id}
                            density="micro"
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (layout === 'mobileLandscape') {
        return (
            <div className="flex flex-col gap-1 min-h-0">
                {opponents.map(opp => (
                    <div key={opp.id} className="shrink-0">
                        <PlayerPanel
                            player={opp}
                            isMe={false}
                            isActive={activePlayerId === opp.id}
                            density="compact"
                        />
                    </div>
                ))}
            </div>
        );
    }

    const gridCols = opponents.length === 1 ? 'grid-cols-1' : opponents.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const baseClass = layout === 'tablet'
        ? `grid ${gridCols} gap-2 p-2 bg-space-dark/70 rounded-lg min-h-0`
        : `flex-1 grid ${gridCols} gap-3 p-2 bg-space-dark rounded-lg min-h-0`;

    return (
        <div className={baseClass}>
            {opponents.map(opp => (
                <PlayerPanel
                    key={opp.id}
                    player={opp}
                    isMe={false}
                    isActive={activePlayerId === opp.id}
                    density={layout === 'desktop' ? 'normal' : 'compact'}
                />
            ))}
        </div>
    );
};

interface ReservedOverlayProps {
    layout: BoardLayout;
    cards: CardType[];
    canBuy: (card: CardType) => boolean;
    selectedCardId: string | null;
    onSelect: (card: CardType) => void;
    onBuild: (card: CardType) => void;
    onClose: () => void;
}

const ReservedOverlay: React.FC<ReservedOverlayProps> = ({ layout, cards, canBuy, selectedCardId, onSelect, onBuild, onClose }) => {
    const isFullScreenMobile = layout === 'mobilePortrait' || layout === 'mobileLandscape';
    const containerClass = isFullScreenMobile
        ? 'fixed inset-0 bg-black/95 z-40 flex items-center justify-center p-3 sm:p-4'
        : 'absolute inset-0 bg-black/90 z-40 flex items-center justify-center p-3';
    const panelClass = isFullScreenMobile
        ? 'w-full max-w-3xl max-h-[95vh] bg-space-black/95 border border-yellow-700 rounded-lg shadow-[0_0_24px_rgba(250,204,21,0.35)] p-3 flex flex-col gap-3'
        : 'w-full h-full bg-space-black/90 border border-yellow-700 rounded-lg p-3 flex flex-col gap-3';
    const titleClass = layout === 'desktop' ? 'text-2xl' : 'text-xl';
    const listWrapperClass = 'flex-1 w-full overflow-hidden';
    const cardDensity: 'normal' | 'compact' | 'micro' = layout === 'desktop'
        ? 'normal'
        : layout === 'tablet'
        ? 'compact'
        : 'micro';
    const listRowClass = layout === 'desktop'
        ? 'flex gap-4 justify-center flex-wrap px-2'
        : 'flex gap-2 justify-center flex-wrap overflow-y-auto px-1 pb-1';

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={containerClass} onClick={handleBackdropClick}>
            <div className={panelClass} onClick={event => event.stopPropagation()}>
                <div className="flex items-center justify-between gap-2">
                    <h3 className={`${titleClass} text-yellow-500 font-header tracking-widest`}>Reserved Modules</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1 text-xs uppercase font-header border border-yellow-500 text-yellow-300 hover:text-yellow-100"
                    >
                        Close ✕
                    </button>
                </div>
                <div className={listWrapperClass}>
                    {cards.length === 0 ? (
                        <div className="text-center text-gray-500 font-mono text-sm py-6">No reserved cards</div>
                    ) : (
                        <div className={listRowClass}>
                            {cards.map(card => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    canBuy={canBuy(card)}
                                    canReserve={false}
                                    isReservedView
                                    onSelect={() => onSelect(card)}
                                    onBuild={() => onBuild(card)}
                                    isSelected={selectedCardId === card.id}
                                    density={cardDensity}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-center text-[10px] text-gray-500 font-mono uppercase tracking-wide">
                    Tap a module to highlight, then build to deploy instantly.
                </div>
            </div>
        </div>
    );
};

interface MyPanelProps {
    layout: BoardLayout;
    player: Player;
    isActive: boolean;
    showReserved: boolean;
    onToggleReserved: () => void;
    canBuyReserved: (card: CardType) => boolean;
    selectedReservedCardId: string | null;
    onReservedCardSelect: (card: CardType) => void;
    onReservedCardBuild: (card: CardType) => void;
    onCloseReserved: () => void;
    onHeaderClick?: () => void;
    isHost: boolean;
    showAbortMenu: boolean;
}

const MyPanel: React.FC<MyPanelProps> = ({
    layout,
    player,
    isActive,
    showReserved,
    onToggleReserved,
    canBuyReserved,
    selectedReservedCardId,
    onReservedCardSelect,
    onReservedCardBuild,
    onCloseReserved,
    onHeaderClick,
    isHost,
    showAbortMenu,
}) => {
    const wrapperClass =
        layout === 'desktop'
            ? 'h-full w-full relative flex flex-col gap-2'
            : layout === 'mobileLandscape'
            ? 'relative h-full flex flex-col gap-2'
            : 'relative w-full flex flex-col gap-2';
    const panelWrapperClass =
        layout === 'desktop'
            ? 'flex-1 min-h-0 w-full'
            : 'w-full';
    const buttonWrapperClass =
        layout === 'desktop'
            ? 'mt-auto pt-3 flex justify-end'
            : layout === 'mobileLandscape'
            ? 'mt-auto pt-2'
            : 'mt-3';
    const buttonClass = layout === 'desktop'
        ? 'bg-yellow-600 border border-yellow-400 text-xs px-4 py-1.5 font-bold font-header tracking-wider hover:bg-yellow-500'
        : 'w-full bg-yellow-600 border border-yellow-400 text-[11px] px-3 py-1.5 font-bold font-header tracking-wider hover:bg-yellow-500';

    return (
        <div className={wrapperClass}>
            <div className={panelWrapperClass}>
                <PlayerPanel
                    player={player}
                    isMe
                    isActive={isActive}
                    density={layout === 'desktop' ? 'normal' : layout === 'mobileLandscape' ? 'micro' : 'compact'}
                    onSelfHeaderClick={isHost ? onHeaderClick : undefined}
                />
            </div>
            <div className={buttonWrapperClass}>
                <button onClick={onToggleReserved} className={buttonClass}>
                    {showReserved ? 'Close Reserves' : `View Reserves (${player.reservedCards.length})`}
                </button>
            </div>
            {showReserved && !showAbortMenu && (
                <ReservedOverlay
                    layout={layout}
                    cards={player.reservedCards}
                    canBuy={canBuyReserved}
                    selectedCardId={selectedReservedCardId}
                    onSelect={onReservedCardSelect}
                    onBuild={onReservedCardBuild}
                    onClose={onCloseReserved}
                />
            )}
        </div>
    );
};

interface ActionLogProps {
    layout: BoardLayout;
    lastAction?: string | null;
    onOpenHistory?: () => void;
}

const actionLogVariants: Record<BoardLayout, { container: string; hint: string }> = {
    mobilePortrait: {
        container: 'w-full bg-black/80 backdrop-blur text-green-400 text-[11px] py-2 px-3 text-center font-mono border border-green-900/50 tracking-wide rounded flex flex-col gap-0.5 transition-colors duration-200',
        hint: 'text-[9px] uppercase tracking-[0.3em] text-green-200 font-header',
    },
    mobileLandscape: {
        container: 'w-full bg-black/75 backdrop-blur text-green-400 text-[10px] py-1.5 px-2 text-center font-mono border border-green-900/40 tracking-wide rounded flex flex-col gap-0.5 transition-colors duration-200',
        hint: 'text-[8px] uppercase tracking-[0.35em] text-green-200 font-header',
    },
    tablet: {
        container: 'w-full bg-black/75 backdrop-blur text-green-400 text-xs py-2 px-3 text-center font-mono border border-green-900/40 tracking-wide rounded-lg flex flex-col gap-0.5 transition-colors duration-200',
        hint: 'text-[9px] uppercase tracking-[0.35em] text-green-200 font-header',
    },
    desktop: {
        container: 'absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-green-400 text-sm py-2 px-4 text-center font-mono border border-green-900/50 tracking-wide rounded-lg shadow-lg flex flex-col gap-0.5 transition-colors duration-200',
        hint: 'text-[10px] uppercase tracking-[0.35em] text-green-200 font-header',
    },
};

const ActionLog: React.FC<ActionLogProps> = ({ layout, lastAction, onOpenHistory }) => {
    if (!lastAction) {
        return null;
    }

    const { container, hint } = actionLogVariants[layout];
    const isInteractive = Boolean(onOpenHistory);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenHistory?.();
        }
    };

    return (
        <div
            role={isInteractive ? 'button' : undefined}
            aria-label={isInteractive ? 'Open opponent history overlay' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onClick={isInteractive ? onOpenHistory : undefined}
            onKeyDown={handleKeyDown}
            className={`${container} ${isInteractive ? 'cursor-pointer hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70' : 'cursor-default'}`}
        >
            <div>LOG: {lastAction}</div>
            {isInteractive && <div className={hint}>Tap for opponent history</div>}
        </div>
    );
};

interface HistoryOverlayProps {
    layout: BoardLayout;
    entries: ActionLogEntry[];
    onClose: () => void;
}

const HistoryOverlay: React.FC<HistoryOverlayProps> = ({ layout, entries, onClose }) => {
    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const bodyClass = layout === 'mobileLandscape'
        ? 'max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar'
        : 'max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar';

    const sortedEntries = [...entries].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    const entryGroups = sortedEntries.reduce<Record<number, ActionLogEntry[]>>((acc, entry) => {
        if (!acc[entry.turn]) acc[entry.turn] = [];
        acc[entry.turn].push(entry);
        return acc;
    }, {});
    const orderedTurns = Object.keys(entryGroups).map(Number).sort((a, b) => b - a);
    const totalActions = sortedEntries.length;

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            onClick={handleBackdropClick}
        >
            <div
                className="w-full max-w-md bg-space-black/95 border border-green-800 rounded-2xl shadow-2xl text-green-100 flex flex-col gap-3 p-4"
                onClick={event => event.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div className="uppercase text-green-300 tracking-[0.3em] text-xs font-header">Opponent History</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-green-200 text-xs font-bold uppercase tracking-widest border border-green-400/50 rounded px-3 py-1 hover:bg-green-600/20"
                    >
                        Close
                    </button>
                </div>
                <div className="text-[11px] text-gray-300 font-mono">
                    Last 2 rounds · {totalActions} action{totalActions === 1 ? '' : 's'}
                </div>
                <div className={bodyClass}>
                    {orderedTurns.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-6">No opponent activity recorded yet.</div>
                    ) : (
                        orderedTurns.map(turn => (
                            <div key={turn} className="mb-4 last:mb-0">
                                <div className="text-[11px] uppercase tracking-[0.3em] text-green-400 font-header mb-2">
                                    Round {turn}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {entryGroups[turn].map((entry, idx) => (
                                        <HistoryEntryCard key={`${entry.timestamp ?? `${entry.playerId}-${entry.kind}-${entry.summary}`}-${idx}`} entry={entry} />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const HistoryEntryCard: React.FC<{ entry: ActionLogEntry }> = ({ entry }) => {
    const timestampLabel = entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
    const details = buildEntryDetails(entry);

    return (
        <div className="bg-black/50 border border-green-900/40 rounded-lg p-2.5 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-purple-200 uppercase font-mono tracking-widest">
                <span className="truncate max-w-[65%]">{entry.playerName}</span>
                {timestampLabel && <span>{timestampLabel}</span>}
            </div>
            <div className="text-sm text-white font-semibold leading-snug">{entry.summary}</div>
            {details.map((detail, idx) => (
                <div key={`${detail}-${idx}`} className="text-[11px] text-green-200 font-mono">
                    {detail}
                </div>
            ))}
        </div>
    );
};

type LogPayload = Record<string, unknown> | undefined;

const getPayloadString = (payload: LogPayload, key: string): string | undefined => {
    if (!payload) return undefined;
    const value = payload[key];
    return typeof value === 'string' ? value : undefined;
};

const getPayloadNumber = (payload: LogPayload, key: string): number | undefined => {
    if (!payload) return undefined;
    const value = payload[key];
    return typeof value === 'number' ? value : undefined;
};

const getPayloadBoolean = (payload: LogPayload, key: string): boolean | undefined => {
    if (!payload) return undefined;
    const value = payload[key];
    return typeof value === 'boolean' ? value : undefined;
};

const buildGemCountsFromPayload = (payload: LogPayload): Partial<Record<GemColor, number>> | null => {
    if (!payload) return null;
    const rawCounts = payload['gemCounts'];
    if (rawCounts && typeof rawCounts === 'object') {
        const counts: Partial<Record<GemColor, number>> = {};
        Object.entries(rawCounts as Record<string, unknown>).forEach(([color, value]) => {
            if (typeof value === 'number' && value > 0) {
                counts[color as GemColor] = value;
            }
        });
        if (Object.keys(counts).length > 0) {
            return counts;
        }
    }

    const rawGems = payload['gems'];
    if (Array.isArray(rawGems)) {
        const counts = rawGems.reduce<Partial<Record<GemColor, number>>>((acc, gem) => {
            if (typeof gem === 'string') {
                const normalized = gem as GemColor;
                acc[normalized] = (acc[normalized] ?? 0) + 1;
            }
            return acc;
        }, {});
        if (Object.keys(counts).length > 0) {
            return counts;
        }
    }

    return null;
};

const formatGemCounts = (counts: Partial<Record<GemColor, number>>): string => {
    const parts = ALL_GEMS.filter(color => (counts[color] ?? 0) > 0).map(color => `${capitalize(color)} ×${counts[color] as number}`);
    return parts.join(', ');
};

const buildCardDescriptor = (payload: LogPayload): string | null => {
    const cardId = getPayloadString(payload, 'cardId');
    const cardName = getPayloadString(payload, 'cardName');
    const cardLevel = getPayloadNumber(payload, 'cardLevel');
    const cardPoints = getPayloadNumber(payload, 'cardPoints');
    const segments: string[] = [];
    if (cardLevel) segments.push(`Lv${cardLevel}`);
    if (cardName) segments.push(cardName);
    if (cardId) segments.push(cardName ? `#${cardId}` : cardId);
    if (typeof cardPoints === 'number') segments.push(`${cardPoints} pts`);
    return segments.length ? segments.join(' · ') : null;
};

const buildEntryDetails = (entry: ActionLogEntry): string[] => {
    const details: string[] = [];
    const payload = entry.payload;

    if (entry.kind === 'TAKE_GEMS') {
        const gemCounts = buildGemCountsFromPayload(payload);
        if (gemCounts) {
            details.push(`Crystals: ${formatGemCounts(gemCounts)}`);
        }
    }

    if (entry.kind === 'RESERVE' || entry.kind === 'BUY') {
        const descriptor = buildCardDescriptor(payload);
        if (descriptor) {
            details.push(`Card: ${descriptor}`);
        }
        if (entry.kind === 'RESERVE') {
            const fromDeck = getPayloadNumber(payload, 'fromDeckLevel');
            details.push(`Source: ${fromDeck ? `Deck Lv${fromDeck}` : 'Market'}`);
        }
        if (entry.kind === 'BUY') {
            const fromReserve = Boolean(getPayloadBoolean(payload, 'isReserved'));
            details.push(`Source: ${fromReserve ? 'Reserved hangar' : 'Market'}`);
        }
    }

    return details;
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const MessageOverlay: React.FC<{ layout: BoardLayout; message: string }> = ({ layout, message }) => {
    const className = layout === 'mobilePortrait'
        ? 'fixed inset-x-6 top-1/3 z-50 bg-red-600 text-white px-4 py-3 border-2 border-white shadow-pixel font-bold animate-bounce font-header tracking-wider text-sm text-center rounded'
        : layout === 'mobileLandscape'
        ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 text-white px-4 py-3 border-2 border-white shadow-pixel font-bold animate-bounce font-header tracking-wider text-sm rounded'
        : layout === 'tablet'
        ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 text-white px-5 py-4 border-2 border-white shadow-pixel font-bold animate-bounce font-header tracking-wider rounded'
        : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 text-white px-6 py-4 border-2 border-white shadow-pixel font-bold animate-bounce font-header tracking-wider rounded';

    return <div className={className}>{message}</div>;
};

interface AbortOverlayProps {
    layout: BoardLayout;
    onConfirm: () => void;
    onCancel: () => void;
}

const AbortOverlay: React.FC<AbortOverlayProps> = ({ layout, onConfirm, onCancel }) => {
    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onCancel]);

    const maxWidthClass = layout === 'desktop'
        ? 'max-w-md'
        : layout === 'tablet'
        ? 'max-w-sm'
        : 'max-w-xs';

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onCancel();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Abort mission confirmation"
            onClick={handleBackdropClick}
        >
            <div
                className={`${maxWidthClass} w-full bg-space-black/95 border border-red-700/60 rounded-2xl shadow-2xl p-5 text-center flex flex-col gap-4`}
                onClick={event => event.stopPropagation()}
            >
                <div className="text-red-400 text-lg font-header tracking-[0.5em] uppercase">Abort Mission</div>
                <p className="text-sm text-gray-300 font-mono leading-relaxed">
                    Ending the mission boots every explorer back to the hangar. Progress on this run is lost.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className="w-full bg-red-700 hover:bg-red-600 text-white font-bold uppercase tracking-widest py-2.5 border border-red-300"
                    >
                        Abort Mission
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white font-mono py-2.5 border border-gray-600"
                    >
                        Return to Board
                    </button>
                </div>
            </div>
        </div>
    );
};

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTakeGems, onReserve, onBuy, hostId, localPlayerId, onAbortMission }) => {
    const resolvedIndex = gameState.players.findIndex(player => player.id === localPlayerId);
    const meIndex = resolvedIndex === -1 ? 0 : resolvedIndex;
    const me = gameState.players[meIndex] ?? gameState.players[0];
    const opponents = gameState.players.filter((_, idx) => idx !== meIndex);
    const isMyTurn = gameState.currentPlayerIndex === meIndex;
    const layout = useBoardLayout();
    const isHost = Boolean(hostId && hostId === me.id);
    const activePlayerId = gameState.players[gameState.currentPlayerIndex]?.id ?? null;

    const [selectedGems, setSelectedGems] = useState<GemColor[]>([]);
    const [showMyReserved, setShowMyReserved] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [showAbortMenu, setShowAbortMenu] = useState(false);
    const [selectedCardKey, setSelectedCardKey] = useState<{ id: string; source: 'market' | 'reserve' } | null>(null);
    const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);

    const handleSelfHeaderClick = () => {
        if (!isHost) return;
        setShowAbortMenu(true);
    };

    const handleAbortConfirm = () => {
        setShowAbortMenu(false);
        onAbortMission();
    };

    const handleAbortCancel = () => {
        setShowAbortMenu(false);
    };

    const toggleReservedOverlay = () => {
        setShowAbortMenu(false);
        setShowMyReserved(prev => {
            const next = !prev;
            if (!next && selectedCardKey?.source === 'reserve') {
                setSelectedCardKey(null);
            }
            return next;
        });
    };

    const closeReservedOverlay = () => {
        setShowMyReserved(false);
        if (selectedCardKey?.source === 'reserve') {
            setSelectedCardKey(null);
        }
    };

    const requirementStyle = useMemo<RequirementStyleFn>(() => (color: string) => {
        const palette = GEM_DISPLAY_COLORS[color as GemColor] ?? GEM_DISPLAY_COLORS[GemColor.White];
        return {
            backgroundColor: 'transparent',
            borderColor: palette.border,
            color: palette.base,
        };
    }, []);

    const opponentHistory = useMemo<ActionLogEntry[]>(() => {
        const entries = Array.isArray(gameState.history) ? gameState.history : [];
        const opponentEntries = entries.filter(entry => entry.playerId !== me.id);
        const uniqueTurns = Array.from(new Set(opponentEntries.map(entry => entry.turn))).sort((a, b) => b - a);
        const allowedTurns = new Set(uniqueTurns.slice(0, 2));
        return opponentEntries
            .filter(entry => allowedTurns.has(entry.turn))
            .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    }, [gameState.history, me.id]);

    const openHistoryOverlay = useCallback(() => setShowHistoryOverlay(true), []);
    const closeHistoryOverlay = useCallback(() => setShowHistoryOverlay(false), []);


    useEffect(() => {
        if (!isHost && showAbortMenu) {
            setShowAbortMenu(false);
        }
    }, [isHost, showAbortMenu]);

    useEffect(() => {
        if (!selectedCardKey) return;
        if (typeof window === 'undefined') return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.closest('[data-card-interactive="true"]')) return;
            setSelectedCardKey(null);
        };
        window.addEventListener('pointerdown', handlePointerDown);
        return () => window.removeEventListener('pointerdown', handlePointerDown);
    }, [selectedCardKey]);

    useEffect(() => {
        setSelectedCardKey(null);
    }, [gameState.currentPlayerIndex]);

    const handleGemClick = (color: GemColor) => {
        if (!isMyTurn || color === GemColor.Gold) return;
        if (gameState.gems[color] <= 0) {
            showMessage('No crystals left in this cluster.');
            return;
        }

        const next = [...selectedGems];
        const countAlready = next.filter(c => c === color).length;

        if (countAlready === 1) {
            if (gameState.gems[color] < 4) {
                showMessage('Need 4+ crystals to take 2 of the same kind.');
                return;
            }
            if (next.length > 1) {
                showMessage("Cannot combine '2 same' with other colors.");
                return;
            }
            next.push(color);
        } else if (countAlready === 0) {
            if (next.length === 2 && next[0] === next[1]) {
                showMessage('Cannot add more crystals.');
                return;
            }
            if (next.length >= 3) {
                showMessage('Max 3 crystals per turn.');
                return;
            }
            next.push(color);
        } else {
            showMessage('Max 2 of the same crystal.');
            return;
        }

        setSelectedGems(next);
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

    const clearSelectedCard = () => setSelectedCardKey(null);

    const selectCard = (cardId: string, source: 'market' | 'reserve') => {
        if (!isMyTurn) return;
        setSelectedCardKey(prev => (prev && prev.id === cardId && prev.source === source ? null : { id: cardId, source }));
    };

    const findMarketCardById = (cardId: string): CardType | undefined => {
        const levelKeys: Array<keyof GameState['market']> = ['level3', 'level2', 'level1'];
        for (const key of levelKeys) {
            const match = gameState.market[key].find(card => card.id === cardId);
            if (match) return match;
        }
        return undefined;
    };

    const findReservedCardById = (cardId: string): CardType | undefined =>
        me.reservedCards.find(card => card.id === cardId);

    const attemptBuildCard = (card: CardType, isReserved: boolean) => {
        if (!isMyTurn) return;
        if (!canBuyCard(me, card)) {
            showMessage('Cannot afford this module yet.');
            return;
        }
        onBuy(card, isReserved);
        if (isReserved) {
            setShowMyReserved(false);
        }
        clearSelectedCard();
    };

    const attemptReserveCard = (card: CardType) => {
        if (!isMyTurn) return;
        if (me.reservedCards.length >= MAX_RESERVED) {
            showMessage(`Reserve slots full (Max ${MAX_RESERVED}).`);
            return;
        }
        onReserve(card);
        clearSelectedCard();
    };

    const handleBuildCard = (cardId: string, source: 'market' | 'reserve') => {
        const card = source === 'reserve' ? findReservedCardById(cardId) : findMarketCardById(cardId);
        if (!card) {
            clearSelectedCard();
            return;
        }
        attemptBuildCard(card, source === 'reserve');
    };

    const handleReserveCard = (cardId: string) => {
        const card = findMarketCardById(cardId);
        if (!card) {
            clearSelectedCard();
            return;
        }
        attemptReserveCard(card);
    };

    const handleMarketCardSelect = (card: CardType) => selectCard(card.id, 'market');
    const handleReservedCardSelect = (card: CardType) => selectCard(card.id, 'reserve');
    const handleMarketCardBuild = (card: CardType) => handleBuildCard(card.id, 'market');
    const handleReservedCardBuild = (card: CardType) => handleBuildCard(card.id, 'reserve');
    const handleMarketCardReserve = (card: CardType) => handleReserveCard(card.id);

    const canActOnCard = (card: CardType) => isMyTurn && canBuyCard(me, card);
    const canReserveCard = isMyTurn && me.reservedCards.length < MAX_RESERVED;
    const futureBuyableCardIds = useMemo(() => {
        const simulatedPlayer: Player = {
            ...me,
            gems: { ...me.gems },
        };
        selectedGems.forEach(color => {
            simulatedPlayer.gems[color] = (simulatedPlayer.gems[color] ?? 0) + 1;
        });
        const ids = new Set<string>();
        (['level1', 'level2', 'level3'] as const).forEach(levelKey => {
            gameState.market[levelKey].forEach(card => {
                if (canBuyCard(simulatedPlayer, card)) {
                    ids.add(card.id);
                }
            });
        });
        return ids;
    }, [selectedGems, me, gameState.market]);

    const selectedMarketCardId = selectedCardKey?.source === 'market' ? selectedCardKey.id : null;
    const selectedReservedCardId = selectedCardKey?.source === 'reserve' ? selectedCardKey.id : null;

    const renderMobilePortrait = () => (
        <div className="flex flex-col gap-3 h-full w-full overflow-y-auto p-2 pb-6">
            <div className="bg-space-black/80 border border-space-black rounded-lg p-3">
                <div className="text-[11px] text-purple-300 font-bold uppercase tracking-wider text-center font-header mb-2">Alien Overlords</div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <NobleShelf nobles={gameState.nobles} layout={layout} requirementStyle={requirementStyle} />
                </div>
            </div>
            <div className="bg-space-black/80 border border-space-black rounded-lg p-3">
                <div className="text-[11px] text-purple-300 font-bold uppercase tracking-wider text-center font-header mb-2">Crew Manifest</div>
                <OpponentsGrid layout={layout} opponents={opponents} activePlayerId={activePlayerId} />
            </div>
            <GemRack
                layout={layout}
                isMyTurn={isMyTurn}
                supply={gameState.gems}
                selected={selectedGems}
                onSelect={handleGemClick}
                onConfirm={confirmGemSelection}
                onCancel={() => setSelectedGems([])}
            />
            <MarketSection
                layout={layout}
                gameState={gameState}
                canAct={canActOnCard}
                canReserve={canReserveCard}
                selectedCardId={selectedMarketCardId}
                futureBuyableCardIds={futureBuyableCardIds}
                onSelectCard={handleMarketCardSelect}
                onBuildCard={handleMarketCardBuild}
                onReserveCard={handleMarketCardReserve}
            />
            <div className="bg-space-black/85 border border-space-black rounded-lg p-3">
                <MyPanel
                    layout={layout}
                    player={me}
                    isActive={isMyTurn}
                    showReserved={showMyReserved}
                    onToggleReserved={toggleReservedOverlay}
                    canBuyReserved={card => isMyTurn && canBuyCard(me, card)}
                    selectedReservedCardId={selectedReservedCardId}
                    onReservedCardSelect={handleReservedCardSelect}
                    onReservedCardBuild={handleReservedCardBuild}
                    onCloseReserved={closeReservedOverlay}
                    onHeaderClick={handleSelfHeaderClick}
                    isHost={isHost}
                    showAbortMenu={showAbortMenu}
                />
            </div>
            <ActionLog layout={layout} lastAction={gameState.lastAction} onOpenHistory={openHistoryOverlay} />
        </div>
    );

    const renderMobileLandscape = () => (
        <div className="h-full w-full flex gap-2 p-2">
            <div className="flex-shrink-0 flex flex-col">
                <GemRack
                    layout={layout}
                    isMyTurn={isMyTurn}
                    supply={gameState.gems}
                    selected={selectedGems}
                    onSelect={handleGemClick}
                    onConfirm={confirmGemSelection}
                    onCancel={() => setSelectedGems([])}
                />
            </div>

            <div className="flex-[1.3] min-w-0 bg-space-dark/85 border border-space-black rounded-lg p-2 flex flex-col">
                <div className="flex-1 min-h-0">
                    <MarketSection
                        layout={layout}
                        gameState={gameState}
                        canAct={canActOnCard}
                        canReserve={canReserveCard}
                        selectedCardId={selectedMarketCardId}
                        futureBuyableCardIds={futureBuyableCardIds}
                        onSelectCard={handleMarketCardSelect}
                        onBuildCard={handleMarketCardBuild}
                        onReserveCard={handleMarketCardReserve}
                    />
                </div>
                <div className={`pt-2 ${gameState.lastAction ? 'mt-2 border-t border-space-black/40' : ''}`}>
                    <ActionLog layout={layout} lastAction={gameState.lastAction} onOpenHistory={openHistoryOverlay} />
                </div>
            </div>

            <div className="w-28 sm:w-32 flex flex-col gap-1.5">
                <div className="bg-space-dark/85 border border-space-black rounded-lg p-2 flex flex-col gap-1.5">
                    <div className="text-[11px] text-purple-300 font-bold uppercase tracking-wider text-center font-header">Alien Overlords</div>
                    <div className="grid grid-cols-2 gap-1 place-items-center">
                        <NobleShelf nobles={gameState.nobles} layout={layout} requirementStyle={requirementStyle} />
                    </div>
                </div>
                <div className="flex-1 bg-space-black/85 border border-space-black rounded-lg p-2 min-h-0">
                    <MyPanel
                        layout={layout}
                        player={me}
                        isActive={isMyTurn}
                        showReserved={showMyReserved}
                        onToggleReserved={toggleReservedOverlay}
                        canBuyReserved={card => isMyTurn && canBuyCard(me, card)}
                        selectedReservedCardId={selectedReservedCardId}
                        onReservedCardSelect={handleReservedCardSelect}
                        onReservedCardBuild={handleReservedCardBuild}
                        onCloseReserved={closeReservedOverlay}
                        onHeaderClick={handleSelfHeaderClick}
                        isHost={isHost}
                        showAbortMenu={showAbortMenu}
                    />
                </div>
            </div>

            <div className="w-28 sm:w-32 flex flex-col gap-2 bg-space-black/70 border border-space-black rounded-lg p-2 min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                    <OpponentsGrid layout={layout} opponents={opponents} activePlayerId={activePlayerId} />
                </div>
            </div>
        </div>
    );

    const renderTablet = () => (
        <div className="flex flex-col gap-3 h-full w-full overflow-hidden p-2 sm:p-3">
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] flex-1 min-h-0">
                <div className="flex flex-col bg-space-dark/80 border border-space-black rounded-lg min-h-0">
                    <MarketSection
                        layout={layout}
                        gameState={gameState}
                        canAct={canActOnCard}
                        canReserve={canReserveCard}
                        selectedCardId={selectedMarketCardId}
                        futureBuyableCardIds={futureBuyableCardIds}
                        onSelectCard={handleMarketCardSelect}
                        onBuildCard={handleMarketCardBuild}
                        onReserveCard={handleMarketCardReserve}
                    />
                </div>
                <div className="flex flex-col gap-3 min-h-0">
                    <div className="bg-space-dark/80 border border-space-black rounded-lg p-3">
                        <div className="text-[11px] text-purple-300 font-bold uppercase tracking-wider text-center font-header mb-2">Alien Overlords</div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <NobleShelf nobles={gameState.nobles} layout={layout} requirementStyle={requirementStyle} />
                        </div>
                    </div>
                    <OpponentsGrid layout={layout} opponents={opponents} activePlayerId={activePlayerId} />
                </div>
            </div>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <GemRack
                    layout={layout}
                    isMyTurn={isMyTurn}
                    supply={gameState.gems}
                    selected={selectedGems}
                    onSelect={handleGemClick}
                    onConfirm={confirmGemSelection}
                    onCancel={() => setSelectedGems([])}
                />
                <div className="bg-space-black/85 border border-space-black rounded-lg p-3">
                    <MyPanel
                        layout={layout}
                        player={me}
                        isActive={isMyTurn}
                        showReserved={showMyReserved}
                        onToggleReserved={toggleReservedOverlay}
                        canBuyReserved={card => isMyTurn && canBuyCard(me, card)}
                        selectedReservedCardId={selectedReservedCardId}
                        onReservedCardSelect={handleReservedCardSelect}
                        onReservedCardBuild={handleReservedCardBuild}
                        onCloseReserved={closeReservedOverlay}
                        onHeaderClick={handleSelfHeaderClick}
                        isHost={isHost}
                        showAbortMenu={showAbortMenu}
                    />
                </div>
            </div>
            <ActionLog layout={layout} lastAction={gameState.lastAction} onOpenHistory={openHistoryOverlay} />
        </div>
    );

    const renderDesktop = () => (
        <div className="relative flex flex-col h-full w-full overflow-hidden gap-4 p-3 lg:p-6">
            <div className="flex gap-4 h-[30%] min-h-[220px] shrink-0">
                <div className="w-72 xl:w-80 bg-space-dark/80 border border-space-black rounded-lg p-3 overflow-y-auto custom-scrollbar">
                    <div className="text-sm text-purple-300 font-bold uppercase tracking-wider text-center font-header mb-3">Alien Overlords</div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <NobleShelf nobles={gameState.nobles} layout={layout} requirementStyle={requirementStyle} />
                    </div>
                </div>
                <OpponentsGrid layout={layout} opponents={opponents} activePlayerId={activePlayerId} />
            </div>
            <div className="flex-1 flex gap-4 overflow-hidden">
                <GemRack
                    layout={layout}
                    isMyTurn={isMyTurn}
                    supply={gameState.gems}
                    selected={selectedGems}
                    onSelect={handleGemClick}
                    onConfirm={confirmGemSelection}
                    onCancel={() => setSelectedGems([])}
                />
                <MarketSection
                    layout={layout}
                    gameState={gameState}
                    canAct={canActOnCard}
                    canReserve={canReserveCard}
                    selectedCardId={selectedMarketCardId}
                    futureBuyableCardIds={futureBuyableCardIds}
                    onSelectCard={handleMarketCardSelect}
                    onBuildCard={handleMarketCardBuild}
                    onReserveCard={handleMarketCardReserve}
                />
            </div>
            <div className="h-[28%] min-h-[210px] bg-space-black/90 border border-space-black rounded-lg p-3">
                <MyPanel
                    layout={layout}
                    player={me}
                    isActive={isMyTurn}
                    showReserved={showMyReserved}
                    onToggleReserved={toggleReservedOverlay}
                    canBuyReserved={card => isMyTurn && canBuyCard(me, card)}
                    selectedReservedCardId={selectedReservedCardId}
                    onReservedCardSelect={handleReservedCardSelect}
                    onReservedCardBuild={handleReservedCardBuild}
                    onCloseReserved={closeReservedOverlay}
                    onHeaderClick={handleSelfHeaderClick}
                    isHost={isHost}
                    showAbortMenu={showAbortMenu}
                />
            </div>
            <ActionLog layout={layout} lastAction={gameState.lastAction} onOpenHistory={openHistoryOverlay} />
        </div>
    );

    const content = layout === 'desktop'
        ? renderDesktop()
        : layout === 'tablet'
        ? renderTablet()
        : layout === 'mobileLandscape'
        ? renderMobileLandscape()
        : renderMobilePortrait();

    return (
        <div className="relative h-full w-full overflow-hidden">
            {message && <MessageOverlay layout={layout} message={message} />}
            {showHistoryOverlay && (
                <HistoryOverlay layout={layout} entries={opponentHistory} onClose={closeHistoryOverlay} />
            )}
            {showAbortMenu && (
                <AbortOverlay layout={layout} onConfirm={handleAbortConfirm} onCancel={handleAbortCancel} />
            )}
            {content}
        </div>
    );
};

export default GameBoard;