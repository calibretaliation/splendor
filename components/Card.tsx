import React from 'react';
import { Card as CardType, GemColor } from '../types';
import GemToken from './GemToken';
import { GEM_DISPLAY_COLORS, CARD_LEVEL_BORDER_COLORS } from '../constants';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  onReserve?: () => void;
  canBuy?: boolean;
  canReserve?: boolean;
  isReservedView?: boolean;
  disabled?: boolean;
  density?: 'normal' | 'compact';
}

const Card: React.FC<CardProps> = ({ card, onClick, onReserve, canBuy, canReserve, isReservedView, disabled, density = 'normal' }) => {
  const isCompact = density === 'compact';
  const sizeClasses = isCompact
    ? 'w-[70px] h-[100px] p-1.5'
    : 'w-28 h-36 md:w-32 md:h-40 p-2';
  const pointsSize = isCompact ? 'text-lg' : 'text-2xl';
  const bonusSize = isCompact ? 'w-4 h-4' : 'w-6 h-6';
  const artSpacing = isCompact ? 'my-1' : 'my-2';
  const cardIdText = isCompact ? 'text-[7px]' : 'text-[10px]';
  const costSize = isCompact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-[12px]';
  const overlayText = isCompact ? 'text-[9px] py-1.5' : 'text-xs py-2';
  return (
    <div
      className={`
        relative bg-space-light border-b-4 border-r-4
        flex flex-col justify-between shrink-0 transition-transform ${sizeClasses}
        ${canBuy && !disabled ? 'cursor-pointer hover:-translate-y-1 shadow-neon-blue' : ''}
        ${disabled ? 'opacity-50 grayscale' : ''}
      `}
      style={{ borderColor: CARD_LEVEL_BORDER_COLORS[card.level] }}
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
         <div className="absolute inset-0 opacity-10" style={{
           backgroundImage: `linear-gradient(135deg, ${card.bonus === 'red' ? '#500' : '#005'} 15%, transparent 15%), linear-gradient(225deg, #000 15%, transparent 15%), linear-gradient(45deg, #222 15%, transparent 15%), linear-gradient(315deg, #333 15%, transparent 15%)`,
           backgroundPosition: `${card.imageIndex ? card.imageIndex * 4 : 4}px 0`,
           backgroundSize: '14px 14px',
         }}></div>
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
              className={`rounded-full border flex items-center justify-center font-bold shadow-none ${costSize}`}
              style={{
                backgroundColor: palette.base,
                borderColor: palette.border,
                backgroundImage: 'none',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'auto',
                backgroundBlendMode: 'normal',
                mixBlendMode: 'normal',
                color: palette.text,
              }}
            >
              {amount}
            </div>
          );
        })}
      </div>

      {/* Action Overlay */}
      {!disabled && (canBuy || canReserve) && (
        <div className="absolute inset-0 bg-black/90 opacity-0 hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity z-20">
          {canBuy && (
             <button onClick={onClick} className={`px-3 bg-green-600 text-white font-bold border border-green-400 w-full hover:bg-green-500 uppercase tracking-wider ${overlayText}`}>
               BUILD
             </button>
          )}
          {canReserve && onReserve && !isReservedView && (
             <button onClick={onReserve} className={`px-3 bg-yellow-600 text-white font-bold border border-yellow-400 w-full hover:bg-yellow-500 uppercase tracking-wider ${overlayText}`}>
               RESERVE
             </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Card;