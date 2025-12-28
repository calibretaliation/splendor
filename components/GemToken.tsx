import React from 'react';
import { GemColor } from '../types';
import { GEM_DISPLAY_COLORS } from '../constants';

interface GemTokenProps {
  color: GemColor;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const GemToken: React.FC<GemTokenProps> = ({ color, count, size = 'md', selected, onClick, disabled }) => {
  const sizeClass = {
    sm: 'w-8 h-8 text-sm border-2',
    md: 'w-12 h-12 text-lg border-4',
    lg: 'w-16 h-16 text-xl border-4',
  }[size];

  const palette = GEM_DISPLAY_COLORS[color];
  const isGold = color === GemColor.Gold;
  const disabledClasses = disabled
    ? isGold
      ? 'opacity-90 cursor-not-allowed'
      : 'opacity-50 grayscale cursor-not-allowed'
    : 'hover:brightness-110 active:scale-95';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-sm flex items-center justify-center font-bold text-white transition-all font-mono
        ${sizeClass}
        ${selected ? 'ring-2 ring-white scale-110 z-10' : ''}
        ${disabledClasses}
        shadow-pixel
      `}
      style={{
        backgroundColor: palette.base,
        borderColor: palette.border,
        color: palette.text,
      }}
    >
      <div className="absolute inset-1 border-t border-l border-white/30 rounded-sm"></div>
      {count !== undefined && (
        <span className="relative z-10 drop-shadow-md">{count}</span>
      )}
    </button>
  );
};

export default GemToken;