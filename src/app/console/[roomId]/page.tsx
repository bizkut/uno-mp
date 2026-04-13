'use client';

import { useEffect, useState } from 'react';
import { GameState, Color } from '@/lib/types';
import { getSocket } from '@/lib/socket';

export default function ConsolePage({ params }: { params: { roomId: string } }) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();

    socket.emit('sync-state', { roomId: params.roomId });

    socket.on('state-updated', (newState: GameState) => {
        setState(newState);
        setLoading(false);
    });

    socket.on('re-sync', () => {
        socket.emit('sync-state', { roomId: params.roomId });
    });

    socket.on('error', (msg) => alert(msg));

    return () => {
      socket.off('state-updated');
      socket.off('re-sync');
      socket.off('error');
    };
  }, [params.roomId]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black italic text-4xl animate-pulse">UNO MP</div>;
  if (!state) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Room {params.roomId} not found</div>;

  if (state.status === 'Lobby') {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-12 flex flex-col items-center justify-center border-[20px] border-slate-900">
        <div className="text-8xl font-black italic tracking-tighter text-red-500 mb-4 animate-bounce">UNO MP</div>
        <div className="text-3xl font-bold text-slate-500 mb-16 uppercase tracking-[0.3em]">Multiplayer Console</div>
        
        <div className="bg-slate-900 p-16 rounded-[4rem] border-4 border-slate-800 shadow-2xl flex flex-col items-center text-center">
            <div className="text-xl font-black text-slate-400 mb-4 tracking-widest uppercase">Room Code</div>
            <div className="text-9xl font-black tracking-tighter text-white mb-12">{state.roomId}</div>
            
            <div className="w-full max-w-xl">
                <h3 className="text-2xl font-bold text-slate-500 mb-8 flex items-center justify-center gap-4">
                    <div className="h-px w-12 bg-slate-800"></div>
                    PLAYERS JOINED ({state.players.length})
                    <div className="h-px w-12 bg-slate-800"></div>
                </h3>
                <div className="flex flex-wrap justify-center gap-4">
                    {state.players.map(p => (
                        <div key={p.id} className="px-8 py-4 bg-slate-800 rounded-3xl text-2xl font-black border-2 border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                            {p.name}
                        </div>
                    ))}
                    {state.players.length === 0 && <div className="text-slate-700 text-xl font-medium italic">Waiting for players to join...</div>}
                </div>
            </div>
        </div>
        
        <div className="mt-16 text-slate-600 font-bold flex items-center gap-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            LIVE SESSION ACTIVE
        </div>
      </main>
    );
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-12 flex flex-col border-[20px] transition-colors duration-500"
          style={{ borderColor: state.currentColor === 'Wild' ? '#1e293b' : state.currentColor.toLowerCase() }}>
      
      {/* Top Info */}
      <div className="flex justify-between items-start mb-8">
          <div>
              <div className="text-4xl font-black italic tracking-tighter text-red-500 mb-1">UNO MP</div>
              <div className="text-sm font-black tracking-widest text-slate-500 uppercase">CONSOLE MODE • {state.roomId}</div>
          </div>
          <div className="flex flex-col items-end">
              <div className="text-xl font-black mb-2">DIRECTION</div>
              <div className={`text-4xl transition-all duration-500 ${state.direction === 1 ? 'rotate-0' : 'rotate-180'}`}>
                {state.direction === 1 ? '↻' : '↺'}
              </div>
          </div>
      </div>

      <div className="flex-grow flex items-center justify-center gap-24">
          {/* Players List - Left */}
          <div className="flex flex-col gap-6 w-80">
              {state.players.map((p, idx) => {
                  const isActive = state.currentPlayerIndex === idx;
                  return (
                      <div key={p.id} className={`p-6 rounded-[2rem] border-4 transition-all duration-300 flex items-center justify-between ${isActive ? 'bg-white text-slate-950 border-white scale-110 shadow-2xl' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
                          <div>
                              <div className="text-xs font-black uppercase tracking-widest opacity-50 mb-1">{idx + 1}. PLAYER</div>
                              <div className="text-2xl font-black truncate">{p.name}</div>
                          </div>
                          <div className="text-4xl font-black italic">{p.handCount}</div>
                      </div>
                  )
              })}
          </div>

          {/* Center Table */}
          <div className="relative">
              {/* Glow effect based on current color */}
              <div className="absolute inset-0 blur-[120px] opacity-30 transition-all duration-700 rounded-full"
                   style={{ backgroundColor: state.currentColor.toLowerCase() }} />
              
              <div className="relative z-10 flex flex-col items-center">
                  {/* Current Active Player Announcement */}
                  <div className="mb-12 text-center animate-in fade-in zoom-in">
                      <div className="text-sm font-black tracking-[0.5em] text-slate-500 mb-2 uppercase">CURRENT TURN</div>
                      <div className="text-7xl font-black tracking-tighter">{currentPlayer.name}</div>
                  </div>

                  {/* Discard Pile */}
                  <div className="relative w-80 h-[30rem]">
                    {state.discardPile.slice(-5).map((card, idx) => (
                        <div 
                            key={card.id} 
                            className="absolute inset-0 transition-all duration-700 ease-out"
                            style={{ 
                                transform: `rotate(${(idx - 2) * 8 + (Math.sin(idx) * 5)}deg) translate(${(idx - 2) * 10}px, ${(idx - 2) * 5}px)`,
                                zIndex: idx
                            }}
                        >
                            <img 
                                src={`/cards/${card.filename}`} 
                                alt={card.id}
                                className="w-full h-full object-contain rounded-[2.5rem] shadow-2xl border-4 border-white/5"
                            />
                        </div>
                    ))}
                  </div>

                  {/* Current Color Indicator for Wild */}
                  <div className="mt-12 flex items-center gap-6 bg-slate-900/80 backdrop-blur-xl px-10 py-5 rounded-full border-2 border-slate-800">
                      <div className="text-xl font-black tracking-widest text-slate-400 uppercase">ACTIVE COLOR</div>
                      <div className="w-12 h-12 rounded-full border-4 border-slate-950 shadow-inner"
                           style={{ backgroundColor: state.currentColor.toLowerCase() }} />
                      <div className="text-3xl font-black uppercase" style={{ color: state.currentColor.toLowerCase() }}>{state.currentColor}</div>
                  </div>
              </div>
          </div>
      </div>

      {/* Win Modal */}
      {state.status === 'Finished' && (
          <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[100] animate-in fade-in duration-700">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent animate-pulse" />
              <div className="text-[12rem] mb-8 animate-bounce">👑</div>
              <h2 className="text-2xl font-black tracking-[1em] text-yellow-500 mb-4 opacity-50 uppercase">WE HAVE A WINNER</h2>
              <div className="text-9xl font-black italic tracking-tighter mb-12 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                {state.players.find(p => p.id === state.winnerId)?.name}
              </div>
              <div className="flex gap-8">
                  <div className="px-12 py-6 bg-slate-900 rounded-3xl border-2 border-slate-800 text-2xl font-bold text-slate-500">
                      ROOM {state.roomId} CLOSED
                  </div>
              </div>
          </div>
      )}
    </main>
  );
}
