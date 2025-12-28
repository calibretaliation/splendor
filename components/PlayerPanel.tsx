import React from 'react';
import { Player, GemColor } from '../types';
import GemToken from './GemToken';
import { Shield, User, Cpu } from 'lucide-react';
import { GEM_DISPLAY_COLORS } from '../constants';

interface PlayerPanelProps {
  player: Player;
  isMe: boolean;
  isActive: boolean;
  density?: 'normal' | 'compact';
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({ player, isMe, isActive, density = 'normal' }) => {
  const allColors = [GemColor.White, GemColor.Blue, GemColor.Green, GemColor.Red, GemColor.Black];
  const gemColor = (color: GemColor) => GEM_DISPLAY_COLORS[color];
  const goldColor = GEM_DISPLAY_COLORS[GemColor.Gold];

  if (density === 'compact') {
    if (isMe) {
      return (
        <div className={`relative flex flex-col gap-1.5 bg-space-black border ${isActive ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'border-gray-700'} p-2 rounded-sm h-full`}> 
          {isActive && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-green-500 text-black px-3 font-bold text-[11px] py-0.5 rounded-t-sm font-header tracking-wider">
              YOUR TURN
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-900 border border-cyan-400 flex items-center justify-center">
                <User size={16} className="text-cyan-200" />
              </div>
              <div className="leading-tight">
                <div className="text-cyan-400 font-bold text-base font-header">{player.name}</div>
                <div className="text-xs text-gray-400 font-mono">PTS {player.points}</div>
              </div>
            </div>
            <div className="flex gap-1">
              {player.reservedCards.slice(0, 2).map((card, i) => (
                <div key={i} className="w-5 h-7 bg-yellow-900/50 border border-yellow-500 flex items-center justify-center text-[9px] text-yellow-400 font-bold">
                  {card.level}
                </div>
              ))}
              {Array(Math.max(0, 2 - player.reservedCards.length)).fill(0).map((_, i) => (
                <div key={`slot-${i}`} className="w-5 h-7 border border-dashed border-gray-700"></div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-300 font-mono">
            {allColors.map(c => (
              <div key={c} className="flex items-center justify-between bg-space-dark px-2 py-1 border border-gray-800">
                <span className="uppercase" style={{ color: gemColor(c).base }}>{c.charAt(0)}</span>
                <span className="font-bold" style={{ color: gemColor(c).base }}>
                  {player.gems[c]} | {player.bonuses[c]}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-space-dark px-2 py-1 border border-gray-800">
              <span className="uppercase" style={{ color: goldColor.base }}>Au</span>
              <span className="font-bold" style={{ color: goldColor.base }}>
                {player.gems.gold}
              </span>
            </div>
          </div>
        </div>
      );
    }

    const compactBorder = isActive ? 'border-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'border-gray-700';
    return (
      <div className={`bg-space-dark border ${compactBorder} p-2 rounded-sm flex flex-col gap-1 h-full`}> 
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 overflow-hidden">
            <div className="w-5 h-5 bg-purple-900 flex items-center justify-center border border-purple-500">
              {player.isHuman ? <User size={12} className="text-purple-200" /> : <Cpu size={12} className="text-purple-300" />}
            </div>
            <span className="text-[11px] font-bold truncate text-gray-200 font-header tracking-wide">{player.name}</span>
          </div>
          <div className="flex items-center gap-1 bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-700/50 text-[11px] text-yellow-400 font-bold">
            <Shield size={10} className="text-yellow-400" />
            {player.points}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-300 font-mono">
          {allColors.map(c => (
            <div key={c} className="flex flex-col items-center justify-center bg-space-black border border-gray-700 py-1">
              <span className="font-bold" style={{ color: gemColor(c).base }}>{player.gems[c]}</span>
              <span className="text-[9px]" style={{ color: gemColor(c).base }}>+{player.bonuses[c]}</span>
            </div>
          ))}
          <div className="flex flex-col items-center justify-center bg-space-black border border-gray-700 py-1">
            <span className="font-bold" style={{ color: goldColor.base }}>{player.gems.gold}</span>
            <span className="text-[9px] text-orange-400">RS {player.reservedCards.length}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isMe) {
    // Detailed Self View (Bottom)
    return (
      <div className={`flex flex-col w-full h-full bg-space-black border-t-4 ${isActive ? 'border-green-500' : 'border-gray-700'} p-3 relative transition-colors`}>
         {isActive && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-black px-4 font-bold text-sm py-0.5 rounded-t-md animate-pulse font-header tracking-wider">YOUR TURN</div>}
         
         {/* Player Header */}
         <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900 border-2 border-cyan-400 flex items-center justify-center shadow-neon-blue">
                    <User size={20} className="text-cyan-200" />
                </div>
                <div>
                    <div className="text-cyan-400 font-bold leading-none text-xl font-header">{player.name}</div>
                    <div className="text-sm text-gray-400 font-mono mt-0.5">SIGNAL STR: <span className="text-white font-bold">{player.points}</span></div>
                </div>
            </div>
            
            {/* My Reserved Cards Peek */}
            <div className="flex gap-2">
                {player.reservedCards.map((card, i) => (
                    <div key={i} className="w-8 h-10 bg-yellow-900/50 border border-yellow-500 flex items-center justify-center relative" title="Reserved Module">
                        <span className="text-xs text-yellow-500 font-bold">{card.level}</span>
                    </div>
                ))}
                {Array(3 - player.reservedCards.length).fill(0).map((_, i) => (
                     <div key={`e-${i}`} className="w-8 h-10 border border-dashed border-gray-700 bg-black/50"></div>
                ))}
            </div>
         </div>

         {/* Resources Grid - Aligned Vertically */}
         <div className="flex items-end justify-center gap-2 md:gap-4 mt-auto pb-1">
            {allColors.map(c => (
                 <div key={c} className="flex flex-col items-center gap-2">
                    {/* Bonus Card Representation */}
                    <div
                      className="w-10 h-14 md:w-12 md:h-16 border-2 flex items-center justify-center relative shadow-lg"
                      style={{
                        backgroundColor: gemColor(c).base,
                        borderColor: gemColor(c).border,
                        color: gemColor(c).text,
                      }}
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-white/20"></div>
                        <span className="text-2xl font-header font-bold drop-shadow-md">{player.bonuses[c]}</span>
                    </div>
                    
                    {/* Gem Token */}
                    <GemToken color={c} count={player.gems[c]} size="md" />
                 </div>
            ))}
            
            {/* Gold / Reserved Column */}
            <div className="flex flex-col items-center gap-2">
                 {/* Placeholder to align with bonuses */}
                 <div className="w-10 h-14 md:w-12 md:h-16 border-2 border-transparent flex items-center justify-center opacity-30">
                    {/* Optional: Show reserved count here as a ghost card? */}
                 </div>
                 <GemToken color={GemColor.Gold} count={player.gems.gold} size="md" />
            </div>
         </div>
      </div>
    );
  }

  // Opponent View
  return (
    <div className={`bg-space-dark border-2 ${isActive ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'border-gray-700'} p-2 flex flex-col gap-1 w-full h-full overflow-hidden`}>
       <div className="flex justify-between items-center border-b border-gray-800 pb-1 mb-1">
          <div className="flex items-center gap-2 overflow-hidden">
             <div className="w-5 h-5 bg-purple-900 flex items-center justify-center shrink-0 border border-purple-500">
                {player.isHuman ? <User size={12} className="text-purple-200"/> : <Cpu size={12} className="text-purple-300"/>}
             </div>
             <span className="text-xs font-bold truncate text-gray-200 font-header tracking-wide">{player.name}</span>
          </div>
          <div className="flex items-center gap-1 bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-700/50">
             <Shield size={10} className="text-yellow-500"/>
             <span className="text-xs font-bold text-yellow-500">{player.points}</span>
          </div>
       </div>

       {/* Opponent Resources - Aligned Columns */}
       <div className="flex justify-between px-1">
          {allColors.map(c => (
              <div key={c} className="flex flex-col items-center gap-1">
                  {/* Gem */}
                     <div
                       className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shadow-sm"
                       style={{
                         backgroundColor: gemColor(c).base,
                         borderColor: gemColor(c).border,
                         color: gemColor(c).text,
                       }}
                     >
                         {player.gems[c]}
                     </div>
                  
                  {/* Bonus */}
                     <div
                       className="w-5 h-6 border flex items-center justify-center text-[10px] font-bold shadow-sm"
                       style={{
                         backgroundColor: gemColor(c).base,
                         borderColor: gemColor(c).border,
                         color: gemColor(c).text,
                       }}
                     >
                         {player.bonuses[c]}
                     </div>
              </div>
          ))}
          
          {/* Gold / Reserved */}
          <div className="flex flex-col items-center gap-1">
                 <div
                   className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shadow-sm"
                   style={{
                     backgroundColor: goldColor.base,
                     borderColor: goldColor.border,
                     color: goldColor.text,
                   }}
                 >
                   {player.gems.gold}
                 </div>
              <div className="w-5 h-6 flex items-center justify-center text-[9px] text-yellow-500 font-mono">
                  {player.reservedCards.length > 0 ? `${player.reservedCards.length}R` : ''}
              </div>
          </div>
       </div>
    </div>
  );
};

export default PlayerPanel;