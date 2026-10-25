/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AudioSourceType,
  CircuitParameters,
  OpticalParameters,
  TelemetryData,
} from './types/simulator';
import { audioEngine } from './audio/AudioEngine';
import { LabHeader } from './components/LabHeader';
import { BenchCanvas } from './components/BenchCanvas';
import { CircuitSchematic } from './components/CircuitSchematic';
import { Oscilloscopes } from './components/Oscilloscopes';
import { ControlPanel } from './components/ControlPanel';
import { ComponentInspector } from './components/ComponentInspector';
import {
  Activity,
  Compass,
  Cpu,
  Layers,
  Radio,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function App() {
  // Navigation & View Mode
  const [activeView, setActiveView] = useState<'bench' | 'schematic' | 'oscilloscopes'>('bench');
  const [inspectorComponentId, setInspectorComponentId] = useState<string | null>(null);

  // Optical Channel State
  const [optical, setOptical] = useState<OpticalParameters>({
    distanceMeters: 2.0,
    reflectorAngleDeg: 45.0,
    isBlocked: false,
    obstaclePosition: 50,
    ambientLightLux: 120,
    wavelength: 650, // 650nm Red default
  });

  // Circuit & Hardware Parameters
  const [circuit, setCircuit] = useState<CircuitParameters>({
    txGain: 0.65,
    rxGain: 0.75,
    txPowerOn: true,
    rxPowerOn: true,
    toneFrequency: 1000,
    toneType: 'sine',
    acCoupled: true,
  });

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSource, setCurrentSource] = useState<AudioSourceType>('sample_synthwave');
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);

  // Live Real-Time Telemetry
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    txVpp: 0,
    txVrms: 0,
    rxVpp: 0,
    rxVrms: 0,
    alignmentEfficiency: 100,
    opticalPowerReceived: 4.8,
    estimatedSnrDb: 38.5,
    isClipping: false,
    detectedFreq: 440,
  });

  // Synchronize Audio Engine physics continuously
  useEffect(() => {
    audioEngine.updatePhysics(optical, circuit);
  }, [optical, circuit]);

  // Synchronize Tone frequency if Tone generator is active
  useEffect(() => {
    if (currentSource === 'tone') {
      audioEngine.updateToneFrequency(circuit.toneFrequency, circuit.toneType);
    }
  }, [circuit.toneFrequency, circuit.toneType, currentSource]);

  // Continuous Telemetry extraction loop (20Hz)
  useEffect(() => {
    const timer = setInterval(() => {
      const data = audioEngine.getTelemetry(optical, circuit);
      setTelemetry(data);
      setIsPlaying(audioEngine.getIsPlaying());
    }, 50);

    return () => clearInterval(timer);
  }, [optical, circuit]);

  // Master Play / Pause
  const handleTogglePlay = useCallback(async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.setAudioSource(currentSource, circuit, customAudioFile || undefined);
      setIsPlaying(true);
    }
  }, [isPlaying, currentSource, circuit, customAudioFile]);

  // Source selection
  const handleSelectSource = useCallback(
    async (source: AudioSourceType) => {
      setCurrentSource(source);
      if (isPlaying) {
        await audioEngine.setAudioSource(source, circuit, customAudioFile || undefined);
      }
    },
    [isPlaying, circuit, customAudioFile]
  );

  // File upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      setCustomFileName(file.name);
      setCustomAudioFile(file);
      setCurrentSource('custom_file');
      await audioEngine.setAudioSource('custom_file', circuit, file);
      setIsPlaying(true);
    },
    [circuit]
  );

  // Optical updates
  const handleUpdateOptical = useCallback((updates: Partial<OpticalParameters>) => {
    setOptical((prev) => ({ ...prev, ...updates }));
  }, []);

  // Circuit updates
  const handleUpdateCircuit = useCallback((updates: Partial<CircuitParameters>) => {
    setCircuit((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Top Navigation Bar adhering to Top Bar Contract */}
      <LabHeader
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenPinouts={() => setInspectorComponentId('pam8403_tx')}
        onOpenWiring={() => setInspectorComponentId('lm7805')}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 flex flex-col gap-5">
        {/* Real-time Scientific Telemetry Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Link Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  optical.isBlocked
                    ? 'bg-rose-500'
                    : !circuit.txPowerOn || !circuit.rxPowerOn
                    ? 'bg-amber-500'
                    : isPlaying
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-sm font-mono font-bold text-slate-200">
                {optical.isBlocked
                  ? 'Beam Blocked'
                  : !circuit.txPowerOn
                  ? 'Tx Power Off'
                  : !circuit.rxPowerOn
                  ? 'Rx Power Off'
                  : isPlaying
                  ? 'Active Optical Link'
                  : 'Standby'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              λ = {optical.wavelength} nm Carrier
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Alignment Accuracy</span>
            <div className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-1">
              {telemetry.alignmentEfficiency}
              <span className="text-xs font-mono text-slate-400 ml-1">%</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              θ = {optical.reflectorAngleDeg.toFixed(1)}° (Reflector)
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Received Optical Flux</span>
            <div className="text-xl font-mono font-bold text-cyan-400 tabular-nums mt-1">
              {telemetry.opticalPowerReceived}
              <span className="text-xs font-mono text-slate-400 ml-1">mW</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              Distance: {optical.distanceMeters.toFixed(1)} m
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Tx Modulated Drive</span>
            <div className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-1">
              {telemetry.txVpp}
              <span className="text-xs font-mono text-slate-400 ml-1">Vpp</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              PAM8403 Tx Gain: {Math.round(circuit.txGain * 100)}%
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Rx Solar Output</span>
            <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums mt-1">
              {telemetry.rxVpp}
              <span className="text-xs font-mono text-slate-400 ml-1">Vpp</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              Rx Amp: {Math.round(circuit.rxGain * 100)}%
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Link SNR</span>
            <div className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-1">
              {telemetry.estimatedSnrDb}
              <span className="text-xs font-mono text-slate-400 ml-1">dB</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              Ambient: {optical.ambientLightLux} Lux
            </span>
          </div>
        </section>

        {/* Primary Visualization Deck */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          {/* Sub-View Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveView('bench')}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  activeView === 'bench'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Optical Bench & Ray Tracer
              </button>
              <button
                onClick={() => setActiveView('schematic')}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  activeView === 'schematic'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Circuit Schematic Diagram
              </button>
              <button
                onClick={() => setActiveView('oscilloscopes')}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  activeView === 'oscilloscopes'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dual Oscilloscopes
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                LM7805 +5V Rail
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                650nm Laser Beam
              </span>
            </div>
          </div>

          {/* Active View Container */}
          <div className="w-full min-h-[460px]">
            {activeView === 'bench' && (
              <BenchCanvas
                optical={optical}
                circuit={circuit}
                telemetry={telemetry}
                onSelectComponent={(id) => setInspectorComponentId(id)}
                onUpdateMirrorAngle={(angle) => handleUpdateOptical({ reflectorAngleDeg: angle })}
                onToggleBlocked={() => handleUpdateOptical({ isBlocked: !optical.isBlocked })}
              />
            )}

            {activeView === 'schematic' && (
              <CircuitSchematic
                optical={optical}
                circuit={circuit}
                telemetry={telemetry}
                onSelectComponent={(id) => setInspectorComponentId(id)}
              />
            )}

            {activeView === 'oscilloscopes' && (
              <Oscilloscopes
                optical={optical}
                circuit={circuit}
                telemetry={telemetry}
              />
            )}
          </div>
        </section>

        {/* Dual Oscilloscope Quick Rack (Shown below bench view for continuous waveform monitoring) */}
        {activeView !== 'oscilloscopes' && (
          <section>
            <Oscilloscopes
              optical={optical}
              circuit={circuit}
              telemetry={telemetry}
            />
          </section>
        )}

        {/* Comprehensive Interactive Controls Rack */}
        <section>
          <ControlPanel
            optical={optical}
            circuit={circuit}
            isPlaying={isPlaying}
            currentSource={currentSource}
            customFileName={customFileName}
            onTogglePlay={handleTogglePlay}
            onSelectSource={handleSelectSource}
            onFileUpload={handleFileUpload}
            onUpdateOptical={handleUpdateOptical}
            onUpdateCircuit={handleUpdateCircuit}
          />
        </section>
      </main>

      {/* Educational Component Inspector Modal */}
      <ComponentInspector
        selectedComponentId={inspectorComponentId}
        onClose={() => setInspectorComponentId(null)}
        onSelectComponent={(id) => setInspectorComponentId(id)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 mt-8 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>Free-Space Optical Audio Communicator (Li-Fi) Simulation</span>
          <span>·</span>
          <span>PAM8403 Class-D / UTC LM7805L / Photovoltaic AM Demodulation</span>
        </div>
        <div className="text-slate-400">
          Built for physical laboratory experimentation & electronics pedagogy
        </div>
      </footer>
    </div>
  );
}
