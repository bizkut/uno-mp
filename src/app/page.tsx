'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async () => {
    if (!playerName) return alert('Please enter your name');
    setLoading(true);
    try {
      const res = await fetch('/api/room/create', { method: 'POST' });
      const { roomId } = await res.json();
      
      const joinRes = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerName, isHost: true }),
      });
      const { playerId } = await joinRes.json();
      
      router.push(`/game/${roomId}?playerId=${playerId}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName || !roomId) return alert('Please enter your name and room ID');
    setLoading(true);
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomId.toUpperCase(), playerName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      router.push(`/game/${data.roomId}?playerId=${data.playerId}`);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleConsoleMode = () => {
    if (!roomId) return alert('Please enter room ID');
    router.push(`/console/${roomId.toUpperCase()}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white font-sans">
      <div className="w-full max-w-md space-y-8 bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
        <div className="text-center">
          <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-red-500 to-blue-500 mb-2">
            UNO MP
          </h1>
          <p className="text-slate-400 font-medium">Multiplayer Card Game</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Your Nickname</label>
            <input
              type="text"
              placeholder="e.g. Alex"
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder:text-slate-600"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          <div className="pt-4 grid grid-cols-1 gap-3">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full p-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'HOST NEW GAME'}
            </button>
          </div>

          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold">OR JOIN ROOM</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Room Code</label>
              <input
                type="text"
                placeholder="ABCD12"
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 uppercase"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleJoinRoom}
                disabled={loading}
                className="p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                JOIN AS PLAYER
              </button>
              <button
                onClick={handleConsoleMode}
                disabled={loading}
                className="p-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                CONSOLE MODE
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
