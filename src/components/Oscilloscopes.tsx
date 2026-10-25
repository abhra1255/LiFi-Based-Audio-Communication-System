import React, { useRef, useEffect, useState } from 'react';
import { CircuitParameters, OpticalParameters, TelemetryData } from '../types/simulator';
import { audioEngine } from '../audio/AudioEngine';
import { Activity, BarChart2, Pause, Play, RefreshCw, Zap } from 'lucide-react';

interface OscilloscopesProps {
  optical: OpticalParameters;
  circuit: CircuitParameters;
  telemetry: TelemetryData;
}

export const Oscilloscopes: React.FC<OscilloscopesProps> = ({
  optical,
  circuit,
  telemetry,
}) => {
  const txCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rxCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isFrozen, setIsFrozen] = useState(false);
  const [viewMode, setViewMode] = useState<'time' | 'fft'>('time');
  const [voltsPerDiv, setVoltsPerDiv] = useState<number>(1.0); // 1.0 V/div
  const [timeDiv, setTimeDiv] = useState<number>(2.0); // 2 ms/div

  // Data buffers
  const txTimeBuffer = useRef<Uint8Array>(new Uint8Array(1024));
  const rxTimeBuffer = useRef<Uint8Array>(new Uint8Array(1024));
  const txFreqBuffer = useRef<Uint8Array>(new Uint8Array(512));
  const rxFreqBuffer = useRef<Uint8Array>(new Uint8Array(512));

  // Laser trace color
  const laserColor =
    optical.wavelength === 650 ? '#ef4444' : optical.wavelength === 532 ? '#22c55e' : '#a855f7';

  useEffect(() => {
    let animId: number;

    const render = () => {
      if (!isFrozen) {
        audioEngine.getTxTimeDomainData(txTimeBuffer.current);
        audioEngine.getRxTimeDomainData(rxTimeBuffer.current);
        audioEngine.getTxFrequencyData(txFreqBuffer.current);
        audioEngine.getRxFrequencyData(rxFreqBuffer.current);
      }

      // 1. Render CH1 (Tx Oscilloscope)
      drawScope(
        txCanvasRef.current,
        viewMode === 'time' ? txTimeBuffer.current : txFreqBuffer.current,
        'CH1: TX MODULATED LASER DRIVE',
        laserColor,
        viewMode,
        circuit.txPowerOn,
        circuit.txGain > 0.85
      );

      // 2. Render CH2 (Rx Oscilloscope)
      drawScope(
        rxCanvasRef.current,
        viewMode === 'time' ? rxTimeBuffer.current : rxFreqBuffer.current,
        'CH2: RX SOLAR DETECTOR & SPEAKER',
        '#06b6d4',
        viewMode,
        circuit.rxPowerOn && telemetry.opticalPowerReceived > 0,
        telemetry.isClipping
      );

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isFrozen, viewMode, voltsPerDiv, timeDiv, laserColor, circuit, telemetry]);

  const drawScope = (
    canvas: HTMLCanvasElement | null,
    data: Uint8Array,
    title: string,
    traceColor: string,
    mode: 'time' | 'fft',
    hasSignal: boolean,
    isClipping: boolean
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // CRT Screen Background
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    // Grid lines (8 divisions vertical, 10 horizontal)
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 1;
    const numCols = 10;
    const numRows = 8;
    for (let c = 0; c <= numCols; c++) {
      const x = (w / numCols) * c;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let r = 0; r <= numRows; r++) {
      const y = (h / numRows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center Crosshair Axis with sub-division ticks
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 1.2;
    const midX = w / 2;
    const midY = h / 2;

    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();

    // Center ticks
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.7)';
    for (let i = 0; i <= numCols * 5; i++) {
      const tx = (w / (numCols * 5)) * i;
      ctx.beginPath();
      ctx.moveTo(tx, midY - 2);
      ctx.lineTo(tx, midY + 2);
      ctx.stroke();
    }
    for (let i = 0; i <= numRows * 5; i++) {
      const ty = (h / (numRows * 5)) * i;
      ctx.beginPath();
      ctx.moveTo(midX - 2, ty);
      ctx.lineTo(midX + 2, ty);
      ctx.stroke();
    }

    // Trace Drawing
    if (mode === 'time') {
      // Find trigger crossing point for stable zero-crossing display
      let triggerIndex = 0;
      for (let i = 0; i < data.length - 1; i++) {
        if (data[i] < 128 && data[i + 1] >= 128) {
          triggerIndex = i;
          break;
        }
      }

      ctx.strokeStyle = hasSignal ? traceColor : '#334155';
      ctx.lineWidth = 2;
      ctx.shadowColor = traceColor;
      ctx.shadowBlur = hasSignal ? 6 : 0;
      ctx.beginPath();

      const step = (w / (data.length - triggerIndex)) * (timeDiv / 2.0);
      const verticalScale = 1.0 / voltsPerDiv;

      for (let i = 0; i < data.length - triggerIndex; i++) {
        const val = data[triggerIndex + i];
        // 128 is center DC bias (2.5V baseline)
        const vOffset = (val - 128) * verticalScale;
        const x = i * step;
        let y = midY - vOffset;

        // Clip visualization if driven beyond rail limits (0V - 5V)
        if (isClipping && (y < 12 || y > h - 12)) {
          y = y < 12 ? 12 : h - 12;
        }

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        if (x > w) break;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      // Frequency FFT Spectrum Bars
      const barWidth = (w / data.length) * 2;
      for (let i = 0; i < data.length / 2; i++) {
        const val = data[i];
        const barHeight = (val / 255) * (h - 20);
        ctx.fillStyle = hasSignal ? traceColor : '#334155';
        ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
      }
    }

    // Header Label & Status Tag
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(title, 12, 18);

    ctx.fillStyle = hasSignal ? '#22c55e' : '#64748b';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText(hasSignal ? 'LIVE [TRIG OK]' : 'NO CARRIER', w - 100, 18);

    if (isClipping) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('! SATURATION / CLIPPING !', w - 180, h - 10);
    }

    ctx.restore();
  };

  return (
    <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
      {/* Scope Header & Instrument Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800/80 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Activity className="w-4 h-4" />
            <span>DUAL-BEAM DIGITAL STORAGE OSCILLOSCOPE</span>
          </div>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">Timebase: {timeDiv} ms/div</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">Scale: {voltsPerDiv} V/div</span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('time')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'time' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Waveform
            </button>
            <button
              onClick={() => setViewMode('fft')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'fft' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FFT Spectrum
            </button>
          </div>

          {/* Timebase select */}
          <select
            value={timeDiv}
            onChange={(e) => setTimeDiv(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-300 px-2 py-1 rounded text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value={1.0}>1 ms/div</option>
            <option value={2.0}>2 ms/div</option>
            <option value={5.0}>5 ms/div</option>
            <option value={10.0}>10 ms/div</option>
          </select>

          {/* Volts/div select */}
          <select
            value={voltsPerDiv}
            onChange={(e) => setVoltsPerDiv(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-300 px-2 py-1 rounded text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value={0.5}>0.5 V/div</option>
            <option value={1.0}>1.0 V/div</option>
            <option value={2.0}>2.0 V/div</option>
          </select>

          {/* Freeze / Run */}
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
              isFrozen
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isFrozen ? 'Resume' : 'Hold'}</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Dual Display Canvases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CH1 (Tx) */}
        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col">
          <canvas ref={txCanvasRef} className="w-full h-52 scope-grid" />
          <div className="bg-slate-900/90 px-3 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Tx Vpp: <strong className="text-slate-200 tabular-nums">{telemetry.txVpp} V</strong></span>
            <span>Tx Vrms: <strong className="text-slate-200 tabular-nums">{telemetry.txVrms} V</strong></span>
            <span>Freq: <strong className="text-slate-200 tabular-nums">{telemetry.detectedFreq} Hz</strong></span>
          </div>
        </div>

        {/* CH2 (Rx) */}
        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col">
          <canvas ref={rxCanvasRef} className="w-full h-52 scope-grid" />
          <div className="bg-slate-900/90 px-3 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Rx Vpp: <strong className="text-cyan-400 tabular-nums">{telemetry.rxVpp} V</strong></span>
            <span>Rx Vrms: <strong className="text-cyan-400 tabular-nums">{telemetry.rxVrms} V</strong></span>
            <span>SNR: <strong className="text-emerald-400 tabular-nums">{telemetry.estimatedSnrDb} dB</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
