import React from 'react';

const NeuralHub = () => {
  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-midnight/50 rounded-3xl">
      {/* Deep Space Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-midnight z-0"></div>

      {/* Animated Grid Floor */}
      <div className="absolute bottom-0 w-[200%] h-1/2 bg-[linear-gradient(transparent_0%,_rgba(0,242,255,0.1)_1px,_transparent_1px),_linear-gradient(90deg,transparent_0%,_rgba(0,242,255,0.1)_1px,_transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)_translateY(100px)] animate-pulse-slow opacity-30"></div>

      {/* The Core: Spinning Neural Spheres */}
      <div className="relative z-10 w-64 h-64 [transform-style:preserve-3d] animate-[float_6s_ease-in-out_infinite]">

        {/* Central Core */}
        <div className="absolute inset-0 m-auto w-32 h-32 bg-cyber-teal/20 rounded-full blur-md animate-pulse"></div>
        <div className="absolute inset-0 m-auto w-20 h-20 bg-white/10 rounded-full backdrop-blur-sm border border-cyber-teal/50 shadow-[0_0_50px_rgba(0,242,255,0.4)]"></div>

        {/* Orbiting Rings */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 m-auto border border-academic-gold/30 rounded-full"
            style={{
              width: `${180 + i * 40}px`,
              height: `${180 + i * 40}px`,
              transform: `rotateX(70deg) rotateZ(${i * 45}deg)`,
              animation: `spin ${10 + i * 5}s linear infinite reverse`
            }}
          >
            {/* Particle on ring */}
            <div className="w-3 h-3 bg-academic-gold rounded-full shadow-[0_0_10px_#D4AF37] absolute top-0 left-1/2 -translate-x-1/2"></div>
          </div>
        ))}

        {/* Connection Lines (Simulated Filaments) */}
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none opacity-40">
          <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="#00F2FF" strokeWidth="1" />
          <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="#00F2FF" strokeWidth="1" />
          <line x1="50%" y1="50%" x2="50%" y2="90%" stroke="#00F2FF" strokeWidth="1" />
          <circle cx="20%" cy="20%" r="4" fill="#00F2FF" />
          <circle cx="80%" cy="20%" r="4" fill="#00F2FF" />
          <circle cx="50%" cy="90%" r="4" fill="#00F2FF" />
        </svg>
      </div>

      {/* Overlay Text */}
      <div className="absolute bottom-8 left-8 z-20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
          <span className="text-xs text-cyber-teal tracking-widest uppercase">Live System</span>
        </div>
        <h2 className="text-3xl font-display font-bold text-white">Focus: Current Topic</h2>
        <p className="text-gray-400 text-sm mt-1">Thinking...</p>
      </div>
    </div>
  );
};

export default NeuralHub;