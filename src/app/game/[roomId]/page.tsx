'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameState, Card, Player, Color } from '@/lib/types';
import { getSocket } from '@/lib/socket';
import { canPlayCard } from '@/lib/game';

export default function GamePage({ params }: { params: { roomId: string } }) {
  const searchParams = useSearchParams();
  const playerId = searchParams.get('playerId');
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const me = useMemo(() => state?.players.find(p => p.id === playerId), [state, playerId]);
  const isMyTurn = useMemo(() => state?.status === 'Playing' && state.players[state.currentPlayerIndex].id === playerId, [state, playerId]);

  useEffect(() => {
    if (!playerId) return;

    const socket = getSocket();

    socket.emit('sync-state', { roomId: params.roomId });

    socket.on('state-updated', (newState: GameState) => {
      setState(newState);
      setLoading(false);
    });

    socket.on('re-sync', () => {
        socket.emit('sync-state', { roomId: params.roomId, playerId });
    });

    socket.on('error', (msg) => alert(msg));

    return () => {
      socket.off('state-updated');
      socket.off('re-sync');
      socket.off('error');
    };
  }, [params.roomId, playerId]);

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit('start-game', { roomId: params.roomId, playerId });
  };

  const handlePlayCard = (cardId: string, chosenColor?: Color) => {
    const card = me?.hand.find(c => c.id === cardId);
    if (!card) return;

    if (card.color === 'Wild' && !chosenColor) {
      setShowColorPicker(cardId);
      return;
    }

    setPlayingCardId(cardId);
    const socket = getSocket();
    socket.emit('play-card', { roomId: params.roomId, playerId, cardId, chosenColor });
    setPlayingCardId(null);
    setShowColorPicker(null);
  };

  const handleDrawCard = () => {
    const socket = getSocket();
    socket.emit('draw-card', { roomId: params.roomId, playerId });
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  if (!state) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Room not found</div>;

  if (state.status === 'Lobby') {
    return (
      <main className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-12">
          <div className="text-2xl font-black italic tracking-tighter text-red-500">UNO MP</div>
          <div className="bg-slate-800 px-4 py-2 rounded-full text-xs font-bold tracking-widest text-slate-400 border border-slate-700 uppercase">
            ROOM: {state.roomId}
          </div>
        </header>

        <div className="w-full max-w-md bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            Players <span className="text-sm bg-slate-700 px-2 py-0.5 rounded-md text-slate-400">{state.players.length}</span>
          </h2>
          <div className="space-y-3 mb-8">
            {state.players.map((p) => (
              <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border ${p.id === playerId ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900 border-slate-700'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.id === playerId ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className="font-bold">{p.name} {p.id === playerId && "(You)"}</span>
                </div>
                {p.isHost && <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">Host</span>}
              </div>
            ))}
          </div>

          {me?.isHost ? (
            <button
              onClick={handleStartGame}
              disabled={state.players.length < 2}
              className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-lg shadow-red-900/40 transition-all active:scale-95"
            >
              START GAME
            </button>
          ) : (
            <div className="text-center text-slate-500 animate-pulse font-medium">Waiting for host to start...</div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col">
      {/* Top Bar - Opponents */}
      <div className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 p-3 flex gap-2 overflow-x-auto">
        {state.players.filter(p => p.id !== playerId).map((p, idx) => {
            const isActive = state.players[state.currentPlayerIndex].id === p.id;
            return (
                <div key={p.id} className={`flex-shrink-0 min-w-[100px] p-2 rounded-xl border transition-all ${isActive ? 'bg-red-500 border-red-400 scale-105 shadow-lg shadow-red-500/20' : 'bg-slate-800/50 border-white/5'}`}>
                    <div className="text-[10px] font-bold uppercase tracking-tighter opacity-70 truncate">{p.name}</div>
                    <div className="text-lg font-black flex items-center justify-between">
                        {p.handCount}
                        <div className="w-3 h-4 bg-white/20 rounded-sm border border-white/10" />
                    </div>
                </div>
            )
        })}
      </div>

      {/* Main Table Area */}
      <div className="flex-grow flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border border-white/10 text-slate-400">
            ROOM: {state.roomId}
        </div>

        <div className={`mb-8 px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest border transition-all ${isMyTurn ? 'bg-red-600 border-red-500 shadow-xl shadow-red-900/40 animate-bounce' : 'bg-slate-800 border-white/5 opacity-50'}`}>
            {isMyTurn ? "IT'S YOUR TURN!" : `${state.players[state.currentPlayerIndex].name}'S TURN`}
        </div>

        <div className="flex items-center gap-8">
            <button 
                onClick={handleDrawCard}
                disabled={!isMyTurn}
                className={`group relative w-24 h-36 bg-slate-800 rounded-xl border-2 transition-all ${isMyTurn ? 'border-blue-500 shadow-2xl shadow-blue-500/20 active:scale-95' : 'border-white/5 opacity-40'}`}
            >
                <div className="absolute inset-2 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden bg-slate-900">
                    <div className="text-3xl font-black italic tracking-tighter text-red-500 opacity-20 -rotate-45">UNO</div>
                </div>
                {isMyTurn && <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-black shadow-lg">DRAW</div>}
            </button>

            <div className="relative w-32 h-48">
                {state.discardPile.slice(-3).map((card, idx) => (
                    <div 
                        key={card.id} 
                        className="absolute inset-0 transition-transform duration-500"
                        style={{ transform: `rotate(${(idx - 1) * 5}deg) translate(${(idx - 1) * 2}px, ${(idx - 1) * 2}px)` }}
                    >
                        <img 
                            src={`/cards/${card.filename}`} 
                            alt={card.id}
                            className="w-full h-full object-contain rounded-xl shadow-2xl border-2 border-white/10"
                        />
                    </div>
                ))}
                
                {state.discardPile.length > 0 && state.discardPile[state.discardPile.length-1].color === 'Wild' && (
                    <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full border-4 border-slate-950 shadow-lg"
                         style={{ backgroundColor: state.currentColor.toLowerCase() }} />
                )}
            </div>
        </div>
      </div>

      {/* Hand Area */}
      <div className={`p-4 pb-10 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 transition-all ${isMyTurn ? 'ring-2 ring-red-500/50' : ''}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Your Hand ({me?.hand.length || 0})</h3>
            {(me?.hand.length || 0) === 2 && (
                <button className="bg-yellow-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full animate-pulse">UNO!</button>
            )}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-4 px-2 -mx-2 snap-x">
          {me?.hand.map((card) => {
            const playable = isMyTurn && canPlayCard(card, state);
            return (
              <button
                key={card.id}
                disabled={!playable || !!playingCardId}
                onClick={() => handlePlayCard(card.id)}
                className={`flex-shrink-0 w-20 h-32 relative transition-all snap-start ${playable ? 'hover:-translate-y-4 active:scale-95' : 'opacity-40 grayscale-[0.5]'} ${playingCardId === card.id ? 'animate-bounce' : ''}`}
              >
                <img 
                  src={`/cards/${card.filename}`} 
                  alt={card.id}
                  className={`w-full h-full object-contain rounded-lg shadow-xl border ${playable ? 'border-white/20' : 'border-transparent'}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {showColorPicker && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <div className="w-full max-w-xs bg-slate-800 rounded-3xl p-8 border border-white/10 text-center">
                <h3 className="text-xl font-black mb-6">PICK A COLOR</h3>
                <div className="grid grid-cols-2 gap-4">
                    {(['Red', 'Blue', 'Green', 'Yellow'] as Color[]).map(color => (
                        <button
                            key={color}
                            onClick={() => handlePlayCard(showColorPicker, color)}
                            className="aspect-square rounded-2xl border-4 border-slate-900 shadow-xl transition-transform active:scale-90"
                            style={{ backgroundColor: color.toLowerCase() }}
                        />
                    ))}
                </div>
            </div>
        </div>
      )}

      {state.status === 'Finished' && (
          <div className="fixed inset-0 bg-red-600/95 flex flex-col items-center justify-center p-6 z-[100] animate-in fade-in zoom-in duration-300">
              <div className="text-8xl mb-4">🏆</div>
              <h2 className="text-5xl font-black italic tracking-tighter mb-2">WINNER!</h2>
              <p className="text-2xl font-bold mb-8">{state.players.find(p => p.id === state.winnerId)?.name}</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="px-8 py-4 bg-white text-red-600 font-black rounded-2xl shadow-2xl active:scale-95 transition-all"
              >
                  BACK TO LOBBY
              </button>
          </div>
      )}
    </main>
  );
}
