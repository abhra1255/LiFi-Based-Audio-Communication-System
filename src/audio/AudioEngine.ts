import { AudioSourceType, CircuitParameters, OpticalParameters, TelemetryData } from '../types/simulator';

export class OpticalAudioEngine {
  private ctx: AudioContext | null = null;

  // Master Gain & Output
  private masterGain: GainNode | null = null;
  private speakerGain: GainNode | null = null;

  // Tx Chain
  private txSourceNode: AudioNode | null = null;
  private txPreampGain: GainNode | null = null;
  private txDistortionNode: WaveShaperNode | null = null;
  private txAnalyser: AnalyserNode | null = null;

  // Optical Channel
  private opticalGainNode: GainNode | null = null;
  private ambientNoiseGain: GainNode | null = null;
  private ambientHumOsc: OscillatorNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;

  // Rx Chain
  private solarCouplingFilter: BiquadFilterNode | null = null;
  private rxAmpGain: GainNode | null = null;
  private rxAnalyser: AnalyserNode | null = null;

  // State & Sources
  private isPlaying: boolean = false;
  private currentSourceType: AudioSourceType = 'sample_synthwave';
  private toneOsc: OscillatorNode | null = null;
  private customAudioBuffer: AudioBuffer | null = null;
  private customBufferSource: AudioBufferSourceNode | null = null;
  private synthLoopTimer: number | null = null;

  // Telemetry Cache
  private txTimeData: Uint8Array = new Uint8Array(1024);
  private rxTimeData: Uint8Array = new Uint8Array(1024);
  private txFreqData: Uint8Array = new Uint8Array(512);
  private rxFreqData: Uint8Array = new Uint8Array(512);

  constructor() {
    // Lazily init AudioContext upon user gesture
  }

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Setup Analysers
    this.txAnalyser = this.ctx.createAnalyser();
    this.txAnalyser.fftSize = 2048;
    this.txAnalyser.smoothingTimeConstant = 0.5;

    this.rxAnalyser = this.ctx.createAnalyser();
    this.rxAnalyser.fftSize = 2048;
    this.rxAnalyser.smoothingTimeConstant = 0.5;

    // Tx Preamp & WaveShaper
    this.txPreampGain = this.ctx.createGain();
    this.txPreampGain.gain.value = 0.6;

    this.txDistortionNode = this.ctx.createWaveShaper();
    this.updateDistortionCurve(0.6);

    // Optical Path Gain
    this.opticalGainNode = this.ctx.createGain();
    this.opticalGainNode.gain.value = 1.0;

    // Solar Panel AC Coupling Filter (removes DC carrier component)
    this.solarCouplingFilter = this.ctx.createBiquadFilter();
    this.solarCouplingFilter.type = 'highpass';
    this.solarCouplingFilter.frequency.value = 30; // 30Hz high-pass for AC coupling

    // Rx Amp Gain
    this.rxAmpGain = this.ctx.createGain();
    this.rxAmpGain.gain.value = 0.7;

    // Master Speaker Output
    this.speakerGain = this.ctx.createGain();
    this.speakerGain.gain.value = 0.8;

    // Ambient 60Hz Hum Generator
    this.ambientHumOsc = this.ctx.createOscillator();
    this.ambientHumOsc.type = 'sine';
    this.ambientHumOsc.frequency.value = 60; // 60Hz AC mains light flicker

    this.ambientNoiseGain = this.ctx.createGain();
    this.ambientNoiseGain.gain.value = 0.0;

    // Ambient White/Shot Noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }
    this.ambientNoiseSource = this.ctx.createBufferSource();
    this.ambientNoiseSource.buffer = noiseBuffer;
    this.ambientNoiseSource.loop = true;

    // Connect Ambient Light path
    const ambientMixer = this.ctx.createGain();
    ambientMixer.gain.value = 0.5;
    this.ambientHumOsc.connect(ambientMixer);
    this.ambientNoiseSource.connect(ambientMixer);
    ambientMixer.connect(this.ambientNoiseGain);

