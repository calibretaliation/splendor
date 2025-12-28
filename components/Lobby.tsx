import React, { useState, useEffect, useCallback } from 'react';
import { Rocket, Sliders, Users, Radio, User } from 'lucide-react';
import { AIStrategyId } from '../types';

interface LobbyProps {
  onJoin: (players: { name: string, isHuman: boolean, id: string }[], score: number, aiStrategy: AIStrategyId, aiStrategiesBySeat?: AIStrategyId[]) => void;
}

interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [score, setScore] = useState(15);
  const [aiStrategy, setAiStrategy] = useState<AIStrategyId>('balanced');
  const [aiStrategiesBySeat, setAiStrategiesBySeat] = useState<AIStrategyId[]>(['balanced','balanced','balanced','balanced']);
  const [phase, setPhase] = useState<'enter' | 'waiting'>('enter');
  const [myId] = useState(() => 'p-' + Math.random().toString(36).substr(2, 9));
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  // Initialize Broadcast Channel for cross-tab communication
  useEffect(() => {
    const bc = new BroadcastChannel('cosmic_splendor_lobby');
    setChannel(bc);

    bc.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'JOIN') {
        setPlayers(prev => {
          if (prev.find(p => p.id === payload.id)) return prev;
          return [...prev, payload];
        });
        // If I am host, I should announce the full list so they get it
        if (players.length > 0 && players[0].id === myId) {
             bc.postMessage({ type: 'SYNC_LOBBY', payload: { players: [...players, payload] } });
        }
      } else if (type === 'SYNC_LOBBY') {
        setPlayers(payload.players);
      } else if (type === 'START_GAME') {
        onJoin(
          payload.players.map((p: any) => ({ name: p.name, isHuman: true, id: p.id })),
          payload.score,
          payload.aiStrategy as AIStrategyId,
          payload.aiStrategiesBySeat as AIStrategyId[] | undefined
        );
      }
    };

    return () => bc.close();
  }, [onJoin, myId, players]);

  // Enter Waiting Room
  const handleEnterLobby = () => {
    if (!name.trim()) return;
    
    const me = { id: myId, name, isHost: players.length === 0 }; // If first, I am host
    
    // In a real networked app, we'd check server. Here we assume clean slate or listen to broadcast.
    // Since broadcast is async, we'll just add ourselves.
    // If others exist, they will SYNC us. 
    
    setPlayers(prev => {
        const isFirst = prev.length === 0;
        const meWithHost = { ...me, isHost: isFirst };
        
        // Broadcast my existence
        channel?.postMessage({ type: 'JOIN', payload: meWithHost });
        
        return [...prev, meWithHost];
    });
    
    setPhase('waiting');
  };

  const handleStartGame = () => {
    // Notify all tabs
    channel?.postMessage({ 
        type: 'START_GAME', 
        payload: { 
            players: players, 
            score: score,
            aiStrategy,
            aiStrategiesBySeat
        } 
    });
    // Start locally
    onJoin(players.map(p => ({ name: p.name, isHuman: true, id: p.id })), score, aiStrategy, aiStrategiesBySeat);
  };

  if (phase === 'enter') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-3 sm:p-4 relative z-10 w-full overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/space/1920/1080')] opacity-20 bg-cover pointer-events-none"></div>

        <div className="max-w-md w-[96%] bg-space-dark border-3 sm:border-4 border-space-accent p-4 sm:p-5 shadow-neon-blue relative max-h-[92vh] overflow-auto">
          <h1 className="text-[26px] sm:text-3xl text-center mb-3 sm:mb-4 text-cyan-400 uppercase tracking-widest drop-shadow-lg font-bold leading-tight">
            Cosmic Splendor
          </h1>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-space-accent text-xs sm:text-sm mb-2 uppercase font-bold tracking-wider">Explorer ID</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                className="w-full bg-space-black border-2 border-gray-600 p-3 text-base sm:text-lg text-white focus:border-cyan-400 focus:outline-none placeholder-gray-700 font-mono"
                placeholder="ENTER NAME"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-space-accent text-xs sm:text-sm mb-2 uppercase font-bold tracking-wider">
                <span className="flex items-center gap-2"><Sliders size={14}/> Target Score</span>
                <span className="text-white font-mono text-base sm:text-lg">{score}</span>
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

            <div>
              <label className="block text-space-accent text-xs sm:text-sm mb-2 uppercase font-bold tracking-wider">Default AI Strategy</label>
              <select
                value={aiStrategy}
                onChange={(e) => setAiStrategy(e.target.value as AIStrategyId)}
                className="w-full bg-space-black border-2 border-gray-600 p-3 text-base sm:text-lg text-white focus:border-cyan-400 focus:outline-none font-mono"
              >
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
                <option value="defensive">Defensive</option>
                <option value="random">Random</option>
                <option value="gemma">Gemma (LLM)</option>
                <option value="gemini">Gemini (LLM)</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Host can set per-seat overrides below; this is the fallback.</p>
            </div>

            <button
              onClick={handleEnterLobby}
              disabled={!name.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base sm:text-lg py-3 sm:py-3.5 mt-1.5 border-b-4 border-cyan-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest"
            >
              Enter Hangar <Rocket size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isHost = players.find(p => p.id === myId)?.isHost;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-3 sm:p-4 relative z-10 w-full overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/space/1920/1080')] opacity-20 bg-cover pointer-events-none"></div>
      
      <div className="max-w-xl w-full bg-space-dark border-3 sm:border-4 border-space-accent p-4 sm:p-6 shadow-neon-blue relative flex flex-col gap-4">
         <h2 className="text-2xl sm:text-3xl text-center mb-2 sm:mb-3 text-white uppercase tracking-widest flex items-center justify-center gap-3">
            <Radio className="animate-pulse text-green-500"/> Mission Hangar
         </h2>
         <div className="flex-1 bg-space-black border-2 border-gray-700 p-3 sm:p-4 relative overflow-hidden rounded">
             {/* Scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/10 pointer-events-none animate-scan"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => {
                const occupant = players[idx];
                const isOccupied = Boolean(occupant);
                const slotLabel = `P${idx + 1}`;

                if (isOccupied) {
                  return (
                    <div key={occupant.id} className="bg-space-light border border-cyan-700 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
                      <div className="w-10 h-10 bg-cyan-900 flex items-center justify-center border border-cyan-500 text-cyan-300 font-bold text-lg">
                        {slotLabel}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold text-lg leading-none">{occupant.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-1">{occupant.isHost ? 'HOST' : 'CREW MEMBER'}</div>
                      </div>
                      {occupant.id === myId && <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_#00ff00]"></div>}
                    </div>
                  );
                }

                const strategyValue = aiStrategiesBySeat[idx] || aiStrategy;

                return (
                  <div key={`empty-${idx}`} className="border border-dashed border-gray-700 p-3 flex flex-col gap-2 opacity-90 bg-space-black/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-900 flex items-center justify-center border border-gray-700 text-gray-500">
                        {slotLabel}
                      </div>
                      <div className="text-gray-400 font-mono">Empty - will spawn AI</div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase text-space-accent font-bold">AI Strategy</label>
                      <select
                        value={strategyValue}
                        onChange={(e) => setAiStrategiesBySeat(prev => {
                          const next = [...prev];
                          next[idx] = e.target.value as AIStrategyId;
                          return next;
                        })}
                        className="w-full bg-space-black border-2 border-gray-700 p-2 text-sm text-white font-mono"
                      >
                        <option value="balanced">Balanced</option>
                        <option value="aggressive">Aggressive</option>
                        <option value="defensive">Defensive</option>
                        <option value="random">Random</option>
                        <option value="gemma">Gemma (LLM)</option>
                        <option value="gemini">Gemini (LLM)</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
         </div>

             <div className="flex flex-col items-center gap-3">
             {isHost ? (
                 <div className="w-full">
                     <button 
                    onClick={handleStartGame}
                    className="w-full bg-green-600 hover:bg-green-500 text-white text-xl sm:text-2xl py-3 sm:py-4 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                    >
                        LAUNCH MISSION <Rocket size={28} />
                    </button>
                    <p className="text-center text-gray-400 text-sm mt-3 font-mono">
                        Empty slots will be filled by AI Drones.
                    </p>
                 </div>
             ) : (
                 <div className="text-center p-4 w-full bg-space-black border border-yellow-700/50">
                   <p className="text-yellow-500 font-mono text-base sm:text-lg animate-pulse">WAITING FOR HOST TO LAUNCH...</p>
                 </div>
             )}
         </div>
         
         <div className="absolute top-2 right-2 text-[10px] sm:text-xs text-gray-600 font-mono">
             LOBBY-ID: {players.length > 0 ? 'ALPHA' : '---'}
         </div>
      </div>
    </div>
  );
};

export default Lobby;