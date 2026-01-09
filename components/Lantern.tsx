
import React from 'react';

export const Lantern: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-20 h-24 transform-gpu origin-top ${className}`} style={{ animation: 'swing 6s ease-in-out infinite' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-6 bg-gradient-to-b from-yellow-900 to-yellow-600 opacity-60"></div>
      
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-12 h-3 bg-yellow-600 rounded-t-full border-b border-yellow-400/20"></div>
      
      <div className="absolute top-7 w-full h-16 bg-gradient-to-br from-red-600 via-red-800 to-black rounded-[2rem] shadow-[0_10px_30px_rgba(139,0,0,0.8)] border-y-2 border-festival-gold/60 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-around">
          <div className="w-px h-full bg-white"></div>
          <div className="w-px h-full bg-white"></div>
        </div>
        <span className="text-festival-gold font-shufa font-bold text-3xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] relative z-10">福</span>
      </div>

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-yellow-700 rounded-b-full shadow-md"></div>

      <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 flex flex-col items-center">
         <div className="w-1 h-2 bg-yellow-600"></div>
         <div className="w-4 h-12 bg-gradient-to-b from-red-600 to-transparent rounded-b-full opacity-60 animate-pulse"></div>
      </div>

      <style>{`
        @keyframes swing {
          0% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
          100% { transform: rotate(-3deg); }
        }
      `}</style>
    </div>
  );
};