    // Audio Graph Wiring:
    // [Source] -> [txPreampGain] -> [txDistortionNode] -> [txAnalyser]
    //                                  |
    //                                  v
    //                         [opticalGainNode]
    //                                  |
    //                                  + <--- [ambientNoiseGain]
    //                                  v
    //                       [solarCouplingFilter]
    //                                  |
    //                                  v
    //                            [rxAmpGain] -> [rxAnalyser] -> [speakerGain] -> [destination]

    this.txPreampGain.connect(this.txDistortionNode);
    this.txDistortionNode.connect(this.txAnalyser);
    this.txDistortionNode.connect(this.opticalGainNode);

    this.opticalGainNode.connect(this.solarCouplingFilter);
    this.ambientNoiseGain.connect(this.solarCouplingFilter);

    this.solarCouplingFilter.connect(this.rxAmpGain);
    this.rxAmpGain.connect(this.rxAnalyser);
    this.rxAnalyser.connect(this.speakerGain);
    this.speakerGain.connect(this.ctx.destination);

    this.ambientHumOsc.start();
    this.ambientNoiseSource.start();
  }

  private updateDistortionCurve(gainRatio: number) {
    if (!this.txDistortionNode) return;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.max(1, (gainRatio - 0.7) * 40); // Soft overdrive if gain > 0.75
    const k = gainRatio > 0.75 ? deg : 1;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 1) {
        curve[i] = x;
      } else {
        curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
      }
    }
    this.txDistortionNode.curve = curve;
  }

  public async setAudioSource(
    sourceType: AudioSourceType,
    circuit: CircuitParameters,
    customFile?: File
  ) {
    this.init();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }

    this.stopCurrentSource();
    this.currentSourceType = sourceType;

    if (sourceType === 'tone') {
      this.startToneGenerator(circuit.toneFrequency, circuit.toneType);
    } else if (sourceType === 'custom_file' && customFile) {
      await this.loadCustomAudioFile(customFile);
    } else {
      this.startSyntheticTrack(sourceType);
    }

    this.isPlaying = true;
  }

  private stopCurrentSource() {
    if (this.toneOsc) {
      try {
        this.toneOsc.stop();
        this.toneOsc.disconnect();
      } catch {
        // Ignored
      }
      this.toneOsc = null;
    }
    if (this.customBufferSource) {
      try {
        this.customBufferSource.stop();
        this.customBufferSource.disconnect();
      } catch {
        // Ignored
      }
      this.customBufferSource = null;
    }
    if (this.synthLoopTimer !== null) {
      window.clearTimeout(this.synthLoopTimer);
      this.synthLoopTimer = null;
    }
  }

  private startToneGenerator(freq: number, type: OscillatorType) {
    if (!this.ctx || !this.txPreampGain) return;
    this.toneOsc = this.ctx.createOscillator();
    this.toneOsc.type = type;
    this.toneOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    this.toneOsc.connect(this.txPreampGain);
    this.toneOsc.start();
  }

  public updateToneFrequency(freq: number, type: OscillatorType) {
    if (this.toneOsc && this.ctx) {
      this.toneOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      this.toneOsc.type = type;
    }
  }

  public async loadCustomAudioFile(file: File) {
    if (!this.ctx || !this.txPreampGain) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.customAudioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.playCustomBuffer();
    } catch (err) {
      console.error('Failed to decode audio file:', err);
    }
  }

  private playCustomBuffer() {
    if (!this.ctx || !this.customAudioBuffer || !this.txPreampGain) return;
    this.customBufferSource = this.ctx.createBufferSource();
    this.customBufferSource.buffer = this.customAudioBuffer;
    this.customBufferSource.loop = true;
    this.customBufferSource.connect(this.txPreampGain);
    this.customBufferSource.start();
  }

  // Generative Synthesizer Tracks (Zero external CDN audio dependencies!)
  private startSyntheticTrack(type: AudioSourceType) {
    if (!this.ctx || !this.txPreampGain) return;

    if (type === 'sample_synthwave') {
      this.playSynthwaveSequence();
    } else if (type === 'sample_acoustic') {
      this.playAcousticSequence();
    } else if (type === 'sample_speech') {
      this.playSpeechSimulation();
    }
  }

  private playSynthwaveSequence() {
    if (!this.ctx || !this.txPreampGain || !this.isPlaying) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const tempo = 115;
    const sixteenth = 60 / tempo / 4;

    // 8-note synthwave bassline + lead riff
    // Key: D minor (D3: 146.83, F3: 174.61, G3: 196.00, A3: 220.00, C4: 261.63, D4: 293.66)
    const bassNotes = [146.83, 146.83, 174.61, 146.83, 196.0, 174.61, 146.83, 220.0];
    const leadNotes = [293.66, 349.23, 440.0, 392.0, 349.23, 293.66, 261.63, 293.66];

    for (let i = 0; i < 16; i++) {
      const time = now + i * sixteenth * 2;
      const bFreq = bassNotes[i % bassNotes.length];
      const lFreq = leadNotes[i % leadNotes.length];

      // Bass synth pulse
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sawtooth';
      bOsc.frequency.setValueAtTime(bFreq / 2, time);
      bGain.gain.setValueAtTime(0.3, time);
      bGain.gain.exponentialRampToValueAtTime(0.001, time + sixteenth * 1.8);
      bOsc.connect(bGain);
      bGain.connect(this.txPreampGain);
      bOsc.start(time);
      bOsc.stop(time + sixteenth * 2);

      // Lead bell chime
      if (i % 2 === 0) {
        const lOsc = ctx.createOscillator();
        const lGain = ctx.createGain();
        lOsc.type = 'triangle';
        lOsc.frequency.setValueAtTime(lFreq, time);
        lGain.gain.setValueAtTime(0.2, time);
        lGain.gain.exponentialRampToValueAtTime(0.001, time + sixteenth * 2.5);
        lOsc.connect(lGain);
        lGain.connect(this.txPreampGain);
        lOsc.start(time);
        lOsc.stop(time + sixteenth * 3);
      }
    }

    const loopDuration = 16 * sixteenth * 2 * 1000;
    this.synthLoopTimer = window.setTimeout(() => {
      if (this.isPlaying && this.currentSourceType === 'sample_synthwave') {
        this.playSynthwaveSequence();
      }
    }, loopDuration - 40);
  }

  private playAcousticSequence() {
    if (!this.ctx || !this.txPreampGain || !this.isPlaying) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chords = [
      [220.0, 261.63, 329.63, 440.0], // Am
      [174.61, 220.0, 261.63, 349.23], // F
      [261.63, 329.63, 392.0, 523.25], // C
      [196.0, 246.94, 293.66, 392.0],  // G
    ];

    chords.forEach((chord, chordIdx) => {
      const chordStart = now + chordIdx * 1.2;
      chord.forEach((freq, noteIdx) => {
        const time = chordStart + noteIdx * 0.25;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.9);
        osc.connect(gain);
        gain.connect(this.txPreampGain!);
        osc.start(time);
        osc.stop(time + 1.0);
      });
    });

    const loopDuration = chords.length * 1.2 * 1000;
    this.synthLoopTimer = window.setTimeout(() => {
      if (this.isPlaying && this.currentSourceType === 'sample_acoustic') {
        this.playAcousticSequence();
      }
    }, loopDuration - 40);
  }

  private playSpeechSimulation() {
    if (!this.ctx || !this.txPreampGain || !this.isPlaying) return;

    // Formant vocal vowel transitions simulating voice radio transmission
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const syllables = [
      { f0: 130, f1: 700, f2: 1200, dur: 0.3 }, // /a/
      { f0: 140, f1: 300, f2: 2200, dur: 0.35 }, // /i/
      { f0: 125, f1: 500, f2: 1000, dur: 0.4 }, // /o/
      { f0: 135, f1: 400, f2: 2000, dur: 0.35 }, // /e/
      { f0: 120, f1: 600, f2: 1500, dur: 0.45 }, // /u/
    ];

    let t = now;
    syllables.forEach((s) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(s.f0, t);

      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(s.f1, t);
      f1.Q.value = 6;

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(s.f2, t);
      f2.Q.value = 8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + s.dur);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(this.txPreampGain!);

      osc.start(t);
      osc.stop(t + s.dur);
      t += s.dur + 0.15;
    });

    const loopDuration = (t - now) * 1000;
    this.synthLoopTimer = window.setTimeout(() => {
      if (this.isPlaying && this.currentSourceType === 'sample_speech') {
        this.playSpeechSimulation();
      }
    }, loopDuration);
  }

  // Update physical transmission and circuit parameters continuously
  public updatePhysics(optical: OpticalParameters, circuit: CircuitParameters) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Tx Preamp & Distortion
    if (this.txPreampGain) {
      const effectiveTxGain = circuit.txPowerOn ? circuit.txGain : 0.0;
      this.txPreampGain.gain.setTargetAtTime(effectiveTxGain, now, 0.04);
      this.updateDistortionCurve(circuit.txGain);
    }

    // 2. Optical Transmission Calculation
    // Ideal mirror reflector angle is 45.0 degrees (giving 90 deg bounce).
    // As angle deviates, angular beam deflection doubles: Δθ_beam = 2 * Δθ_mirror.
    const angleErrorDeg = Math.abs(optical.reflectorAngleDeg - 45.0);
    // Gaussian beam alignment acceptance curve (standard solar cell acceptance angle ~ 2.5 deg)
    const alignmentFactor = Math.exp(-Math.pow(angleErrorDeg / 1.75, 2));

    // Distance path attenuation (inverse square & beam divergence)
    const distanceAttenuation = 1 / Math.pow(1 + 0.15 * optical.distanceMeters, 1.4);

    // Obstacle blocking
    const beamTransmissivity = optical.isBlocked ? 0.0 : 1.0;

    // Optical Wavelength factor (Silicon responsivity is slightly higher at 650nm Red ~0.45 A/W vs 532nm Green ~0.35 A/W)
    const wavelengthFactor = optical.wavelength === 650 ? 1.0 : optical.wavelength === 532 ? 0.85 : 0.7;

    // Combined optical coupling
    const netOpticalGain =
      circuit.txPowerOn && circuit.rxPowerOn
        ? alignmentFactor * distanceAttenuation * beamTransmissivity * wavelengthFactor
        : 0.0;

    if (this.opticalGainNode) {
      this.opticalGainNode.gain.setTargetAtTime(netOpticalGain, now, 0.03);
    }

    // 3. Ambient Light Noise Injection (60Hz hum + photodiode shot noise)
    if (this.ambientNoiseGain) {
      // Lux 0 - 2000 => scaled noise level (only active if Rx has power)
      const luxFraction = Math.min(1.0, optical.ambientLightLux / 2000);
      const ambientNoise = circuit.rxPowerOn ? luxFraction * 0.18 : 0.0;
      this.ambientNoiseGain.gain.setTargetAtTime(ambientNoise, now, 0.05);
    }

    // 4. Solar Cell DC-Coupling toggle
    if (this.solarCouplingFilter) {
      // If AC coupled, 30Hz high-pass removes DC and suppresses deep rumble
      // If DC coupled (no capacitor), ambient light causes massive low-frequency DC bias and clipping!
      this.solarCouplingFilter.frequency.setTargetAtTime(circuit.acCoupled ? 35 : 1, now, 0.05);
    }

    // 5. Rx PAM8403 Amplifier Gain
    if (this.rxAmpGain) {
      const effectiveRxGain = circuit.rxPowerOn ? circuit.rxGain * 1.5 : 0.0;
      this.rxAmpGain.gain.setTargetAtTime(effectiveRxGain, now, 0.04);
    }
  }

  public getTelemetry(optical: OpticalParameters, circuit: CircuitParameters): TelemetryData {
    if (!this.txAnalyser || !this.rxAnalyser) {
      return {
        txVpp: 0,
        txVrms: 0,
        rxVpp: 0,
        rxVrms: 0,
        alignmentEfficiency: 0,
        opticalPowerReceived: 0,
        estimatedSnrDb: 0,
        isClipping: false,
        detectedFreq: 0,
      };
    }

    (this.txAnalyser as any).getByteTimeDomainData(this.txTimeData);
    (this.rxAnalyser as any).getByteTimeDomainData(this.rxTimeData);
    (this.txAnalyser as any).getByteFrequencyData(this.txFreqData);
    (this.rxAnalyser as any).getByteFrequencyData(this.rxFreqData);

    // Calculate Tx Vpp & RMS
    let txMin = 255;
    let txMax = 0;
    let txSumSq = 0;
    for (let i = 0; i < this.txTimeData.length; i++) {
      const val = this.txTimeData[i];
      if (val < txMin) txMin = val;
      if (val > txMax) txMax = val;
      const normalized = (val - 128) / 128;
      txSumSq += normalized * normalized;
    }
    const txVpp = circuit.txPowerOn ? ((txMax - txMin) / 255) * 5.0 : 0;
    const txVrms = circuit.txPowerOn ? Math.sqrt(txSumSq / this.txTimeData.length) * 2.5 : 0;

    // Calculate Rx Vpp & RMS
    let rxMin = 255;
    let rxMax = 0;
    let rxSumSq = 0;
    for (let i = 0; i < this.rxTimeData.length; i++) {
      const val = this.rxTimeData[i];
      if (val < rxMin) rxMin = val;
      if (val > rxMax) rxMax = val;
      const normalized = (val - 128) / 128;
      rxSumSq += normalized * normalized;
    }
    const rxVpp = circuit.rxPowerOn ? ((rxMax - rxMin) / 255) * 5.0 : 0;
    const rxVrms = circuit.rxPowerOn ? Math.sqrt(rxSumSq / this.rxTimeData.length) * 2.5 : 0;

    // Alignment efficiency calculation
    const angleDiff = Math.abs(optical.reflectorAngleDeg - 45.0);
    const alignmentEfficiency = optical.isBlocked
      ? 0
      : Math.round(Math.exp(-Math.pow(angleDiff / 1.75, 2)) * 100);

    // Optical power calculation in mW (nominal 5mW laser)
    const distFactor = 1 / Math.pow(1 + 0.15 * optical.distanceMeters, 1.4);
    const opticalPowerReceived = circuit.txPowerOn && !optical.isBlocked
      ? Number((5.0 * (alignmentEfficiency / 100) * distFactor).toFixed(2))
      : 0;

    // Estimated SNR in dB
    const signalLevel = rxVrms;
    const noiseLevel = 0.005 + (optical.ambientLightLux / 2000) * 0.15;
    const snr = rxVrms > 0.008 ? Math.max(0, 20 * Math.log10(signalLevel / noiseLevel)) : 0;

    // Dominant frequency detection from FFT
    let maxBin = 0;
    let maxVal = 0;
    for (let i = 2; i < this.txFreqData.length / 2; i++) {
      if (this.txFreqData[i] > maxVal) {
        maxVal = this.txFreqData[i];
        maxBin = i;
      }
    }
    const nyquist = (this.ctx?.sampleRate || 44100) / 2;
    const detectedFreq = maxVal > 30 ? Math.round((maxBin / this.txFreqData.length) * nyquist) : 0;

    const isClipping = circuit.txGain > 0.85 || rxVpp > 4.6;

    return {
      txVpp: Number(txVpp.toFixed(2)),
      txVrms: Number(txVrms.toFixed(2)),
      rxVpp: Number(rxVpp.toFixed(2)),
      rxVrms: Number(rxVrms.toFixed(2)),
      alignmentEfficiency,
      opticalPowerReceived,
      estimatedSnrDb: Number(snr.toFixed(1)),
      isClipping,
      detectedFreq,
    };
  }

  public getTxTimeDomainData(out: Uint8Array) {
    if (this.txAnalyser) {
      (this.txAnalyser as any).getByteTimeDomainData(out);
    }
  }

  public getRxTimeDomainData(out: Uint8Array) {
    if (this.rxAnalyser) {
      (this.rxAnalyser as any).getByteTimeDomainData(out);
    }
  }

  public getTxFrequencyData(out: Uint8Array) {
    if (this.txAnalyser) {
      (this.txAnalyser as any).getByteFrequencyData(out);
    }
  }

  public getRxFrequencyData(out: Uint8Array) {
    if (this.rxAnalyser) {
      (this.rxAnalyser as any).getByteFrequencyData(out);
    }
  }

  public pause() {
    this.stopCurrentSource();
    this.isPlaying = false;
  }

  public resume(circuit: CircuitParameters) {
    this.setAudioSource(this.currentSourceType, circuit);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentSourceType(): AudioSourceType {
    return this.currentSourceType;
  }
}

// Global Singleton for the simulator session
export const audioEngine = new OpticalAudioEngine();
