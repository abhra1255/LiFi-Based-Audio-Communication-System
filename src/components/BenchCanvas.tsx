import React, { useRef, useEffect, useState } from 'react';
import { CircuitParameters, OpticalParameters, TelemetryData } from '../types/simulator';
import { audioEngine } from '../audio/AudioEngine';
import { Maximize2, MoveHorizontal, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';

interface BenchCanvasProps {
  optical: OpticalParameters;
  circuit: CircuitParameters;
  telemetry: TelemetryData;
  onSelectComponent: (componentId: string) => void;
  onUpdateMirrorAngle: (angle: number) => void;
  onToggleBlocked: () => void;
}

export const BenchCanvas: React.FC<BenchCanvasProps> = ({
  optical,
  circuit,
  telemetry,
  onSelectComponent,
  onUpdateMirrorAngle,
  onToggleBlocked,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingMirror, setIsDraggingMirror] = useState(false);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  // Optical laser color map
  const laserColor =
    optical.wavelength === 650
      ? { core: '#ffffff', glow: 'rgba(239, 68, 68, 0.85)', beam: '#ef4444', dim: '#7f1d1d' }
      : optical.wavelength === 532
      ? { core: '#ffffff', glow: 'rgba(34, 197, 94, 0.85)', beam: '#22c55e', dim: '#14532d' }
      : { core: '#ffffff', glow: 'rgba(168, 85, 247, 0.85)', beam: '#a855f7', dim: '#581c87' };

  // Track real-time audio time buffer for wave pulsation
  const audioSampleBuffer = useRef<Uint8Array>(new Uint8Array(256));

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      audioEngine.getRxTimeDomainData(audioSampleBuffer.current);

      // Determine instantaneous audio amplitude (0 to 1)
      let sampleSum = 0;
      for (let i = 0; i < audioSampleBuffer.current.length; i++) {
        sampleSum += Math.abs(audioSampleBuffer.current[i] - 128);
      }
      const rawInstAmp = sampleSum / audioSampleBuffer.current.length / 64; // ~0 to 1
      const instAmp = telemetry.opticalPowerReceived > 0 ? rawInstAmp : 0;

      // Ensure canvas matches high DPI
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Dark Laboratory Bench Grid Background
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, width, height);

      // Subtle optical breadboard tapped holes grid
      ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
      const gridStep = 24;
      for (let x = 12; x < width; x += gridStep) {
        for (let y = 12; y < height; y += gridStep) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Bench coordinate zones
      // Scale coordinates proportionally to width & height
      // Layout zones:
      // Left: Tx Station (Laptop AUX, 9V Battery, LM7805, PAM8403, Laser Emitter)
      // Top Right: Kinematic Optical Mirror
      // Bottom Right: Rx Station (Solar Panel, LM7805, PAM8403, 10W Loudspeaker)

      const txX = Math.max(40, width * 0.12);
      const txY = height * 0.28;

      const laserX = txX + 130;
      const laserY = txY + 18;

      const mirrorX = Math.min(width - 90, width * 0.68 + (optical.distanceMeters - 2) * 8);
      const mirrorY = txY + 18;

      const solarX = mirrorX;
      const solarY = height * 0.74;

      const speakerX = Math.max(50, width * 0.2);
      const speakerY = solarY + 10;

      // ----------------------------------------------------
      // DRAW TX HARDWARE MODULES
      // ----------------------------------------------------

      // AUX Source (Laptop / Smartphone)
      const phoneW = 75;
      const phoneH = 48;
      const phoneX = txX - 60;
      const phoneY = txY - 6;

      // Device body
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = hoveredComponent === 'aux' ? '#38bdf8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 6);
      ctx.fill();
      ctx.stroke();

      // Screen
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(phoneX + 6, phoneY + 6, phoneW - 12, phoneH - 12, 3);
      ctx.fill();

      // Screen Audio Waveform Animation
      if (audioEngine.getIsPlaying()) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < phoneW - 16; i += 3) {
          const wave = Math.sin(time * 6 + i * 0.4) * (instAmp * 8 + 3);
          const py = phoneY + phoneH / 2 + wave;
          if (i === 0) ctx.moveTo(phoneX + 8 + i, py);
          else ctx.lineTo(phoneX + 8 + i, py);
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px JetBrains Mono';
        ctx.fillText('PAUSED', phoneX + 16, phoneY + 28);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText('AUDIO IN', phoneX + 8, phoneY - 6);

      // AUX Audio Cable (Phone -> PAM8403 Tx)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -time * 15;
      ctx.beginPath();
      ctx.moveTo(phoneX + phoneW, phoneY + phoneH / 2);
      ctx.lineTo(txX + 25, txY + 18);
      ctx.stroke();
      ctx.setLineDash([]);

      // 9V Battery Tx
      const battW = 44;
      const battH = 34;
      const battX = txX - 50;
      const battY = txY + 60;

      ctx.fillStyle = circuit.txPowerOn ? '#1e293b' : '#0f172a';
      ctx.strokeStyle = circuit.txPowerOn ? '#22c55e' : '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(battX, battY, battW, battH, 3);
      ctx.fill();
      ctx.stroke();

      // Battery snap terminal
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(battX + battW, battY + 10, 4, 14);
      ctx.fillStyle = circuit.txPowerOn ? '#22c55e' : '#64748b';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.fillText('9V BATT', battX + 4, battY + 18);
      ctx.font = '8px JetBrains Mono';
      ctx.fillStyle = '#64748b';
      ctx.fillText(circuit.txPowerOn ? 'ACTIVE' : 'OFF', battX + 6, battY + 28);

      // Power wire from Battery to LM7805 (+9V Red)
      ctx.strokeStyle = circuit.txPowerOn ? '#ef4444' : '#450a0a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(battX + battW + 4, battY + 14);
      ctx.lineTo(txX - 10, battY + 14);
      ctx.lineTo(txX - 10, txY + 54);
      ctx.stroke();

      // Ground wire (Black)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(battX + battW + 4, battY + 24);
      ctx.lineTo(txX - 5, battY + 24);
      ctx.lineTo(txX - 5, txY + 58);
      ctx.stroke();

      // LM7805L Regulator Module Tx
      const lmX = txX - 12;
      const lmY = txY + 45;
      ctx.fillStyle = hoveredComponent === 'lm7805' ? '#0284c7' : '#1e293b';
      ctx.strokeStyle = circuit.txPowerOn ? '#0ea5e9' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(lmX, lmY, 26, 28, 3);
      ctx.fill();
      ctx.stroke();

      // Heatsink tab
      ctx.fillStyle = '#64748b';
      ctx.fillRect(lmX + 4, lmY - 5, 18, 5);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '8px JetBrains Mono';
      ctx.fillText('7805', lmX + 3, lmY + 14);
      ctx.fillText('+5V', lmX + 5, lmY + 24);

      // +5V Regulated Power Rail Line to PAM8403
      ctx.strokeStyle = circuit.txPowerOn ? '#06b6d4' : '#164e63';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(lmX + 26, lmY + 14);
      ctx.lineTo(txX + 25, lmY + 14);
      ctx.lineTo(txX + 25, txY + 36);
      ctx.stroke();

      // PAM8403 Tx Module Board
      const pamX = txX + 20;
      const pamY = txY - 4;
      const pamW = 48;
      const pamH = 50;

      ctx.fillStyle = hoveredComponent === 'pam8403_tx' ? '#1e3a8a' : '#0f172a';
      ctx.strokeStyle = circuit.txGain > 0.85 ? '#f59e0b' : '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pamX, pamY, pamW, pamH, 4);
      ctx.fill();
      ctx.stroke();

      // PAM8403 Chip & Potentiometer
      ctx.fillStyle = '#020617';
      ctx.fillRect(pamX + 12, pamY + 10, 24, 14);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7px JetBrains Mono';
      ctx.fillText('PAM8403', pamX + 14, pamY + 19);

      // Volume Pot Knob
      const potAngle = (circuit.txGain - 0.5) * Math.PI * 1.5;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(pamX + 24, pamY + 36, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pamX + 24, pamY + 36);
      ctx.lineTo(pamX + 24 + Math.cos(potAngle) * 7, pamY + 36 + Math.sin(potAngle) * 7);
      ctx.stroke();

      // Power status LED
      ctx.fillStyle = circuit.txPowerOn ? '#22c55e' : '#475569';
      ctx.beginPath();
      ctx.arc(pamX + 8, pamY + 8, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText('TX MOD', pamX + 6, pamY - 8);

      // Connection from PAM8403 to Laser Diode
      ctx.strokeStyle = laserColor.beam;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pamX + pamW, pamY + 22);
      ctx.lineTo(laserX - 16, laserY);
      ctx.stroke();

      // Laser Diode Module Housing
      ctx.fillStyle = hoveredComponent === 'laser_diode' ? '#334155' : '#1e293b';
      ctx.strokeStyle = laserColor.beam;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(laserX - 16, laserY - 14, 28, 28, 4);
      ctx.fill();
      ctx.stroke();

      // Brass lens barrel
      ctx.fillStyle = '#d97706';
      ctx.fillRect(laserX + 12, laserY - 8, 8, 16);

      // Laser aperture indicator
      ctx.fillStyle = laserColor.beam;
      ctx.beginPath();
      ctx.arc(laserX + 20, laserY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Laser label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(`${optical.wavelength}nm`, laserX - 12, laserY + 26);
      ctx.fillText('LASER', laserX - 10, laserY + 37);

      // ----------------------------------------------------
      // FREE-SPACE OPTICAL BEAM & MIRROR RAY TRACE
      // ----------------------------------------------------

      const angleRad = (optical.reflectorAngleDeg * Math.PI) / 180;
      // Mirror surface line geometry: centered at (mirrorX, mirrorY)
      const mirrorHalfLen = 30;
      const mDx = Math.cos(angleRad) * mirrorHalfLen;
      const mDy = Math.sin(angleRad) * mirrorHalfLen;

      // Obstacle Card Position
      const obsFraction = 0.55;
      const obsX = laserX + (mirrorX - laserX) * obsFraction;
      const obsY = laserY;

      // 1. First Leg: Laser Emitter -> Mirror (or Obstacle)
      const beamEndX = optical.isBlocked ? obsX : mirrorX;
      const beamEndY = laserY;

      if (circuit.txPowerOn) {
        // Laser Core Beam with dynamic intensity fluctuation
        const modulationFlicker = 0.8 + instAmp * 0.4;

        // Outer glow
        ctx.strokeStyle = laserColor.glow;
        ctx.lineWidth = 6 * modulationFlicker;
        ctx.beginPath();
        ctx.moveTo(laserX + 20, laserY);
        ctx.lineTo(beamEndX, beamEndY);
        ctx.stroke();

        // Inner sharp beam
        ctx.strokeStyle = laserColor.core;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(laserX + 20, laserY);
        ctx.lineTo(beamEndX, beamEndY);
        ctx.stroke();

        // Animated photon wave packets
        ctx.fillStyle = laserColor.beam;
        for (let i = 0; i < 6; i++) {
          const packetX =
            laserX + 20 + (((time * 180 + i * 50) % (beamEndX - laserX - 20)) + (beamEndX - laserX - 20)) % (beamEndX - laserX - 20);
          ctx.beginPath();
          ctx.arc(packetX, laserY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Obstacle if inserted
      if (optical.isBlocked) {
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(obsX - 6, obsY - 32, 12, 64, 4);
        ctx.fill();
        ctx.stroke();

        // Obstacle label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px JetBrains Mono';
        ctx.fillText('BLOCKED', obsX - 22, obsY - 38);

        // Beam scatter flare on card surface
        if (circuit.txPowerOn) {
          ctx.fillStyle = laserColor.glow;
          ctx.beginPath();
          ctx.arc(obsX - 6, obsY, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Optical Mirror Component
      ctx.save();
      ctx.translate(mirrorX, mirrorY);

      // Kinematic Gimbal Mount Ring
      ctx.strokeStyle = isDraggingMirror ? '#38bdf8' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();

      // Protractor angle degree ticks
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32);
        ctx.lineTo(Math.cos(a) * 36, Math.sin(a) * 36);
        ctx.stroke();
      }

      // Mirror Glass Substrate
      ctx.rotate(angleRad);
      ctx.fillStyle = hoveredComponent === 'mirror_reflector' ? '#38bdf8' : '#e2e8f0';
      ctx.fillRect(-mirrorHalfLen, -3, mirrorHalfLen * 2, 6);

      // Backing metal
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-mirrorHalfLen, 3, mirrorHalfLen * 2, 3);

      // Surface Normal Vector
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -35);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      // Mirror Angle Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`MIRROR: ${optical.reflectorAngleDeg.toFixed(1)}°`, mirrorX - 35, mirrorY - 44);
      if (Math.abs(optical.reflectorAngleDeg - 45.0) < 0.5) {
        ctx.fillStyle = '#22c55e';
        ctx.fillText('OPTIMAL (45°)', mirrorX - 35, mirrorY - 55);
      }

      // 2. Second Leg: Reflected Beam from Mirror down to Solar Panel
      // Law of Reflection:
      // Incident ray is along +X direction: (1, 0)
      // Mirror is at angle optical.reflectorAngleDeg.
      // Normal vector is n = (-sin(angle), cos(angle)).
      // Reflection vector v_refl = v_in - 2*(v_in . n)*n
      if (circuit.txPowerOn && !optical.isBlocked) {
        // Reflection angle formula:
        // When mirror is 45°, reflection is straight down 90°.
        // For general mirror angle θ: reflected ray angle = 2 * θ
        const reflAngleRad = 2 * angleRad;
        const reflDx = Math.cos(reflAngleRad);
        const reflDy = Math.sin(reflAngleRad);

        const pathLength = solarY - mirrorY;
        const hitX = mirrorX + (reflDx / (reflDy || 0.001)) * pathLength;
        const hitY = solarY;

        // Draw reflected beam
        ctx.strokeStyle = laserColor.glow;
        ctx.lineWidth = 6 * (0.8 + instAmp * 0.4);
        ctx.beginPath();
        ctx.moveTo(mirrorX, mirrorY);
        ctx.lineTo(hitX, hitY);
        ctx.stroke();

        ctx.strokeStyle = laserColor.core;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mirrorX, mirrorY);
        ctx.lineTo(hitX, hitY);
        ctx.stroke();

        // Check if hit point strikes Solar Panel aperture
        const solarApertureW = 55;
        const isHit = Math.abs(hitX - solarX) < solarApertureW / 2;

        if (isHit) {
          // Photon absorption glow on solar panel!
          ctx.fillStyle = laserColor.glow;
          ctx.beginPath();
          ctx.arc(hitX, hitY, 12 + instAmp * 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = laserColor.core;
          ctx.beginPath();
          ctx.arc(hitX, hitY, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Beam misses solar panel!
          ctx.fillStyle = '#f59e0b';
          ctx.font = '9px JetBrains Mono';
          ctx.fillText('MISALIGNED BEAM', hitX - 45, hitY + 20);
        }
      }

      // ----------------------------------------------------
      // DRAW RX HARDWARE MODULES
      // ----------------------------------------------------

      // Solar Panel Detector
      const spW = 60;
      const spH = 34;
      const spX = solarX - spW / 2;
      const spY = solarY - 6;

      // Ambient Light Gradient Overlay on Solar Panel
      if (optical.ambientLightLux > 100) {
        const ambAlpha = Math.min(0.4, optical.ambientLightLux / 2500);
        const ambGrad = ctx.createRadialGradient(solarX, solarY, 5, solarX, solarY, 60);
        ambGrad.addColorStop(0, `rgba(253, 224, 71, ${ambAlpha})`);
        ambGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = ambGrad;
        ctx.beginPath();
        ctx.arc(solarX, solarY, 60, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = hoveredComponent === 'solar_panel' ? '#1e3a8a' : '#0f172a';
      ctx.strokeStyle = telemetry.alignmentEfficiency > 50 ? '#38bdf8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(spX, spY, spW, spH, 4);
      ctx.fill();
      ctx.stroke();

      // Polycrystalline silicon texture (grid lines)
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(spX + (spW / 4) * i, spY + 3);
        ctx.lineTo(spX + (spW / 4) * i, spY + spH - 3);
        ctx.stroke();
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.6;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(spX + 3, spY + (spH / 5) * i);
        ctx.lineTo(spX + spW - 3, spY + (spH / 5) * i);
        ctx.stroke();
      }

      ctx.fillStyle = '#f8fafc';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText('SOLAR CELL', spX + 4, spY - 6);

      // Signal line from Solar Panel to Rx PAM8403
      const rxPamX = solarX - 140;
      const rxPamY = solarY - 14;

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.lineDashOffset = -time * 12;
      ctx.beginPath();
      ctx.moveTo(spX, spY + spH / 2);
      ctx.lineTo(rxPamX + 48, rxPamY + 22);
      ctx.stroke();
      ctx.setLineDash([]);

      // 9V Battery Rx & LM7805 Rx
      const rxBattX = rxPamX + 60;
      const rxBattY = solarY + 45;

      ctx.fillStyle = circuit.rxPowerOn ? '#1e293b' : '#0f172a';
      ctx.strokeStyle = circuit.rxPowerOn ? '#22c55e' : '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(rxBattX, rxBattY, 40, 28, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = circuit.rxPowerOn ? '#22c55e' : '#64748b';
      ctx.font = '8px JetBrains Mono';
      ctx.fillText('9V RX', rxBattX + 8, rxBattY + 18);

      // Rx LM7805
      const rxLmX = rxPamX + 15;
      const rxLmY = solarY + 42;
      ctx.fillStyle = hoveredComponent === 'lm7805' ? '#0284c7' : '#1e293b';
      ctx.strokeStyle = circuit.rxPowerOn ? '#0ea5e9' : '#334155';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(rxLmX, rxLmY, 26, 26, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '7px JetBrains Mono';
      ctx.fillText('7805', rxLmX + 4, rxLmY + 12);
      ctx.fillText('+5V', rxLmX + 6, rxLmY + 22);

      // Power line to Rx PAM8403
      ctx.strokeStyle = circuit.rxPowerOn ? '#06b6d4' : '#164e63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rxLmX + 13, rxLmY);
      ctx.lineTo(rxLmX + 13, rxPamY + 46);
      ctx.stroke();

      // Rx PAM8403 Amp Module
      ctx.fillStyle = hoveredComponent === 'pam8403_rx' ? '#1e3a8a' : '#0f172a';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rxPamX, rxPamY, 48, 50, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#020617';
      ctx.fillRect(rxPamX + 12, rxPamY + 10, 24, 14);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7px JetBrains Mono';
      ctx.fillText('PAM8403', rxPamX + 14, rxPamY + 19);

      // Rx Volume Knob
      const rxPotAngle = (circuit.rxGain - 0.5) * Math.PI * 1.5;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(rxPamX + 24, rxPamY + 36, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rxPamX + 24, rxPamY + 36);
      ctx.lineTo(rxPamX + 24 + Math.cos(rxPotAngle) * 7, rxPamY + 36 + Math.sin(rxPotAngle) * 7);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText('RX AMP', rxPamX + 6, rxPamY - 8);

      // Speaker Cable from PAM8403 to Loudspeaker
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rxPamX, rxPamY + 20);
      ctx.lineTo(speakerX + 38, speakerY + 10);
      ctx.stroke();

      // ----------------------------------------------------
      // 10W LOUDSPEAKER WITH DYNAMIC PULSATING CONE
      // ----------------------------------------------------
      const spkRadius = 38;
      const conePulsation = instAmp * 7 * Math.sin(time * 25);

      ctx.save();
      ctx.translate(speakerX, speakerY);

      // Outer speaker basket
      ctx.fillStyle = hoveredComponent === 'speaker' ? '#334155' : '#1e293b';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, spkRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rubber surround
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, spkRadius - 6, 0, Math.PI * 2);
      ctx.fill();

      // Pulsating Paper Cone
      const coneR = Math.max(10, spkRadius - 12 + conePulsation);
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, coneR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dust cap (center dome)
      const domeR = Math.max(4, 9 + conePulsation * 0.5);
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, domeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Radiating Acoustic Wave Arcs when audio is playing and unblocked!
      if (instAmp > 0.05 && circuit.rxPowerOn) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 2;
        for (let w = 1; w <= 3; w++) {
          const arcR = spkRadius + ((time * 40 + w * 22) % 65);
          const arcAlpha = Math.max(0, 1 - arcR / 110);
          ctx.strokeStyle = `rgba(56, 189, 248, ${arcAlpha})`;
          ctx.beginPath();
          ctx.arc(0, 0, arcR, -Math.PI * 0.6, Math.PI * 0.6);
          ctx.stroke();
        }
      }

      ctx.restore();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText('10W LOUDSPEAKER', speakerX - 44, speakerY + spkRadius + 16);

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [optical, circuit, telemetry, hoveredComponent, isDraggingMirror]);

  // Direct canvas mouse interactions: dragging mirror angle & clicking components
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const mirrorX = Math.min(width - 90, width * 0.68 + (optical.distanceMeters - 2) * 8);
    const mirrorY = height * 0.28 + 18;

    // Check if clicked near mirror
    const distToMirror = Math.hypot(x - mirrorX, y - mirrorY);
    if (distToMirror < 45) {
      setIsDraggingMirror(true);
      return;
    }

    // Check clickable components
    const txX = Math.max(40, width * 0.12);
    const txY = height * 0.28;
    const solarX = mirrorX;
    const solarY = height * 0.74;
    const speakerX = Math.max(50, width * 0.2);
    const speakerY = solarY + 10;

    if (Math.hypot(x - (txX - 12), y - (txY + 54)) < 25) {
      onSelectComponent('lm7805');
    } else if (Math.hypot(x - (txX + 44), y - (txY + 22)) < 30) {
      onSelectComponent('pam8403_tx');
    } else if (Math.hypot(x - (txX + 130), y - (txY + 18)) < 25) {
      onSelectComponent('laser_diode');
    } else if (Math.hypot(x - solarX, y - solarY) < 35) {
      onSelectComponent('solar_panel');
    } else if (Math.hypot(x - (solarX - 116), y - (solarY + 11)) < 30) {
      onSelectComponent('pam8403_rx');
    } else if (Math.hypot(x - speakerX, y - speakerY) < 45) {
      onSelectComponent('speaker');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const mirrorX = Math.min(width - 90, width * 0.68 + (optical.distanceMeters - 2) * 8);
    const mirrorY = height * 0.28 + 18;

    if (isDraggingMirror) {
      // Calculate angle from mirror center to mouse pointer
      const dx = x - mirrorX;
      const dy = y - mirrorY;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      // Clamp between 30 and 60 degrees for realistic alignment
      const clamped = Math.max(30, Math.min(60, angle));
      onUpdateMirrorAngle(Number(clamped.toFixed(1)));
    } else {
      // Update hovered component for cursor cue
      const distToMirror = Math.hypot(x - mirrorX, y - mirrorY);
      if (distToMirror < 45) {
        setHoveredComponent('mirror_reflector');
        return;
      }

      const txX = Math.max(40, width * 0.12);
      const txY = height * 0.28;
      const solarX = mirrorX;
      const solarY = height * 0.74;
      const speakerX = Math.max(50, width * 0.2);
      const speakerY = solarY + 10;

      if (Math.hypot(x - (txX - 12), y - (txY + 54)) < 25) {
        setHoveredComponent('lm7805');
      } else if (Math.hypot(x - (txX + 44), y - (txY + 22)) < 30) {
        setHoveredComponent('pam8403_tx');
      } else if (Math.hypot(x - (txX + 130), y - (txY + 18)) < 25) {
        setHoveredComponent('laser_diode');
      } else if (Math.hypot(x - solarX, y - solarY) < 35) {
        setHoveredComponent('solar_panel');
      } else if (Math.hypot(x - (solarX - 116), y - (solarY + 11)) < 30) {
        setHoveredComponent('pam8403_rx');
      } else if (Math.hypot(x - speakerX, y - speakerY) < 45) {
        setHoveredComponent('speaker');
      } else {
        setHoveredComponent(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingMirror(false);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[440px] select-none bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      {/* Top HUD Telemetry Overlay */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-10 text-xs font-mono">
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700">
          <span className="text-slate-400">ALIGNMENT:</span>
          <span
            className={`font-semibold tabular-nums ${
              telemetry.alignmentEfficiency > 80
                ? 'text-emerald-400'
                : telemetry.alignmentEfficiency > 30
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {telemetry.alignmentEfficiency}%
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">FLUX:</span>
          <span className="text-cyan-400 font-semibold tabular-nums">{telemetry.opticalPowerReceived} mW</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">PATH:</span>
          <span className="text-slate-200 tabular-nums">{optical.distanceMeters.toFixed(1)} m</span>
        </div>

        {/* Quick Action Badges */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => onUpdateMirrorAngle(45.0)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600 transition-colors"
            title="Auto-align reflector to perfect 45.0 degrees"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Align 45°</span>
          </button>
          <button
            onClick={onToggleBlocked}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              optical.isBlocked
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
            }`}
            title="Insert hand/card into beam to simulate blockage"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{optical.isBlocked ? 'Remove Block' : 'Block Beam'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full ${
          isDraggingMirror
            ? 'cursor-grabbing'
            : hoveredComponent === 'mirror_reflector'
            ? 'cursor-grab'
            : hoveredComponent
            ? 'cursor-pointer'
            : 'cursor-crosshair'
        }`}
      />

      {/* Floating Canvas Hint */}
      <div className="absolute bottom-3 left-4 text-[11px] font-mono text-slate-400 pointer-events-none flex items-center gap-2 bg-slate-900/70 px-2.5 py-1 rounded border border-slate-800">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Tip: Drag mirror to aim · Click any hardware IC to inspect pinouts</span>
      </div>
    </div>
  );
};
