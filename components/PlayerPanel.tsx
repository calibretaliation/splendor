import React from 'react';
import { Player, GemColor } from '../types';
import GemToken from './GemToken';
import { Shield, Star, User } from 'lucide-react';
import { GEM_DISPLAY_COLORS, MAX_GEMS } from '../constants';
import { NON_GOLD_GEMS } from '../services/gameUtils';

interface PlayerPanelProps {
  player: Player;
  isMe: boolean;
  isActive: boolean;
  density?: 'normal' | 'compact' | 'micro';
  onSelfHeaderClick?: () => void;
}

const nameClampStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isMe,
  isActive,
  density = 'normal',
  onSelfHeaderClick,
}) => {
  const getPalette = (color: GemColor) => GEM_DISPLAY_COLORS[color];
  const goldPalette = getPalette(GemColor.Gold);
  const totalGems = NON_GOLD_GEMS.reduce((sum, color) => sum + player.gems[color], player.gems.gold);
  const chipLine = `${totalGems}/${MAX_GEMS}`;
  const reservedCount = player.reservedCards.length;
  // const rsLine = ` ${reservedCount}`;
  const headerClickProps = onSelfHeaderClick
    ? { role: 'button' as const, tabIndex: 0, onClick: onSelfHeaderClick }
    : {};
  const clickableHeaderClass = onSelfHeaderClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : '';
  const activeBorder = isActive
    ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.45)]'
    : 'border-gray-700';
  const nameSizeClass =
    density === 'micro' ? 'text-[8px]' : density === 'compact' ? 'text-[10px]' : 'text-lg';
  const tokenFontClass =
    density === 'micro' ? 'text-[10px]' : density === 'compact' ? 'text-[11px]' : 'text-base';


  const opponentNameWidthClass =
    density === 'micro' ? 'max-w-[110px]' : density === 'compact' ? 'max-w-[160px]' : 'max-w-[240px]';

  const renderOpponentName = (extraClass = '') => (
    <span
      className={`font-header font-bold ${nameSizeClass} text-gray-200 leading-tight break-words whitespace-normal inline-block ${opponentNameWidthClass} ${extraClass}`}
      style={nameClampStyle}
    >
      {player.name}
    </span>
  );

  if (density === 'micro') {
    if (isMe) {
      const bannerClass = isActive
        ? 'bg-green-500 text-black border border-green-300 shadow-[0_0_8px_rgba(34,197,94,0.45)]'
        : 'bg-gray-900/80 text-gray-200 border border-gray-700';

      return (
        <div className={`flex flex-col gap-1.5 bg-space-black border ${activeBorder} p-2 rounded-sm h-full`}>
          <div className={`w-full text-center font-header font-bold tracking-[0.25em] text-[9px] py-0.5 rounded-sm ${bannerClass} leading-none`}>
            <span>YOUR TURN</span>
            <span className="block text-[11px] tracking-tight mt-0.5">{player.name}</span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col text-[10px] font-mono leading-tight text-gray-300">
              <span className="text-white">{chipLine}</span>
              <span className="text-yellow-400 flex items-center gap-1"><Star size={10} className="text-yellow-400" />{player.points}</span>
            </div>
            <div
              className={`flex items-center gap-2 justify-end ${clickableHeaderClass}`}
              {...headerClickProps}
            >
              <div className="w-7 h-7 bg-blue-900 border border-cyan-400 flex items-center justify-center shrink-0">
                <User size={14} className="text-cyan-200" />
              </div>
            </div>
          </div>
          {/* {renderReservedPeek(2, 'sm')} */}
          <div className={`grid grid-cols-3 gap-1 ${tokenFontClass} text-gray-300 font-mono`}>
            {NON_GOLD_GEMS.map(color => {
              const palette = getPalette(color);
              return (
                <div key={color} className="flex items-center justify-between bg-space-dark px-1.5 py-0.5 border border-gray-800">
                  <span className="uppercase" style={{ color: palette.base }}>{player.gems[color]}</span>
                  <span className="font-bold" style={{ color: palette.base }}>+{player.bonuses[color]}</span>
                </div>
              );
            })}
            <div className="flex items-center justify-center bg-space-dark px-1 py-0.5 border border-gray-800">
              <span className={`font-bold ${tokenFontClass}`} style={{ color: goldPalette.base }}>
                {player.gems.gold}/{reservedCount}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`bg-space-dark border ${activeBorder} p-1.5 flex flex-col gap-1 rounded-sm w-full h-full`}>
        <div className="flex items-stretch border-b border-gray-800 pb-0.5">
          <div className="w-1/1.3 pr-1">
            <div className="border border-gray-700 bg-space-black/40 rounded-sm px-1 py-0.5 flex items-center min-w-0 overflow-hidden">
              <div className="min-w-0 w-full">
                {renderOpponentName('text-left')}
              </div>
            </div>
          </div>
          <div className="w-1/2.2 pl-1 flex flex-col text-[9px] font-mono leading-tight text-gray-300 text-right justify-center min-w-0">
            <span className="text-white">{chipLine}</span>
            <span className="text-yellow-400 whitespace-nowrap flex items-center justify-end gap-1"><Star size={9} className="text-yellow-400" /><span>{player.points}</span></span>
          </div>
        </div>
        <div className="flex justify-between px-0.5 gap-0.5">
          {NON_GOLD_GEMS.map(color => {
            const palette = getPalette(color);
            return (
              <div
                key={color}
                className={`w-3.5 h-4 border flex items-center justify-center font-bold ${tokenFontClass}`}
                style={{
                  backgroundColor: palette.base,
                  borderColor: palette.border,
                  color: palette.text,
                }}
              >
                {player.gems[color]}+{player.bonuses[color]}
              </div>
            );
          })}
          <div
            className={`w-4 h-4 border flex items-center justify-center font-bold ${tokenFontClass}`}
            style={{
              backgroundColor: goldPalette.base,
              borderColor: goldPalette.border,
              color: goldPalette.text,
            }}
          >
            {player.gems.gold}/{reservedCount}
          </div>
        </div>
      </div>
    );
  }

  if (density === 'compact') {
    if (isMe) {
      const bannerClass = isActive
        ? 'bg-green-500 text-black border border-green-300 shadow-[0_0_8px_rgba(34,197,94,0.45)]'
        : 'bg-gray-900/80 text-gray-200 border border-gray-700';
      return (
        <div className={`flex flex-col gap-1.5 bg-space-black border ${activeBorder} p-2 rounded-sm h-full`}>
          <div className={`w-full text-center font-header font-bold tracking-[0.25em] text-[10px] py-0.5 rounded-sm ${bannerClass}`}>
            <span>YOUR TURN</span>
            <span className="block text-[13px] tracking-wider mt-0.5">{player.name}</span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col text-[11px] font-mono leading-tight text-gray-300">
              <span className="text-white">{chipLine}</span>
              <span className="text-yellow-400 flex items-center gap-1"><Star size={12} className="text-yellow-400" />{player.points}</span>
            </div>
            <div
              className={`flex items-center gap-2 justify-end ${clickableHeaderClass}`}
              {...headerClickProps}
            >
              <div className="w-8 h-8 bg-blue-900 border border-cyan-400 flex items-center justify-center shrink-0">
                <User size={16} className="text-cyan-200" />
              </div>
            </div>
          </div>
          {/* {renderReservedPeek(2, 'sm')} */}
          <div className={`grid grid-cols-3 gap-1 ${tokenFontClass} text-gray-300 font-mono`}>
            {NON_GOLD_GEMS.map(color => {
              const palette = getPalette(color);
              return (
                <div key={color} className="flex items-center justify-between bg-space-dark px-2 py-1 border border-gray-800">
                  {/* <span className="uppercase" style={{ color: palette.base }}>{color.charAt(0)}</span> */}
                  <span className="font-bold" style={{ color: palette.base }}>
                    {player.gems[color]}/{player.bonuses[color]}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-center bg-space-dark px-2 py-1 border border-gray-800">
              <span className={`font-bold ${tokenFontClass}`} style={{ color: goldPalette.base }}>
                {player.gems.gold} | {reservedCount}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`bg-space-dark border ${activeBorder} p-2.5 rounded-sm flex flex-col gap-1.5 h-full`}>
        <div className="flex items-stretch gap-2">
          <div className="w-1/1.3 pr-1">
            <div className="border border-gray-700 bg-space-black/40 rounded-sm px-1.5 py-0.5 flex items-center min-w-0 overflow-hidden">
              <div className="min-w-0 w-full">
                {renderOpponentName('text-left')}
              </div>
            </div>
          </div>
          <div className="w-1/2.2 pl-1 flex flex-col text-[10px] font-mono leading-tight text-gray-300 text-right justify-center min-w-0">
            <span className="text-white">{chipLine}</span>
            <span className="text-yellow-400 whitespace-nowrap flex items-center justify-end gap-1"><Star size={10} className="text-yellow-400" /><span>{player.points}</span></span>
          </div>
        </div>
        <div className={`grid grid-cols-3 gap-1 ${tokenFontClass} text-gray-300 font-mono`}>
          {NON_GOLD_GEMS.map(color => {
            const palette = getPalette(color);
            return (
              <div key={color} className="bg-space-black border border-gray-700 py-1 flex items-center justify-center">
                <span className={`font-bold ${tokenFontClass}`} style={{ color: palette.base }}>
                  {player.gems[color]}+{player.bonuses[color]}
                </span>
              </div>
            );
          })}
          <div className="bg-space-black border border-gray-700 py-1 flex items-center justify-center">
            <span className={`font-bold ${tokenFontClass}`} style={{ color: goldPalette.base }}>
              {player.gems.gold}/{reservedCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isMe) {
    const borderClass = isActive ? 'border-green-500' : 'border-gray-700';
    const bannerClass = isActive
      ? 'bg-green-500 text-black border border-green-300 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
      : 'bg-gray-900/80 text-gray-200 border border-gray-700';
    return (
      <div className={`flex flex-col w-full bg-space-black border-2 ${borderClass} p-3 gap-2 transition-colors min-h-[260px]`}>
        <div className={`w-full text-center px-4 font-bold rounded-sm font-header tracking-[0.25em] flex flex-col gap-0.5 ${bannerClass} leading-none`}>
          <span className="text-xs">YOUR TURN</span>
          <span className="text-lg tracking-wide">{player.name}</span>
        </div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col text-sm font-mono leading-tight text-gray-300">
            <span className="text-white">{chipLine}</span>
            <span className="text-yellow-400 flex items-center gap-1"><Star size={12} className="text-yellow-300" />{player.points}</span>
          </div>
          <div
            className={`flex items-center gap-3 min-w-0 flex-1 justify-end ${clickableHeaderClass}`}
            {...headerClickProps}
          >
            <div className="w-10 h-10 bg-blue-900 border-2 border-cyan-400 flex items-center justify-center shadow-neon-blue shrink-0">
              <User size={20} className="text-cyan-200" />
            </div>
          </div>
        </div>
        {/* {renderReservedPeek(3, 'md')} */}
        <div className="flex flex-wrap items-end justify-center gap-3 md:gap-4 mt-auto pb-2">
          {NON_GOLD_GEMS.map(color => {
            const palette = getPalette(color);
            return (
              <div key={color} className="flex flex-col items-center gap-2">
                <div
                  className="w-12 h-16 border-2 flex items-center justify-center relative shadow-lg"
                  style={{
                    backgroundColor: palette.base,
                    borderColor: palette.border,
                    color: palette.text,
                  }}
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-white/20"></div>
                  <span className="text-2xl font-header font-bold drop-shadow-md">{player.bonuses[color]}</span>
                </div>
                <GemToken color={color} count={player.gems[color]} size="md" />
              </div>
            );
          })}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-12 h-16 border-2 flex items-center justify-center font-header font-bold ${tokenFontClass}`}
              style={{
                backgroundColor: goldPalette.base,
                borderColor: goldPalette.border,
                color: goldPalette.text,
              }}
            >
              {player.gems.gold}/{reservedCount}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-space-dark border-2 ${activeBorder} p-2 flex flex-col gap-1 w-full h-full`}>
      <div className="flex justify-between items-center border-b border-gray-800 pb-1 mb-1">
        <div className="flex items-center min-w-0">
          <div className="min-w-0">
            {renderOpponentName('tracking-wide')}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-700/50">
          <Star size={10} className="text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">{player.points}</span>
        </div>
      </div>
      <div className="flex justify-between px-1 gap-1">
        {NON_GOLD_GEMS.map(color => {
          const palette = getPalette(color);
          return (
            <div
              key={color}
              className={`w-5 h-6 border flex items-center justify-center font-bold ${tokenFontClass}`}
              style={{
                backgroundColor: palette.base,
                borderColor: palette.border,
                color: palette.text,
              }}
            >
              {player.gems[color]}+{player.bonuses[color]}
            </div>
          );
        })}
        <div
          className={`w-5 h-6 border flex items-center justify-center font-bold ${tokenFontClass}`}
          style={{
            backgroundColor: goldPalette.base,
            borderColor: goldPalette.border,
            color: goldPalette.text,
          }}
        >
          {player.gems.gold}/{reservedCount}
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
