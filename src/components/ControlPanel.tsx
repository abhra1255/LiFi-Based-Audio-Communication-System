import React, { useRef } from 'react';
import { AudioSourceType, CircuitParameters, LaserWavelength, OpticalParameters } from '../types/simulator';
import {
  AudioLines,
  Compass,
  FileAudio,
  Maximize2,
  Music,
  Power,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sun,
  Volume2,
  Waves,
} from 'lucide-react';

interface ControlPanelProps {
  optical: OpticalParameters;
  circuit: CircuitParameters;
  isPlaying: boolean;
  currentSource: AudioSourceType;
  customFileName: string | null;
  onTogglePlay: () => void;
  onSelectSource: (source: AudioSourceType) => void;
  onFileUpload: (file: File) => void;
  onUpdateOptical: (updates: Partial<OpticalParameters>) => void;
  onUpdateCircuit: (updates: Partial<CircuitParameters>) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  optical,
  circuit,
  isPlaying,
  currentSource,
  customFileName,
  onTogglePlay,
  onSelectSource,
  onFileUpload,
  onUpdateOptical,
  onUpdateCircuit,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ---------------- 1. AUDIO SOURCE & PLAYBACK ---------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs font-mono">
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5" />
              1. AUDIO SOURCE (AUX IN)
            </span>
            <span className="text-slate-400">{isPlaying ? 'PLAYING' : 'STANDBY'}</span>
          </div>

