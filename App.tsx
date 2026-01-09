import React, { useState, useEffect, useRef, useMemo } from 'react';
import { shuffleArray } from './utils/lottery';
import { SettingsModal } from './components/SettingsModal';

// --- 0. 注入全局动画样式 (解决Tailwind默认没有摆动动画的问题) ---
const GlobalStyles = () => (
  <style>{`
    @keyframes swing {
      0% { transform: rotate(-5deg); }
      100% { transform: rotate(5deg); }
    }
    .animate-swing {
      animation: swing 3s infinite ease-in-out alternate;
      transform-origin: top center;
    }
  `}</style>
);

// --- 1. 灯笼组件 (纯CSS/SVG绘制，精致设计感) ---
const Lantern = ({ className, delay = '0s' }: { className?: string, delay?: string }) => (
  <div className={`absolute top-0 z-20 ${className}`} style={{ pointerEvents: 'none' }}>
    {/* 提绳 */}
    <div className="h-12 w-[2px] bg-[#DAA520] mx-auto"></div>
    {/* 灯笼主体容器 (摆动) */}
    <div className="animate-swing" style={{ animationDelay: delay }}>
      {/* 灯笼壳 */}
      <div className="w-24 h-20 bg-gradient-to-b from-[#D00000] to-[#8B0000] rounded-[2rem] relative shadow-lg flex items-center justify-center border-2 border-[#FFD700]">
        {/* 金色骨架线 */}
        <div className="absolute w-[1px] h-full bg-[#FFD700]/30 left-1/2 -translate-x-1/2"></div>
        <div className="absolute w-full h-[1px] bg-[#FFD700]/30 top-1/2 -translate-y-1/2"></div>
        {/* 福字 */}
        <div className="w-12 h-12 bg-[#DAA520] rounded-full flex items-center justify-center shadow-inner">
           <span className="text-[#8B0000] font-shufa font-bold text-2xl pt-1">福</span>
        </div>
      </div>
      {/* 底部流苏 */}
      <div className="flex justify-center -mt-1">
         <div className="w-4 h-2 bg-[#DAA520] rounded-b-md"></div>
      </div>
      <div className="flex justify-center space-x-1">
         <div className="w-[2px] h-12 bg-[#D00000]/80"></div>
         <div className="w-[2px] h-14 bg-[#D00000]"></div>
         <div className="w-[2px] h-12 bg-[#D00000]/80"></div>
      </div>
    </div>
  </div>
);

// --- 音效管理 (保持不变) ---
const audioManager = (() => {
  let ctx: AudioContext | null = null;
  let isBgmMuted = true;
  let customBuffer: AudioBuffer | null = null;
  let currentSource: AudioBufferSourceNode | null = null;
  let gainNode: GainNode | null = null;

  const init = async () => {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.4;
      gainNode.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') await ctx.resume();
  };

  return {
    toggleBgm: async () => { 
      await init();
      isBgmMuted = !isBgmMuted; 
      if (!isBgmMuted && customBuffer) {
        audioManager.startCustom();
      } else if (isBgmMuted && currentSource) {
        try { currentSource.stop(); } catch(e){} 
        currentSource = null;
      }
      return isBgmMuted; 
    },
    setCustomFile: async (file: File) => {
      await init();
      const arrayBuffer = await file.arrayBuffer();
      customBuffer = await ctx!.decodeAudioData(arrayBuffer);
      if (!isBgmMuted) audioManager.startCustom();
    },
    startCustom: () => {
      if (!ctx || !customBuffer || isBgmMuted) return;
      if (currentSource) try { currentSource.stop(); } catch(e) {}
      currentSource = ctx.createBufferSource();
      currentSource.buffer = customBuffer;
      currentSource.loop = true;
      currentSource.connect(gainNode!);
      currentSource.start();
    },
    playTick: (f = 400) => {
      if(!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      g.gain.setValueAtTime(0.04, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(g).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    },
    playWin: () => {
      if(!ctx) return;
      const now = ctx.currentTime;
      [440, 554, 659, 880].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(f, now + i * 0.15);
        g.gain.setValueAtTime(0.08, now + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 2);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 2);
      });
    }
  };
})();

// --- 奖项配置 ---
const PRIZE_MAP = {
  '3rd': { 
    label: '三等奖', 
    count: 45, 
    titleSize: 'text-[5vh]', 
    nameSize: 'text-[1.8vh]', 
    py: 'py-[0.8vh]',
    gap: 'gap-3'
  },
  '2nd': { 
    label: '二等奖', 
    count: 35, 
    titleSize: 'text-[6vh]', 
    nameSize: 'text-[2.2vh]', 
    py: 'py-[1.2vh]', 
    gap: 'gap-4'
  },
  '1st': { 
    label: '一等奖', 
    count: 25, 
    titleSize: 'text-[7vh]', 
    nameSize: 'text-[2.8vh]', 
    py: 'py-[2vh]', 
    gap: 'gap-5'
  }
};

