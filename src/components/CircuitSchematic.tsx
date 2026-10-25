import React from 'react';
import { CircuitParameters, OpticalParameters, TelemetryData } from '../types/simulator';

interface CircuitSchematicProps {
  optical: OpticalParameters;
  circuit: CircuitParameters;
  telemetry: TelemetryData;
  onSelectComponent: (componentId: string) => void;
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  optical,
  circuit,
  telemetry,
  onSelectComponent,
}) => {
  const isTransmitting = circuit.txPowerOn && !optical.isBlocked && telemetry.opticalPowerReceived > 0;
  const isClipping = circuit.txGain > 0.85;

  const laserColor =
    optical.wavelength === 650 ? '#ef4444' : optical.wavelength === 532 ? '#22c55e' : '#a855f7';

  return (
    <div className="w-full h-full min-h-[440px] bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between overflow-x-auto">
      <div className="flex items-center justify-between mb-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-semibold">ELECTRICAL SCHEMATIC</span>
          <span>·</span>
          <span>Dual PAM8403 Class-D Optical Link with LM7805 Regulation</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse"></span>
            +5V Regulated Rail
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            AC Audio Path
          </span>
        </div>
      </div>

      {/* High precision SVG Schematic */}
      <div className="relative flex-1 w-full min-w-[760px] h-[360px] bg-slate-900/60 rounded-lg border border-slate-800/80 p-2 overflow-hidden">
        <svg
          viewBox="0 0 920 400"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="gradBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={laserColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={laserColor} stopOpacity={telemetry.alignmentEfficiency / 100} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ----------------- TRANSMITTER SECTION ----------------- */}
          {/* Section Boundary Box */}
          <rect
            x="20"
            y="20"
            width="400"
            height="360"
            rx="8"
            fill="rgba(15, 23, 42, 0.4)"
            stroke="#1e293b"
            strokeDasharray="4 4"
          />
          <text x="35" y="42" fill="#64748b" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">
            TRANSMITTER (Tx) SUBSYSTEM
          </text>

          {/* 9V Battery Tx */}
          <g transform="translate(40, 60)" className="cursor-pointer" onClick={() => onSelectComponent('lm7805')}>
            <rect x="0" y="0" width="60" height="40" rx="4" fill="#1e293b" stroke={circuit.txPowerOn ? '#22c55e' : '#475569'} strokeWidth="1.5" />
            <text x="12" y="22" fill="#e2e8f0" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">9V BATT</text>
            <text x="15" y="33" fill={circuit.txPowerOn ? '#22c55e' : '#64748b'} fontSize="8" fontFamily="JetBrains Mono">
              {circuit.txPowerOn ? '9.0V DC' : 'OFF'}
            </text>
            {/* Battery terminals */}
            <rect x="60" y="8" width="6" height="8" fill="#94a3b8" />
            <rect x="60" y="24" width="6" height="8" fill="#94a3b8" />
          </g>

          {/* Wire: 9V to LM7805 */}
          <path
            d="M 106 72 L 140 72"
            stroke={circuit.txPowerOn ? '#ef4444' : '#475569'}
            strokeWidth="2"
            fill="none"
          />
          <text x="110" y="66" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono">+9V</text>

          {/* Ground Wire */}
          <path
            d="M 106 88 L 140 88"
            stroke="#475569"
            strokeWidth="2"
            fill="none"
          />

          {/* LM7805 Tx */}
          <g transform="translate(140, 50)" className="cursor-pointer" onClick={() => onSelectComponent('lm7805')}>
            <rect x="0" y="0" width="80" height="60" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
            <text x="14" y="24" fill="#0ea5e9" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">LM7805L</text>
            <text x="14" y="38" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">REGULATOR</text>
            <text x="14" y="50" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">OUT: +5.0V</text>

            {/* Pins */}
            <circle cx="0" cy="22" r="3" fill="#ef4444" />
            <circle cx="0" cy="38" r="3" fill="#475569" />
            <circle cx="80" cy="30" r="3" fill="#06b6d4" />
          </g>

          {/* Decoupling capacitor C1 */}
          <g transform="translate(235, 70)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#06b6d4" strokeWidth="2" />
            <line x1="-8" y1="10" x2="8" y2="10" stroke="#94a3b8" strokeWidth="2" />
            <line x1="-8" y1="14" x2="8" y2="14" stroke="#94a3b8" strokeWidth="2" />
            <line x1="0" y1="14" x2="0" y2="24" stroke="#475569" strokeWidth="2" />
            <text x="12" y="14" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">0.1µF</text>
          </g>

          {/* Wire: +5V from LM7805 to PAM8403 */}
          <path
            d="M 220 80 L 270 80 L 270 140"
            stroke={circuit.txPowerOn ? '#06b6d4' : '#475569'}
            strokeWidth="2.5"
            fill="none"
          />
          <text x="230" y="96" fill="#06b6d4" fontSize="8" fontFamily="JetBrains Mono">+5V VDD</text>

          {/* Audio Input AUX */}
          <g transform="translate(40, 180)">
            <rect x="0" y="0" width="70" height="50" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="10" y="24" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">AUX IN</text>
            <text x="10" y="38" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">3.5mm JACK</text>
          </g>

          {/* Wire: Audio In to PAM8403 */}
          <path
            d="M 110 205 L 160 205"
            stroke="#f59e0b"
            strokeWidth="2"
            fill="none"
          />
          <text x="115" y="198" fill="#f59e0b" fontSize="8" fontFamily="JetBrains Mono">L_IN (AC)</text>

          {/* PAM8403 Tx Pre-Amp & Modulator */}
          <g transform="translate(160, 140)" className="cursor-pointer" onClick={() => onSelectComponent('pam8403_tx')}>
            <rect
              x="0"
              y="0"
              width="120"
              height="110"
              rx="6"
              fill="#0f172a"
              stroke={isClipping ? '#f59e0b' : '#3b82f6'}
              strokeWidth="2"
            />
            <text x="16" y="26" fill="#3b82f6" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">PAM8403 Tx</text>
            <text x="16" y="42" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">CLASS-D MODULATOR</text>
            <text x="16" y="60" fill="#e2e8f0" fontSize="9" fontFamily="JetBrains Mono">
              Gain: {Math.round(circuit.txGain * 100)}%
            </text>
            {isClipping && (
              <text x="16" y="74" fill="#f59e0b" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">
                *RAIL CLIPPING*
              </text>
            )}
            <text x="16" y="96" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">PWM ~250kHz</text>

            {/* Terminal nodes */}
            <circle cx="0" cy="65" r="3.5" fill="#f59e0b" />
            <circle cx="110" cy="0" r="3.5" fill="#06b6d4" />
            <circle cx="120" cy="40" r="3.5" fill={laserColor} />
            <circle cx="120" cy="70" r="3.5" fill="#475569" />
          </g>

          {/* Modulated Drive to Laser */}
          <path
            d="M 280 180 L 330 180"
            stroke={laserColor}
            strokeWidth="2"
            fill="none"
          />
          <text x="286" y="172" fill={laserColor} fontSize="8" fontFamily="JetBrains Mono">L_OUT+ (AM)</text>

          {/* Semiconductor Laser Diode */}
          <g transform="translate(330, 160)" className="cursor-pointer" onClick={() => onSelectComponent('laser_diode')}>
            <rect x="0" y="0" width="70" height="50" rx="4" fill="#1e293b" stroke={laserColor} strokeWidth="2" />
            <text x="10" y="22" fill={laserColor} fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">LASER DIODE</text>
            <text x="10" y="36" fill="#f8fafc" fontSize="8" fontFamily="JetBrains Mono">{optical.wavelength} nm (5mW)</text>
            {/* Laser Diode Symbol */}
            <circle cx="58" cy="25" r="4" fill={laserColor} filter="url(#glow)" />
          </g>

          {/* ----------------- FREE-SPACE OPTICAL PATH ----------------- */}
          {/* Laser Beam path to Mirror */}
          {circuit.txPowerOn && (
            <line
              x1="400"
              y1="185"
              x2={optical.isBlocked ? "440" : "480"}
              y2="185"
              stroke={laserColor}
              strokeWidth="4"
              filter="url(#glow)"
            />
          )}

          {/* Obstacle if active */}
          {optical.isBlocked && (
            <g transform="translate(440, 150)">
              <rect x="0" y="0" width="12" height="70" rx="2" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
              <text x="-15" y="-6" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">OBSTACLE</text>
            </g>
          )}

          {/* Optical Mirror Reflector */}
          <g transform="translate(480, 185) rotate(-45)" className="cursor-pointer" onClick={() => onSelectComponent('mirror_reflector')}>
            <line x1="-30" y1="0" x2="30" y2="0" stroke="#38bdf8" strokeWidth="4" />
            <line x1="-30" y1="2" x2="30" y2="2" stroke="#64748b" strokeWidth="2" />
            <text x="-25" y="-10" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">MIRROR</text>
          </g>

          {/* Reflected Beam down to Solar Panel */}
          {isTransmitting && (
            <line
              x1="480"
              y1="185"
              x2="480"
              y2="280"
              stroke="url(#gradBeam)"
              strokeWidth="4"
              filter="url(#glow)"
            />
          )}

          {/* ----------------- RECEIVER SECTION ----------------- */}
          <rect
            x="500"
            y="20"
            width="400"
            height="360"
            rx="8"
            fill="rgba(15, 23, 42, 0.4)"
            stroke="#1e293b"
            strokeDasharray="4 4"
          />
          <text x="515" y="42" fill="#64748b" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">
            RECEIVER (Rx) SUBSYSTEM
          </text>

          {/* Solar Panel Detector */}
          <g transform="translate(450, 280)" className="cursor-pointer" onClick={() => onSelectComponent('solar_panel')}>
            <rect x="0" y="0" width="60" height="40" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2" />
            <text x="6" y="18" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">SOLAR CELL</text>
            <text x="6" y="30" fill="#64748b" fontSize="7" fontFamily="JetBrains Mono">PHOTOVOLTAIC</text>
            {isTransmitting && <circle cx="30" cy="20" r="6" fill={laserColor} filter="url(#glow)" />}
          </g>

          {/* DC Blocking Capacitor C_ac */}
          <g transform="translate(530, 290)">
            <line x1="0" y1="10" x2="16" y2="10" stroke="#f59e0b" strokeWidth="2" />
            <line x1="16" y1="2" x2="16" y2="18" stroke="#94a3b8" strokeWidth="2" />
            <line x1="20" y1="2" x2="20" y2="18" stroke="#94a3b8" strokeWidth="2" />
            <line x1="20" y1="10" x2="36" y2="10" stroke="#f59e0b" strokeWidth="2" />
            <text x="8" y="-2" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">10µF (AC COUPLE)</text>
          </g>

          {/* Rx LM7805 & 9V Battery */}
          <g transform="translate(560, 60)" className="cursor-pointer" onClick={() => onSelectComponent('lm7805')}>
            <rect x="0" y="0" width="60" height="40" rx="4" fill="#1e293b" stroke={circuit.rxPowerOn ? '#22c55e' : '#475569'} strokeWidth="1.5" />
            <text x="12" y="22" fill="#e2e8f0" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">9V BATT</text>
            <text x="15" y="33" fill={circuit.rxPowerOn ? '#22c55e' : '#64748b'} fontSize="8" fontFamily="JetBrains Mono">
              {circuit.rxPowerOn ? '9.0V DC' : 'OFF'}
            </text>
          </g>

          <g transform="translate(640, 50)" className="cursor-pointer" onClick={() => onSelectComponent('lm7805')}>
            <rect x="0" y="0" width="80" height="60" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
            <text x="14" y="24" fill="#0ea5e9" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">LM7805L</text>
            <text x="14" y="38" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">REGULATOR</text>
            <text x="14" y="50" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">OUT: +5.0V</text>
          </g>

          {/* Rx PAM8403 Power Amp */}
          <g transform="translate(580, 240)" className="cursor-pointer" onClick={() => onSelectComponent('pam8403_rx')}>
            <rect x="0" y="0" width="120" height="100" rx="6" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
            <text x="16" y="26" fill="#3b82f6" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">PAM8403 Rx</text>
            <text x="16" y="42" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">POWER AMPLIFIER</text>
            <text x="16" y="60" fill="#e2e8f0" fontSize="9" fontFamily="JetBrains Mono">
              Volume: {Math.round(circuit.rxGain * 100)}%
            </text>
            <text x="16" y="80" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">BTL 3W Output</text>
          </g>

          {/* Rx +5V Line */}
          <path
            d="M 720 80 L 740 80 L 740 200 L 670 200 L 670 240"
            stroke={circuit.rxPowerOn ? '#06b6d4' : '#475569'}
            strokeWidth="2.5"
            fill="none"
          />

          {/* Speaker Lines */}
          <path d="M 700 280 L 760 280" stroke="#f59e0b" strokeWidth="2" fill="none" />
          <path d="M 700 300 L 760 300" stroke="#475569" strokeWidth="2" fill="none" />
          <text x="705" y="272" fill="#f59e0b" fontSize="8" fontFamily="JetBrains Mono">SPK+ / SPK-</text>

          {/* 10W Dynamic Speaker */}
          <g transform="translate(760, 260)" className="cursor-pointer" onClick={() => onSelectComponent('speaker')}>
            <rect x="0" y="10" width="20" height="40" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <polygon points="20,10 50,-6 50,66 20,50" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
            <text x="0" y="70" fill="#f8fafc" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">10W 4Ω</text>
            <text x="0" y="82" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">SPEAKER</text>

            {isTransmitting && (
              <path
                d="M 58 15 A 15 15 0 0 1 58 45 M 68 8 A 25 25 0 0 1 68 52"
                stroke="#38bdf8"
                strokeWidth="2"
                fill="none"
              />
            )}
          </g>
        </svg>
      </div>

      <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between">
        <span>Click any hardware block above to inspect full internal schematics & pin assignments.</span>
        <span>AC Coupling: {circuit.acCoupled ? '10µF Active (Blocks DC)' : 'Direct DC (Saturates)'}</span>
      </div>
    </div>
  );
};
