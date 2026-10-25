import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface LabHeaderProps {
  activeView: 'bench' | 'schematic' | 'oscilloscopes';
  onChangeView: (view: 'bench' | 'schematic' | 'oscilloscopes') => void;
  onOpenPinouts: () => void;
  onOpenWiring: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const LabHeader: React.FC<LabHeaderProps> = ({
  activeView,
  onChangeView,
  onOpenPinouts,
  onOpenWiring,
  isPlaying,
  onTogglePlay,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
        <span className="text-lg font-bold tracking-tight text-white font-mono">
          Photon<span className="text-cyan-400">Audio</span>
        </span>
      </div>

      {/* Zone 2: 4-5 single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-medium text-slate-400">
        <button
          onClick={() => onChangeView('bench')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'bench' ? 'text-cyan-400 font-semibold border-b border-cyan-400 pb-0.5' : ''
          }`}
        >
          Optical Bench
        </button>
        <button
          onClick={() => onChangeView('schematic')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'schematic' ? 'text-cyan-400 font-semibold border-b border-cyan-400 pb-0.5' : ''
          }`}
        >
          Circuit Schematic
        </button>
        <button
          onClick={() => onChangeView('oscilloscopes')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'oscilloscopes' ? 'text-cyan-400 font-semibold border-b border-cyan-400 pb-0.5' : ''
          }`}
        >
          Dual Oscilloscope
        </button>
        <button
          onClick={onOpenPinouts}
          className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
        >
          Component Pinouts
        </button>
        <button
          onClick={onOpenWiring}
          className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
        >
          Wiring Guide
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
          }`}
        >
          {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'Pause Audio' : 'Start Audio Link'}</span>
        </button>
      </div>
    </header>
  );
};
