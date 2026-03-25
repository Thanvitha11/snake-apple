import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Terminal, Disc3 } from 'lucide-react';

const GRID_SIZE = 20;
const GAME_SPEED = 100;

const TRACKS = [
  { id: 1, title: "Neon Synthesis", artist: "AI Alpha", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", cover: "https://picsum.photos/seed/neon1/200/200" },
  { id: 2, title: "Cybernetic Groove", artist: "AI Beta", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", cover: "https://picsum.photos/seed/neon2/200/200" },
  { id: 3, title: "Digital Horizon", artist: "AI Gamma", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", cover: "https://picsum.photos/seed/neon3/200/200" }
];

type GameStatus = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export default function App() {
  const [uiState, setUiState] = useState({ score: 0, highScore: 0, status: 'START' as GameStatus });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const state = useRef({
    snake: [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}],
    dir: {x: 0, y: -1},
    nextDir: {x: 0, y: -1},
    food: {x: 5, y: 5},
    status: 'START' as GameStatus,
    score: 0,
    highScore: 0,
    lastMove: 0,
    particles: [] as {x: number, y: number, vx: number, vy: number, life: number, color: string}[],
    shake: 0
  });

  const syncUI = useCallback(() => {
    setUiState({ score: state.current.score, highScore: state.current.highScore, status: state.current.status });
  }, []);

  const spawnFood = () => {
    let newFood;
    while (true) {
      newFood = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      if (!state.current.snake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
    }
    state.current.food = newFood;
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      state.current.particles.push({
        x: x + 0.5, y: y + 0.5,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        life: 1, color
      });
    }
  };

  const resetGame = () => {
    state.current.snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
    state.current.dir = {x: 0, y: -1};
    state.current.nextDir = {x: 0, y: -1};
    state.current.score = 0;
    state.current.status = 'PLAYING';
    state.current.particles = [];
    state.current.shake = 0;
    spawnFood();
    syncUI();
  };

  const gameOver = () => {
    state.current.status = 'GAMEOVER';
    state.current.shake = 20;
    if (state.current.score > state.current.highScore) state.current.highScore = state.current.score;
    syncUI();
  };

  const update = (time: number) => {
    const s = state.current;
    if (s.status === 'PLAYING') {
      if (time - s.lastMove > GAME_SPEED) {
        s.lastMove = time;
        s.dir = s.nextDir;
        const head = s.snake[0];
        const newHead = { x: head.x + s.dir.x, y: head.y + s.dir.y };

        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          gameOver();
        } else if (s.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          gameOver();
        } else {
          s.snake.unshift(newHead);
          if (newHead.x === s.food.x && newHead.y === s.food.y) {
            s.score += 10;
            spawnFood();
            spawnParticles(s.food.x, s.food.y, '#ff00ff');
            syncUI();
          } else {
            s.snake.pop();
          }
        }
      }
    }
    s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; });
    s.particles = s.particles.filter(p => p.life > 0);
    if (s.shake > 0) s.shake--;
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const s = state.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const cellSize = width / GRID_SIZE;

    ctx.save();
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    if (s.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for(let i=0; i<=GRID_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i*cellSize, 0); ctx.lineTo(i*cellSize, height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*cellSize); ctx.lineTo(width, i*cellSize); ctx.stroke();
    }

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(s.food.x * cellSize + cellSize/2, s.food.y * cellSize + cellSize/2, cellSize/2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f3ff';
    s.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#ffffff' : '#00f3ff';
      ctx.fillRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2);
    });

    ctx.shadowBlur = 8;
    s.particles.forEach(p => {
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x * cellSize, p.y * cellSize, (cellSize/4) * p.life, 0, Math.PI*2);
      ctx.fill();
    });

    ctx.restore();
  };

  const loop = (time: number) => {
    update(time);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      const s = state.current;

      if (e.key === ' ') {
        if (s.status === 'START' || s.status === 'GAMEOVER') resetGame();
        else if (s.status === 'PLAYING') { s.status = 'PAUSED'; syncUI(); }
        else if (s.status === 'PAUSED') { s.status = 'PLAYING'; syncUI(); }
        return;
      }
      if (s.status !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowUp': case 'w': if (s.dir.y === 0) s.nextDir = {x: 0, y: -1}; break;
        case 'ArrowDown': case 's': if (s.dir.y === 0) s.nextDir = {x: 0, y: 1}; break;
        case 'ArrowLeft': case 'a': if (s.dir.x === 0) s.nextDir = {x: -1, y: 0}; break;
        case 'ArrowRight': case 'd': if (s.dir.x === 0) s.nextDir = {x: 1, y: 0}; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [syncUI]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(console.error);
      setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = () => { setCurrentTrackIndex(p => (p + 1) % TRACKS.length); setIsPlaying(true); };
  const prevTrack = () => { setCurrentTrackIndex(p => (p - 1 + TRACKS.length) % TRACKS.length); setIsPlaying(true); };

  useEffect(() => {
    if (isPlaying && audioRef.current) audioRef.current.play().catch(console.error);
  }, [currentTrackIndex]);

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col font-sans selection:bg-[#00f3ff] selection:text-black p-4 md:p-8">
      <header className="mb-8 text-center md:text-left max-w-6xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter neon-text-cyan uppercase flex items-center gap-3">
            <Terminal className="text-[#00f3ff]" size={32} /> Neon Snake
          </h1>
          <p className="text-gray-400 font-mono text-xs tracking-[0.2em] uppercase mt-1">Sys.Ver. 2.0 // Canvas Engine</p>
        </div>
        <div className="flex gap-6 font-mono text-sm">
          <div className="flex flex-col items-end">
            <span className="text-gray-500 uppercase text-xs">Score</span>
            <span className="neon-text-cyan text-xl font-bold">{uiState.score}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-gray-500 uppercase text-xs">High Score</span>
            <span className="neon-text-magenta text-xl font-bold">{uiState.highScore}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row gap-8 max-w-6xl mx-auto w-full items-start justify-center">
        <div className="w-full xl:w-2/3 flex flex-col items-center">
          <div className="arcade-cabinet scanlines rounded-xl overflow-hidden relative w-full max-w-[600px] aspect-square">
            <canvas ref={canvasRef} width={600} height={600} className="w-full h-full object-contain block" />
            {uiState.status !== 'PLAYING' && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                {uiState.status === 'START' && (
                  <div className="text-center animate-pulse">
                    <p className="text-3xl font-bold neon-text-cyan mb-4 tracking-widest">INSERT COIN</p>
                    <p className="text-sm font-mono text-[#00f3ff]">Press SPACE to start</p>
                  </div>
                )}
                {uiState.status === 'GAMEOVER' && (
                  <div className="text-center">
                    <p className="text-5xl font-bold neon-text-magenta mb-2 tracking-widest">SYSTEM FAILURE</p>
                    <p className="text-xl font-mono text-gray-300 mb-8">Final Score: {uiState.score}</p>
                    <p className="text-sm font-mono text-[#00f3ff] animate-pulse">Press SPACE to reboot</p>
                  </div>
                )}
                {uiState.status === 'PAUSED' && (
                  <div className="text-center animate-pulse">
                    <p className="text-4xl font-bold neon-text-cyan mb-4 tracking-widest">PAUSED</p>
                    <p className="text-sm font-mono text-[#00f3ff]">Press SPACE to resume</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 text-gray-500 font-mono text-xs flex gap-6 uppercase tracking-wider">
            <span>[W/A/S/D] Move</span>
            <span>[SPACE] Action</span>
          </div>
        </div>

        <div className="w-full xl:w-1/3 max-w-[400px] mx-auto xl:mx-0 flex flex-col gap-6">
          <div className="jukebox-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-6 border-b border-[#330033] pb-4">
              <Disc3 className="text-[#ff00ff] animate-spin-slow" size={20} />
              <h2 className="font-mono text-sm tracking-widest text-gray-300 uppercase">Audio Subsystem</h2>
            </div>
            
            <div className="flex gap-4 items-center mb-6">
              <div className="w-24 h-24 rounded-lg overflow-hidden neon-border-magenta flex-shrink-0 relative">
                <img src={currentTrack.cover} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {isPlaying && <div className="absolute inset-0 bg-[#ff00ff]/20 mix-blend-overlay" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold neon-text-magenta truncate">{currentTrack.title}</h3>
                <p className="text-gray-400 font-mono text-xs mt-1 truncate">{currentTrack.artist}</p>
                <div className="flex gap-1 h-4 items-end mt-3 opacity-80">
                  <div className={`w-1.5 bg-[#ff00ff] ${isPlaying ? 'animate-eq' : 'h-1'}`} />
                  <div className={`w-1.5 bg-[#ff00ff] ${isPlaying ? 'animate-eq-delay-1' : 'h-1'}`} />
                  <div className={`w-1.5 bg-[#ff00ff] ${isPlaying ? 'animate-eq-delay-2' : 'h-1'}`} />
                  <div className={`w-1.5 bg-[#ff00ff] ${isPlaying ? 'animate-eq' : 'h-1'}`} />
                </div>
              </div>
            </div>

            <div className="w-full mb-6">
              <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full neon-bg-magenta transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <button onClick={prevTrack} className="text-gray-500 hover:text-[#ff00ff] transition-colors cursor-pointer"><SkipBack size={20} /></button>
              <button onClick={togglePlay} className="w-12 h-12 flex items-center justify-center rounded-full neon-border-magenta text-[#ff00ff] hover:bg-[#ff00ff]/10 transition-all cursor-pointer">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={nextTrack} className="text-gray-500 hover:text-[#ff00ff] transition-colors cursor-pointer"><SkipForward size={20} /></button>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button onClick={() => setVolume(v => v === 0 ? 0.5 : 0)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input 
                type="range" min="0" max="1" step="0.01" value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-[#ff00ff]"
              />
            </div>

            <audio ref={audioRef} src={currentTrack.url} onTimeUpdate={() => {
              if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
            }} onEnded={nextTrack} />
          </div>

          <div className="border border-[#111] rounded-xl p-4 bg-black/50">
            <div className="flex flex-col gap-1">
              {TRACKS.map((track, index) => (
                <button
                  key={track.id}
                  onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }}
                  className={`flex items-center gap-3 p-2 rounded transition-colors text-left cursor-pointer font-mono text-xs ${
                    currentTrackIndex === index ? 'bg-[#ff00ff]/10 text-[#ff00ff]' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className="opacity-50 w-4">{index + 1}.</span>
                  <span className="flex-1 truncate">{track.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