          {/* Source Selector Segmented Buttons */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <button
              onClick={() => onSelectSource('sample_synthwave')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded text-left transition-colors truncate ${
                currentSource === 'sample_synthwave'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              Synthwave
            </button>
            <button
              onClick={() => onSelectSource('sample_acoustic')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded text-left transition-colors truncate ${
                currentSource === 'sample_acoustic'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              Acoustic Guitar
            </button>
            <button
              onClick={() => onSelectSource('sample_speech')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded text-left transition-colors truncate ${
                currentSource === 'sample_speech'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              Voice Broadcast
            </button>
            <button
              onClick={() => onSelectSource('tone')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded text-left transition-colors truncate ${
                currentSource === 'tone'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              Tone Generator
            </button>
          </div>

          {/* Custom File Upload Option */}
          <div className="mb-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />
            <button
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded border transition-colors ${
                currentSource === 'custom_file'
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <FileAudio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{customFileName ? customFileName : 'Upload MP3 / WAV'}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">BROWSE</span>
            </button>
          </div>

          {/* Tone Generator Tuning Controls */}
          {currentSource === 'tone' && (
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 mb-3 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                <span>Frequency:</span>
                <span className="text-cyan-400 font-bold tabular-nums">{circuit.toneFrequency} Hz</span>
              </div>
              <input
                type="range"
                min={100}
                max={5000}
                step={25}
                value={circuit.toneFrequency}
                onChange={(e) => onUpdateCircuit({ toneFrequency: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex gap-1 pt-1">
                {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => onUpdateCircuit({ toneType: shape })}
                    className={`flex-1 py-1 text-[10px] font-mono capitalize rounded border transition-colors ${
                      circuit.toneType === shape
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Master Play / Pause Action */}
        <div className="pt-2">
          <button
            onClick={onTogglePlay}
            className={`w-full py-2 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/40'
            }`}
          >
            <AudioLines className="w-4 h-4" />
            <span>{isPlaying ? 'Pause Audio Transmission' : 'Start Audio Transmission'}</span>
          </button>
        </div>
      </div>

      {/* ---------------- 2. OPTICAL PATH & BEAM PHYSICS ---------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs font-mono">
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              2. OPTICAL BEAM & ALIGNMENT
            </span>
            <span className="text-slate-400">FREE-SPACE Li-Fi</span>
          </div>

          {/* Mirror Angle Adjustment */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs font-mono mb-1">
              <span className="text-slate-300">Reflector Mirror Angle:</span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold tabular-nums ${
                    Math.abs(optical.reflectorAngleDeg - 45.0) < 0.5 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {optical.reflectorAngleDeg.toFixed(1)}°
                </span>
                <button
                  onClick={() => onUpdateOptical({ reflectorAngleDeg: 45.0 })}
                  className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  title="Snap angle to optimal 45.0°"
                >
                  45°
                </button>
              </div>
            </div>
            <input
              type="range"
              min={35.0}
              max={55.0}
              step={0.1}
              value={optical.reflectorAngleDeg}
              onChange={(e) => onUpdateOptical({ reflectorAngleDeg: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
              <span>35° (Misaligned)</span>
              <span className="text-emerald-500/80 font-semibold">45° (Target)</span>
              <span>55° (Misaligned)</span>
            </div>
          </div>

          {/* Distance Slider */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs font-mono mb-1">
              <span className="text-slate-300">Free-Space Distance:</span>
              <span className="text-cyan-400 font-bold tabular-nums">{optical.distanceMeters.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={15.0}
              step={0.2}
              value={optical.distanceMeters}
              onChange={(e) => onUpdateOptical({ distanceMeters: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
              <span>0.2 m (Bench)</span>
              <span>15.0 m (Long Range Attenuation)</span>
            </div>
          </div>

          {/* Ambient Light Interference (Lux) */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs font-mono mb-1">
              <span className="text-slate-300 flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400" />
                Ambient Light:
              </span>
              <span className="text-amber-400 font-bold tabular-nums">{optical.ambientLightLux} lx</span>
            </div>
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={optical.ambientLightLux}
              onChange={(e) => onUpdateOptical({ ambientLightLux: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
              <span>0 lx (Dark)</span>
              <span>800 lx (Office)</span>
              <span>2000 lx (60Hz Hum)</span>
            </div>
          </div>
        </div>

        {/* Beam Obstacle Toggle */}
        <div className="pt-2">
          <button
            onClick={() => onUpdateOptical({ isBlocked: !optical.isBlocked })}
            className={`w-full py-2 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 border transition-colors ${
              optical.isBlocked
                ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-200 border-rose-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{optical.isBlocked ? 'Remove Hand / Card (Restore Beam)' : 'Place Hand / Card (Block Beam)'}</span>
          </button>
        </div>
      </div>

      {/* ---------------- 3. TRANSMITTER & RECEIVER HARDWARE ---------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs font-mono">
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              3. AMPLIFIER & POWER RAILS
            </span>
            <span className="text-slate-400">PAM8403 / LM7805</span>
          </div>

          {/* Tx PAM8403 Gain */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs font-mono mb-1">
              <span className="text-slate-300">Tx PAM8403 Modulation Gain:</span>
              <span
                className={`font-bold tabular-nums ${
                  circuit.txGain > 0.85 ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {Math.round(circuit.txGain * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.0}
              step={0.02}
              value={circuit.txGain}
              onChange={(e) => onUpdateCircuit({ txGain: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            {circuit.txGain > 0.85 && (
              <p className="text-[10px] font-mono text-amber-400 mt-1">
                Warning: Driving Tx gain high causes Class-D rail clipping!
              </p>
            )}
          </div>

          {/* Rx PAM8403 Volume */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs font-mono mb-1">
              <span className="text-slate-300">Rx PAM8403 Speaker Volume:</span>
              <span className="text-slate-200 font-bold tabular-nums">
                {Math.round(circuit.rxGain * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.0}
              step={0.02}
              value={circuit.rxGain}
              onChange={(e) => onUpdateCircuit({ rxGain: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Laser Wavelength Selection */}
          <div className="mb-3">
            <div className="text-xs font-mono text-slate-300 mb-1">Laser Diode Wavelength:</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { wl: 650 as LaserWavelength, label: '650nm Red' },
                { wl: 532 as LaserWavelength, label: '532nm Green' },
                { wl: 405 as LaserWavelength, label: '405nm Violet' },
              ].map(({ wl, label }) => (
                <button
                  key={wl}
                  onClick={() => onUpdateOptical({ wavelength: wl })}
                  className={`py-1 text-xs font-mono rounded border transition-colors ${
                    optical.wavelength === wl
                      ? wl === 650
                        ? 'bg-red-600/30 border-red-500 text-red-300'
                        : wl === 532
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                        : 'bg-purple-600/30 border-purple-500 text-purple-300'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* AC Coupling vs DC Coupling Toggle */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800 text-xs font-mono">
            <div>
              <div className="text-slate-300 font-semibold">Solar AC Coupling Cap</div>
              <div className="text-[10px] text-slate-500">10µF electrolytic capacitor</div>
            </div>
            <button
              onClick={() => onUpdateCircuit({ acCoupled: !circuit.acCoupled })}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                circuit.acCoupled
                  ? 'bg-cyan-900/60 border-cyan-500 text-cyan-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {circuit.acCoupled ? 'AC Coupled' : 'Direct DC'}
            </button>
          </div>
        </div>

        {/* 9V Battery Power Rails Switches */}
        <div className="pt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => onUpdateCircuit({ txPowerOn: !circuit.txPowerOn })}
            className={`py-1.5 px-3 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 border transition-colors ${
              circuit.txPowerOn
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>Tx 9V Rail: {circuit.txPowerOn ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => onUpdateCircuit({ rxPowerOn: !circuit.rxPowerOn })}
            className={`py-1.5 px-3 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 border transition-colors ${
              circuit.rxPowerOn
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>Rx 9V Rail: {circuit.rxPowerOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
