export type AudioSourceType = 'sample_synthwave' | 'sample_acoustic' | 'sample_speech' | 'tone' | 'custom_file';

export type LaserWavelength = 650 | 532 | 405; // 650nm Red, 532nm Green, 405nm Violet

export interface OpticalParameters {
  distanceMeters: number;      // 0.2m - 15.0m
  reflectorAngleDeg: number;   // 30° - 60°, ideal is 45.0°
  isBlocked: boolean;          // Obstacle card placed in beam
  obstaclePosition: number;    // 0 - 100% along path
  ambientLightLux: number;     // 0 - 2000 Lux (adds 60Hz AC hum & DC noise)
  wavelength: LaserWavelength; // 650, 532, or 405 nm
}

export interface CircuitParameters {
  txGain: number;              // 0 - 1.0 (PAM8403 Tx Gain, >0.75 introduces clipping)
  rxGain: number;              // 0 - 1.0 (PAM8403 Rx Gain)
  txPowerOn: boolean;          // 9V Battery connected to LM7805 Tx
  rxPowerOn: boolean;          // 9V Battery connected to LM7805 Rx
  toneFrequency: number;       // 100 Hz - 5000 Hz
  toneType: OscillatorType;    // 'sine' | 'square' | 'sawtooth' | 'triangle'
  acCoupled: boolean;          // DC-blocking capacitor between solar panel & Rx amp
}

export interface TelemetryData {
  txVpp: number;               // Tx Peak-to-Peak Voltage (V)
  txVrms: number;              // Tx RMS Voltage (V)
  rxVpp: number;               // Rx Peak-to-Peak Voltage (V)
  rxVrms: number;              // Rx RMS Voltage (V)
  alignmentEfficiency: number; // 0 - 100%
  opticalPowerReceived: number;// mW
  estimatedSnrDb: number;      // Signal-to-Noise Ratio (dB)
  isClipping: boolean;         // True if Tx or Rx is saturating
  detectedFreq: number;        // Dominant frequency in Hz
}

export interface ComponentInfo {
  id: string;
  name: string;
  subtitle: string;
  category: 'Power' | 'Amplification' | 'Optics' | 'Detection' | 'Transducer';
  specs: { label: string; value: string }[];
  description: string;
  pinout: { pin: number; label: string; function: string }[];
  workingPrinciple: string;
  projectRole: string;
  schematicTip: string;
}
