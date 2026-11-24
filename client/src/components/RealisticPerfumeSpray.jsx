import React, { useState, useEffect } from 'react';
import { Sparkles, Wind, RotateCcw } from 'lucide-react';

export default function RealisticPerfumeSpray() {
  const [isCapOpen, setIsCapOpen] = useState(false);
  const [isSpraying, setIsSpraying] = useState(false);
  const [sprayCount, setSprayCount] = useState(0);
  const [activeNote, setActiveNote] = useState('Cambodian Oud');

  const scentNotes = [
    'Pure Cambodian Oud',
    'Golden Amber Resin',
    'Smoked Damask Rose',
    'Tuscan Iris Concrete',
    'Madagascar Bourbon Vanilla',
    'Australian Sandalwood'
  ];

  // Auto demonstration on first mount to captivate visitor
  useEffect(() => {
    const timer1 = setTimeout(() => {
      triggerSpraySequence();
    }, 1800);
    return () => clearTimeout(timer1);
  }, []);

  const triggerSpraySequence = () => {
    if (isSpraying) return;

    // 1. Lift cap
    setIsCapOpen(true);

    // 2. Delay slightly then fire spray
    setTimeout(() => {
      setIsSpraying(true);
      setSprayCount(prev => prev + 1);
      setActiveNote(scentNotes[Math.floor(Math.random() * scentNotes.length)]);

      // 3. Stop spray mist after 1.8s
      setTimeout(() => {
        setIsSpraying(false);

        // 4. Close cap after 3s
        setTimeout(() => {
          setIsCapOpen(false);
        }, 2200);
      }, 1600);
    }, 450);
  };

  return (
    <div className="relative w-full max-w-md mx-auto flex flex-col items-center justify-center select-none py-6">
      {/* Golden Aura Glow Backdrop */}
      <div
        className={`absolute w-72 h-72 rounded-full blur-[90px] transition-all duration-700 pointer-events-none ${
          isSpraying ? 'bg-[#d4af37]/35 scale-125' : 'bg-[#d4af37]/15 scale-100'
        }`}
      />

      {/* Floating Scent Note Pill on Spray */}
      <div
        className={`absolute -top-4 px-4 py-1.5 rounded-full bg-black/80 border border-[#d4af37]/60 text-xs font-serif-luxury text-[#f3e5ab] tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.4)] backdrop-blur-md transition-all duration-500 z-30 flex items-center gap-2 ${
          isSpraying ? 'opacity-100 -translate-y-2 scale-105' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#d4af37] animate-spin" />
        <span>Aromatics Unleashed: <strong className="text-white">{activeNote}</strong></span>
      </div>

      {/* Main Flacon Container */}
      <div
        onClick={triggerSpraySequence}
        className="relative cursor-pointer group flex flex-col items-center"
        title="Click to Spray Fragrance"
      >
        {/* SPRAY MIST AEROSOL ANIMATION PLUME */}
        <div
          className={`absolute -top-28 -right-10 pointer-events-none z-20 transition-all duration-500 ${
            isSpraying ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          {/* Golden expanding vapor cone */}
          <div className="relative w-48 h-36">
            {/* Fine Mist Rings */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#d4af37]/40 via-[#fcf6ba]/25 to-transparent rounded-full blur-xl animate-ping" />
            <div className="absolute top-4 left-6 w-32 h-24 bg-gradient-to-tr from-[#d4af37]/50 via-white/20 to-transparent rounded-full blur-md animate-pulse" />

            {/* Rising droplets particles */}
            {[...Array(16)].map((_, i) => (
              <span
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#fcf6ba] shadow-[0_0_8px_#d4af37] animate-float-spray"
                style={{
                  top: `${15 + (i * 5)}%`,
                  left: `${20 + (i * 4)}%`,
                  animationDelay: `${i * 0.08}s`,
                  opacity: 0.85
                }}
              />
            ))}

            <div className="absolute top-1/2 left-4 text-[10px] font-mono tracking-widest text-[#f3e5ab] uppercase px-2 py-0.5 rounded bg-black/60 border border-[#d4af37]/40 backdrop-blur-sm whitespace-nowrap shadow-lg">
              ✨ 0.1ml Extrait Vapor Mist
            </div>
          </div>
        </div>

        {/* 1. SEPARATED LUXURY CAP (Animates UP when clicked/hovered) */}
        <div
          className={`relative z-10 transition-all duration-700 ease-out origin-bottom ${
            isCapOpen
              ? '-translate-y-12 rotate-[-6deg] shadow-[0_15px_30px_rgba(212,175,55,0.4)]'
              : 'translate-y-0 rotate-0'
          }`}
        >
          {/* The Flacon Cap */}
          <div className="w-24 h-16 rounded-t-xl bg-gradient-to-b from-[#fcf6ba] via-[#d4af37] to-[#8c6710] p-0.5 shadow-2xl relative border-t border-[#fcf6ba]">
            {/* Onyx inlay ring */}
            <div className="w-full h-full rounded-t-lg bg-[#0e0e12] border-2 border-[#d4af37]/40 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer" />
              <div className="w-8 h-8 rounded-full border border-[#d4af37]/50 flex items-center justify-center">
                <span className="font-serif-luxury text-[9px] font-bold text-[#d4af37]">S</span>
              </div>
            </div>
            {/* Gold trim bottom rim */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-gradient-to-r from-[#8c6710] via-[#fcf6ba] to-[#8c6710] rounded-full" />
          </div>
        </div>

        {/* 2. GOLD ATOMIZER NOZZLE (Revealed when cap lifts) */}
        <div
          className={`w-12 h-8 bg-gradient-to-b from-[#fcf6ba] via-[#d4af37] to-[#aa820a] rounded-sm relative z-0 -mt-2 transition-transform duration-300 ${
            isSpraying ? 'translate-y-1 scale-95' : 'translate-y-0 scale-100'
          }`}
        >
          {/* Spray Hole */}
          <div className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-black shadow-inner" />
          {/* Collar ring */}
          <div className="absolute bottom-0 inset-x-0 h-2 bg-[#705206]" />
        </div>

        {/* 3. CRYSTAL GLASS FLACON BODY (Realistic Heavy Luxury Bottle) */}
        <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-2xl p-1 bg-gradient-to-b from-white/20 via-white/5 to-[#d4af37]/30 shadow-[0_25px_60px_rgba(0,0,0,0.9)] -mt-1 group-hover:scale-[1.02] transition-transform duration-500">
          {/* Thick crystal glass outer wall */}
          <div className="w-full h-full rounded-xl bg-gradient-to-b from-[#14141a]/95 via-[#0e0e14]/90 to-[#08080c]/98 border border-[#d4af37]/30 relative overflow-hidden flex flex-col items-center justify-between p-6 backdrop-blur-md">

            {/* Amber Nectar liquid level inside glass */}
            <div className="absolute bottom-0 inset-x-0 h-4/5 bg-gradient-to-t from-[#c58a18]/40 via-[#8a5b06]/20 to-transparent pointer-events-none" />

            {/* Liquid Surface Meniscus line */}
            <div className="absolute bottom-[78%] inset-x-4 h-px bg-gradient-to-r from-transparent via-[#fcf6ba]/60 to-transparent pointer-events-none" />

            {/* Vertical glass light reflection line */}
            <div className="absolute top-0 bottom-0 left-6 w-3 bg-gradient-to-r from-white/10 via-white/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-6 w-2 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />

            {/* Suction Dip Tube running inside bottle */}
            <div className="absolute top-0 bottom-4 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-r from-white/20 via-white/40 to-white/10 rounded-full pointer-events-none" />

            {/* LUXURY METALLIC EMBOSSED LABEL */}
            <div className="relative z-10 w-full max-w-[190px] my-auto py-5 px-3 rounded-xl bg-gradient-to-b from-[#121218] to-[#08080a] border border-[#d4af37]/50 shadow-[0_8px_25px_rgba(0,0,0,0.8)] text-center flex flex-col items-center">
              {/* Gold Crest */}
              <div className="w-8 h-8 rounded-full border border-[#d4af37]/40 p-0.5 mb-2 bg-black/60 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                <img src="/brand-logo.png" alt="Scentory" className="w-full h-full object-cover rounded-full" />
              </div>

              <span className="font-serif-luxury text-base sm:text-lg font-bold tracking-[0.2em] gold-text-gradient uppercase block leading-none">
                SCENTORY
              </span>
              <span className="text-[8px] tracking-[0.25em] text-[#c5a059] uppercase mt-1">
                Extrait De Parfum
              </span>
              <span className="text-[9px] text-gray-400 font-serif-luxury mt-1.5 italic">
                Oud Royale Impérial
              </span>

              <div className="w-8 h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent my-2" />

              <span className="text-[8px] tracking-widest text-[#f3e5ab]/70 uppercase">
                10ml • 20ml • 50ml • 100ml
              </span>
            </div>

            {/* Flacon Base Weight */}
            <div className="relative z-10 w-full flex justify-between items-center text-[8px] tracking-widest text-gray-400 uppercase pt-2 border-t border-white/5">
              <span>Pure Nectar</span>
              <span className="text-[#d4af37]">Colombo • LK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Trigger Button */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 z-20">
        <button
          type="button"
          onClick={triggerSpraySequence}
          disabled={isSpraying}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#aa820a] text-black font-bold text-xs uppercase tracking-widest hover:opacity-95 shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center gap-2 group cursor-pointer disabled:opacity-60"
        >
          <Wind className={`w-4 h-4 ${isSpraying ? 'animate-spin text-black' : 'group-hover:translate-x-0.5 transition-transform'}`} />
          <span>{isSpraying ? 'Spraying Aroma Plume...' : 'Press To Spray Fragrance'}</span>
        </button>

        <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interactive Flacon • {sprayCount > 0 ? `${sprayCount} Sprays Sampled` : 'Hover or Click Cap'}</span>
        </span>
      </div>
    </div>
  );
}
