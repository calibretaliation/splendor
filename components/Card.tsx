import React from 'react';
import { Card as CardType, GemColor } from '../types';
import { GEM_DISPLAY_COLORS } from '../constants';

interface CardProps {
  card: CardType;
  onSelect?: () => void;
  onBuild?: () => void;
  onReserve?: () => void;
  canBuy?: boolean;
  canReserve?: boolean;
  isReservedView?: boolean;
  disabled?: boolean;
  density?: 'normal' | 'compact' | 'micro';
  isSelected?: boolean;
  highlight?: boolean;
}

const Card: React.FC<CardProps> = ({
  card,
  onSelect,
  onBuild,
  onReserve,
  canBuy,
  canReserve,
  isReservedView,
  disabled,
  density = 'normal',
  isSelected,
  highlight,
}) => {
  const isCompact = density === 'compact';
  const isMicro = density === 'micro';
  const sizeClasses = isMicro
    ? 'w-[66px] h-[96px] p-1'
    : isCompact
    ? 'w-[78px] h-[108px] p-1.5'
    : 'w-[128px] h-36 md:w-[148px] md:h-40 p-2.5';
  const pointsSize = isMicro ? 'text-base' : isCompact ? 'text-lg' : 'text-2xl';
  const bonusSize = isMicro ? 'w-3.5 h-3.5' : isCompact ? 'w-4 h-4' : 'w-6 h-6';
  const artSpacing = isMicro ? 'my-1' : isCompact ? 'my-1' : 'my-2';
  const cardIdText = isMicro ? 'text-[6px]' : isCompact ? 'text-[7px]' : 'text-[10px]';
  const costSize = isMicro ? 'w-4.5 h-4.5 text-[9px]' : isCompact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-[12px]';
  const overlayText = isMicro ? 'text-[8px] py-1' : isCompact ? 'text-[9px] py-1.5' : 'text-xs py-2';
  const glowClass = highlight ? 'shadow-[0_0_14px_rgba(250,204,21,0.65)]' : '';
  const selectedClass = isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900' : '';
  const showActions = Boolean(!disabled && isSelected);
  const buildDisabled = !canBuy;
  const reserveDisabled = !canReserve;
  return (
    <div
      data-card-interactive="true"
      onClick={() => {
        if (disabled) return;
        onSelect?.();
      }}
      className={`
        relative bg-space-light border-b-4 border-r-4
        flex flex-col justify-between shrink-0 transition-transform ${sizeClasses}
        ${!disabled ? 'cursor-pointer' : ''}
        ${glowClass}
        ${selectedClass}
        ${disabled ? 'opacity-50 grayscale' : ''}
      `}
      style={{ borderColor: GEM_DISPLAY_COLORS[card.bonus].border }}
    >
      {/* Header: Points & Bonus */}
      <div className="flex justify-between items-start">
        <span className={`text-white font-bold leading-none drop-shadow-md font-header ${pointsSize}`}>
          {card.points > 0 ? card.points : ''}
        </span>
        <div
          className={`${bonusSize} rounded-sm border shadow-sm`}
          style={{
            backgroundColor: GEM_DISPLAY_COLORS[card.bonus].base,
            borderColor: GEM_DISPLAY_COLORS[card.bonus].border,
          }}
        ></div>
      </div>

      {/* Art Placeholder */}
      <div className={`flex-1 bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden relative ${artSpacing}`}>
        {/* Simple pixel art pattern via CSS gradients */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(135deg, ${card.bonus === 'red' ? '#500' : '#005'} 15%, transparent 15%), linear-gradient(225deg, #000 15%, transparent 15%), linear-gradient(45deg, #222 15%, transparent 15%), linear-gradient(315deg, #333 15%, transparent 15%)`,
            backgroundPosition: `${card.imageIndex ? card.imageIndex * 4 : 4}px 0`,
            backgroundSize: '14px 14px',
          }}
        ></div>
        <div className={`z-10 text-gray-400 font-mono tracking-tighter ${cardIdText}`}>MOD-{card.id}</div>
      </div>

      {/* Cost */}
      <div className="flex flex-wrap gap-1 items-end content-end">
        {(Object.keys(card.cost) as GemColor[]).map(color => {
          const amount = card.cost[color];
          if (!amount) return null;
          const palette = GEM_DISPLAY_COLORS[color];
          return (
            <div
              key={color}
                className={`rounded-full border flex items-center justify-center font-bold ${costSize}`}
              style={{
                backgroundColor: 'transparent',
                borderColor: palette.border,
                color: palette.base,
                paddingInline: 1,
                }}
            >
              {amount}
            </div>
          );
        })}
      </div>

      {/* Action Overlay */}
      {showActions && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 transition-opacity z-20">
          <button
            type="button"
            disabled={buildDisabled}
            onClick={event => {
              event.stopPropagation();
              if (!buildDisabled) onBuild?.();
            }}
            className={`px-3 w-full font-bold border uppercase tracking-wider ${overlayText} ${buildDisabled ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' : 'bg-green-600 border-green-400 text-white hover:bg-green-500'}`}
          >
            BUILD
          </button>
          {!isReservedView && onReserve && (
            <button
              type="button"
              disabled={reserveDisabled}
              onClick={event => {
                event.stopPropagation();
                if (!reserveDisabled) onReserve();
              }}
              className={`px-3 w-full font-bold border uppercase tracking-wider ${overlayText} ${reserveDisabled ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' : 'bg-yellow-600 border-yellow-400 text-white hover:bg-yellow-500'}`}
            >
              RESERVE
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Card;