import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Sparkles, Maximize2 } from 'lucide-react';

export default function HeroPerfumeVideo() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [videoSrc, setVideoSrc] = useState('/hero-perfume-video.mp4');
  const [videoFit, setVideoFit] = useState('contain');
  const [videoAspect, setVideoAspect] = useState('auto');
  const [videoMaxHeight, setVideoMaxHeight] = useState(540);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.heroVideoUrl) setVideoSrc(data.heroVideoUrl);
          if (data.heroVideoFit) setVideoFit(data.heroVideoFit);
          if (data.heroVideoAspect) setVideoAspect(data.heroVideoAspect);
          if (data.heroVideoHeight) setVideoMaxHeight(parseInt(data.heroVideoHeight, 10) || 540);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Attempt autoplay
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [videoSrc]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Golden Aura Glow Backdrop behind video */}
      <div className="absolute -inset-2 bg-gradient-to-r from-[#d4af37]/25 via-[#fcf6ba]/15 to-[#aa820a]/20 rounded-3xl blur-2xl opacity-75 pointer-events-none animate-pulse" />

      {/* Luxury Video Container */}
      <div 
        className="relative w-full rounded-3xl overflow-hidden glass-panel border-2 border-[#d4af37]/45 shadow-[0_25px_60px_rgba(0,0,0,0.9)] bg-black group flex items-center justify-center transition-all duration-300"
        style={{
          maxHeight: `${videoMaxHeight || 540}px`
        }}
      >
        {/* Top Video Header Tag */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
          <div className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#d4af37]/40 text-[10px] text-[#f3e5ab] font-serif-luxury tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3 h-3 text-[#d4af37] animate-spin" />
            <span>SCENTORY.LK • Commercial Film</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#d4af37] text-black uppercase tracking-wider">
            HD 4K
          </span>
        </div>

        {/* Video Element with Full Fit / Adjustable Ratio */}
        <video
          ref={videoRef}
          key={`${videoSrc}-${videoFit}-${videoAspect}`}
          src={videoSrc}
          playsInline
          autoPlay
          loop
          muted={isMuted}
          onLoadedData={() => setHasLoaded(true)}
          style={{
            maxHeight: `${videoMaxHeight || 540}px`,
            aspectRatio: videoAspect === 'auto' ? 'auto' : (videoAspect === '9/16' ? '9/16' : (videoAspect === '4/5' ? '4/5' : (videoAspect === '1/1' ? '1/1' : (videoAspect === '16/9' ? '16/9' : 'auto'))))
          }}
          className={`w-full h-full ${videoFit === 'contain' ? 'object-contain bg-black' : 'object-cover'} cursor-pointer transition-all duration-300`}
          onClick={togglePlay}
        />

        {/* Click to Play Overlay if paused */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer z-10"
          >
            <div className="w-16 h-16 rounded-full bg-[#d4af37] text-black flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-black ml-1" />
            </div>
          </div>
        )}

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between p-2 rounded-2xl bg-black/80 backdrop-blur-md border border-[#d4af37]/30 shadow-xl text-xs gap-2">
          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={togglePlay}
            className="p-1.5 rounded-xl hover:bg-white/10 text-[#f3e5ab] transition-colors flex items-center gap-1.5 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-[#d4af37]" /> : <Play className="w-4 h-4 text-[#d4af37] fill-[#d4af37]" />}
            <span className="text-[10px] uppercase tracking-wider hidden sm:inline">
              {isPlaying ? 'Pause' : 'Play'}
            </span>
          </button>

          {/* Sizing & Fit Mode Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVideoFit(prev => prev === 'contain' ? 'cover' : 'contain');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/15 hover:border-[#d4af37] text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            title={videoFit === 'contain' ? 'Switch to Full Fill' : 'Switch to Full Bottle View (Contain)'}
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">
              {videoFit === 'contain' ? 'Full View (Contain)' : 'Fill Frame'}
            </span>
          </button>

          {/* Sound Mute / Unmute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              isMuted
                ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                : 'bg-[#d4af37]/20 border-[#d4af37] text-[#f3e5ab] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-[#d4af37] animate-pulse" />}
            <span className="text-[10px] uppercase tracking-wider font-semibold">
              {isMuted ? 'Sound Off' : 'Sound On'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