const App: React.FC = () => {
  const [allNames, setAllNames] = useState<string[]>(() => JSON.parse(localStorage.getItem('lottery_names') || '[]'));
  const [pool, setPool] = useState<string[]>(() => JSON.parse(localStorage.getItem('lottery_pool') || '[]'));
  const [winners, setWinners] = useState<Record<string, string[]>>(() => JSON.parse(localStorage.getItem('lottery_winners') || '{"1st":[],"2nd":[],"3rd":[]}'));

  const [currentLevel, setCurrentLevel] = useState<string>('3rd');
  const [isDrawing, setIsDrawing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<string[] | null>(null);
  const [isBgmMuted, setIsBgmMuted] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rotation = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0.0006, y: 0.001 });
  const targetVelocity = useRef({ x: 0.0006, y: 0.001 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const spherePoints = useMemo(() => {
    let displayPool = [...pool];
    if (displayPool.length > 0 && displayPool.length < 100) {
       while(displayPool.length < 150) displayPool = [...displayPool, ...pool];
    }
    const count = displayPool.length;
    
    // 半径系数 0.30，防止溢出
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.30; 
    
    const res = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); 

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2; 
      const r = Math.sqrt(1 - y * y);      
      const theta = phi * i;               

      res.push({
        x: Math.cos(theta) * r * radius,
        y: y * radius,
        z: Math.sin(theta) * r * radius,
        name: displayPool[i] || '🏮'
      });
    }
    return res;
  }, [pool]);

  useEffect(() => {
    let frameId: number;
    const animate = () => {
      velocity.current.x += (targetVelocity.current.x - velocity.current.x) * 0.05;
      velocity.current.y += (targetVelocity.current.y - velocity.current.y) * 0.05;
      
      rotation.current.x += velocity.current.x;
      rotation.current.y += velocity.current.y;
      
      if (containerRef.current) {
        const els = containerRef.current.children;
        const { x: rx, y: ry } = rotation.current;
        const cosX = Math.cos(rx); const sinX = Math.sin(rx);
        const cosY = Math.cos(ry); const sinY = Math.sin(ry);

        const radius = Math.min(window.innerWidth, window.innerHeight) * 0.30;

        for (let i = 0; i < els.length; i++) {
          const pt = spherePoints[i];
          if (!pt) continue;

          let x1 = pt.x * cosY - pt.z * sinY;
          let z1 = pt.x * sinY + pt.z * cosY;
          let y1 = pt.y * cosX - z1 * sinX;
          let z2 = pt.y * sinX + z1 * cosX;
          
          const perspective = 1000;
          const scale = (perspective) / (perspective - z2); 
          
          const el = els[i] as HTMLElement;
          el.style.transform = `translate3d(${x1}px, ${y1}px, ${z2}px) scale(${scale})`;
          
          const opacity = (z2 + radius) / (2 * radius); 
          el.style.opacity = Math.max(0.1, opacity + 0.1).toString();
          el.style.zIndex = Math.round(z2 + 1000).toString();
          
          el.style.color = isDrawing ? (Math.random() > 0.7 ? '#fff' : '#FFD700') : '#FFD700';
        }
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [spherePoints, isDrawing]);

  const startDraw = () => {
    if (winners[currentLevel].length > 0) return alert('该奖项已公示，请清除记录或选择其他奖项');
    if (pool.length < PRIZE_MAP[currentLevel as keyof typeof PRIZE_MAP].count) return alert('抽奖池剩余人数不足');
    
    setIsDrawing(true);
    setCountdown(5); 
    targetVelocity.current = { x: 0.15, y: 0.15 }; 

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          finalizeDraw();
          return null;
        }
        audioManager.playTick(200 + prev * 100);
        return prev - 1;
      });
    }, 1000);
    audioManager.playTick(1000);
  };

  const finalizeDraw = () => {
    const config = PRIZE_MAP[currentLevel as keyof typeof PRIZE_MAP];
    const shuffled = shuffleArray([...pool]);
    const selected = shuffled.slice(0, config.count);
    const remaining = shuffled.slice(config.count);

    targetVelocity.current = { x: 0.0006, y: 0.001 };
    
    setWinners(prev => ({ ...prev, [currentLevel]: selected }));
    setPool(remaining);
    setShowResult(selected);
    setIsDrawing(false);
    audioManager.playWin();

    localStorage.setItem('lottery_winners', JSON.stringify({ ...winners, [currentLevel]: selected }));
    localStorage.setItem('lottery_pool', JSON.stringify(remaining));
  };

  const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await audioManager.setCustomFile(file);
      setIsBgmMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col relative overflow-hidden font-sans bg-[#2d0000]">
      <GlobalStyles />

      {/* --- 灯笼层 (氛围拉满) --- */}
      <div className="absolute inset-x-0 top-0 pointer-events-none select-none z-20">
         {/* 左侧灯笼组 */}
         <Lantern className="left-10" delay="0s" />
         <Lantern className="left-40 scale-75 -mt-2" delay="1s" />
         
         {/* 右侧灯笼组 */}
         <Lantern className="right-10" delay="0.5s" />
         <Lantern className="right-40 scale-75 -mt-2" delay="1.5s" />
      </div>

      {/* 顶部标题区 */}
      <header className="h-[20vh] flex flex-col items-center justify-center relative z-30 px-6 select-none shrink-0">
        <h1 className="text-[9vh] font-shufa tracking-[0.1em] bg-gradient-to-b from-[#FFFACD] via-[#FFD700] to-[#DAA520] bg-clip-text text-transparent drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] leading-none mt-4">
          筑梦新春·策马迎福
        </h1>
        <p className="mt-4 text-[3.2vh] font-bold text-[#FFD700] tracking-[0.4em] font-serif opacity-90 drop-shadow-md">
          设计与建筑学院 · 二〇二六新春联欢会
        </p>
      </header>

      {/* 主舞台 */}
      <main className="flex-1 flex px-10 pb-8 gap-8 overflow-hidden relative z-10 min-h-0">
        
        {/* 左侧：3D球体 */}
        <div className="flex-[3] relative flex items-center justify-center">
          <div className="w-full h-full relative p-4" style={{ perspective: '1000px' }}>
            <div ref={containerRef} className="absolute inset-0 flex items-center justify-center transform-style-3d">
              {spherePoints.map((pt, i) => (
                <div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-lg whitespace-nowrap will-change-transform">
                  {pt.name}
                </div>
              ))}
            </div>
          </div>

          {/* 倒计时 & 加载中文案 */}
          {countdown !== null && (
            <div key={countdown} className="absolute inset-0 flex flex-col items-center justify-center z-[60] pointer-events-none bg-black/40 backdrop-blur-sm rounded-3xl">
              <span className="text-[15rem] font-serif text-[#FFD700] font-black animate-bounce drop-shadow-[0_0_50px_rgba(255,215,0,0.8)] leading-none">
                {countdown}
              </span>
              <span className="text-6xl font-shufa mt-8 text-white tracking-widest animate-pulse drop-shadow-xl">
                好运加载中...
              </span>
            </div>
          )}

          {/* 奖项选择器 */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50">
            {Object.entries(PRIZE_MAP).reverse().map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => !isDrawing && setCurrentLevel(key)}
                className={`w-24 h-24 rounded-full border-2 transition-all duration-300 flex items-center justify-center font-shufa shadow-lg ${
                  currentLevel === key 
                    ? 'bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#8B0000] border-white scale-110 shadow-[0_0_30px_rgba(255,215,0,0.6)]' 
                    : 'bg-black/30 border-[#FFD700]/30 text-[#FFD700]/50 hover:text-[#FFD700] hover:border-[#FFD700]'
                }`}
              >
                <span className="text-2xl font-bold tracking-widest writing-vertical-rl">
                  {cfg.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：实时榜单 (改为3列，大字体) */}
        <div className="flex-[1.2] flex flex-col bg-white/5 border border-[#FFD700]/20 rounded-[3rem] p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700] blur-[100px] opacity-20 pointer-events-none"></div>

          <div className="text-center mb-4 shrink-0">
            <h2 className="text-3xl font-shufa text-[#FFD700] tracking-widest border-b border-[#FFD700]/20 pb-4 inline-block px-8">
              {PRIZE_MAP[currentLevel as keyof typeof PRIZE_MAP].label}
            </h2>
            <p className="text-white/40 text-sm mt-2">待抽人数: {pool.length}</p>
          </div>
          
          {/* 【修改点2：3列布局 + 字号加大】 */}
          <div className="flex-1 overflow-hidden relative">
             {winners[currentLevel].length > 0 ? (
                <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
                   {/* grid-cols-3, gap-2, text-lg(大字) */}
                   <div className="grid grid-cols-3 gap-3 content-start">
                     {winners[currentLevel].map((name, i) => (
                       <div key={i} className="bg-[#FFD700]/10 text-[#FFD700] py-2 rounded-lg text-center text-lg font-bold border border-[#FFD700]/10 truncate px-1 shadow-sm">
                         {name}
                       </div>
                     ))}
                   </div>
                </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-white/20 italic select-none">
                 {/* 【修改点1：大红包占位】 */}
                 <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80 mb-4 animate-bounce">
                    <path d="M2 8L12 13L22 8" stroke="#D00000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke="#D00000" strokeWidth="2" fill="#8B0000" fillOpacity="0.5"/>
                    <circle cx="12" cy="14" r="3" fill="#FFD700"/>
                    <path d="M12 13V15" stroke="#D00000" strokeWidth="1"/>
                 </svg>
                 <span className="text-xl font-shufa tracking-widest text-[#D00000]">好运即来</span>
               </div>
             )}
          </div>

          <div className="mt-6 shrink-0">
            <button
              onClick={startDraw}
              disabled={isDrawing || winners[currentLevel].length > 0}
              className={`w-full py-4 text-3xl font-shufa tracking-[0.2em] rounded-full border border-[#FFD700] transition-all duration-300 shadow-xl ${
                isDrawing || winners[currentLevel].length > 0 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-600' 
                  : 'bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-[#8B0000] hover:scale-105 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]'
              }`}
            >
              {isDrawing ? '抽奖中...' : '开始抽奖'}
            </button>
          </div>
        </div>
      </main>

      {/* 底部工具栏 */}
      <footer className="h-[8vh] flex justify-between items-center px-10 bg-black/20 shrink-0 border-t border-[#FFD700]/10">
        <div className="flex gap-6">
           <button onClick={() => setIsSettingsOpen(true)} className="text-[#FFD700]/60 hover:text-[#FFD700] flex items-center gap-2 transition-colors">
             ⚙️ 名单管理
           </button>
           <button onClick={() => fileInputRef.current?.click()} className="text-[#FFD700]/60 hover:text-[#FFD700] flex items-center gap-2 transition-colors">
             🎵 BGM设置
           </button>
           <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleBgmUpload} />
        </div>
        
        <div className="flex gap-6">
           <button onClick={async () => setIsBgmMuted(await audioManager.toggleBgm())} className="text-2xl opacity-70 hover:opacity-100 hover:scale-110 transition-all">
             {isBgmMuted ? '🔇' : '🔊'}
           </button>
           <button onClick={toggleFullscreen} className="text-2xl opacity-70 hover:opacity-100 hover:scale-110 transition-all">
             {isFullscreen ? '🔳' : '🔲'}
           </button>
        </div>
      </footer>

      {/* 全屏结果页 */}
      {showResult && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2d0000] animate-fade-in" 
          onClick={() => setShowResult(null)}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FFD700 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          
          <div className="relative z-10 w-[95vw] h-[95vh] border-4 border-[#FFD700] rounded-[3rem] flex flex-col items-center bg-gradient-to-b from-[#4a0000] to-[#1a0000] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden p-8">
            <div className="h-[18%] flex flex-col items-center justify-center shrink-0">
               <h3 className={`font-shufa text-[#FFD700] tracking-widest drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] font-black leading-none ${PRIZE_MAP[currentLevel as keyof typeof PRIZE_MAP].titleSize}`}>
                 恭喜获得{PRIZE_MAP[currentLevel as keyof typeof PRIZE_MAP].label}
               </h3>
               <div className="w-[40vw] h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent mt-4 opacity-50"></div>
            </div>
            
            <div className="flex-1 w-full flex items-center justify-center min-h-0">
               <div className={`grid grid-cols-5 w-full max-w-[90vw] ${PRIZE_MAP[currentLevel as keyof typeof PRIZE_MAP].gap}`}>
                {showResult.map((name, i) => (
                  <div 
                    key={i} 
                    className={`
                      flex items-center justify-center 
                      ${PRIZE_MAP[currentLevel as keyof typeof PRIZE_MAP].py} 
                      bg-gradient-to-b from-[#FFD700]/10 to-transparent 
                      border border-[#FFD700]/30 
                      rounded-xl 
                      shadow-lg backdrop-blur-sm 
                      animate-zoom-in
                    `}
                    style={{ animationDelay: `${i*30}ms` }}
                  >
                    <span className={`font-black text-[#FFFAF0] tracking-widest drop-shadow-md ${PRIZE_MAP[currentLevel as keyof typeof PRIZE_MAP].nameSize}`}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-[8%] flex flex-col items-center justify-center shrink-0">
              <span className="text-[#FFD700]/30 text-xl font-shufa tracking-[1em] animate-pulse">点击任意处关闭</span>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗组件 */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentNames={allNames} 
        onSave={(names) => {
          setAllNames(names); setPool(names);
          setWinners({ '1st': [], '2nd': [], '3rd': [] });
          localStorage.setItem('lottery_names', JSON.stringify(names));
          localStorage.setItem('lottery_pool', JSON.stringify(names));
          localStorage.removeItem('lottery_winners');
        }} 
      />
    </div>
  );
};

export default App;