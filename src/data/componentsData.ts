import { ComponentInfo } from '../types/simulator';

export const COMPONENTS_DATA: Record<string, ComponentInfo> = {
  lm7805: {
    id: 'lm7805',
    name: 'UTC LM7805L / 7805',
    subtitle: 'Positive 3-Terminal Linear Voltage Regulator (+5V DC, 1.5A)',
    category: 'Power',
    specs: [
      { label: 'Input Voltage Range', value: '7.0V – 25.0V DC (9V Battery used)' },
      { label: 'Regulated Output', value: '+5.0V DC (±4%)' },
      { label: 'Maximum Output Current', value: '1.5A (Heatsink recommended)' },
      { label: 'Dropout Voltage', value: '~2.0V at 1A' },
      { label: 'Quiescent Current', value: '5.0 mA' },
      { label: 'Ripple Rejection', value: '78 dB at 120 Hz' },
    ],
    description:
      'The LM7805 is a monolithic integrated linear voltage regulator with internal thermal overload protection and short-circuit current limiting. In this communicator circuit, two separate LM7805 regulators step down raw 9V alkaline battery voltages down to a clean, transient-free +5V DC rail for the PAM8403 amplifiers and laser bias network.',
    pinout: [
      { pin: 1, label: 'INPUT (IN)', function: 'Connects to positive terminal of 9V Battery (+9V DC). Requires 0.33µF decoupling cap to ground.' },
      { pin: 2, label: 'GROUND (GND)', function: 'Common circuit ground return (Battery negative & chassis heatsink tab).' },
      { pin: 3, label: 'OUTPUT (OUT)', function: 'Regulated +5.0V DC supply rail feeding PAM8403 VDD and Laser bias. Bypassed with 0.1µF ceramic cap.' },
    ],
    workingPrinciple:
      'Linear series-pass regulation using a Zener bandgap voltage reference, error amplifier, and an internal NPN pass transistor. The pass transistor absorbs the excess voltage drop (9V - 5V = 4V). Power dissipation follows Pd = (Vin - Vout) × Iload. At 250mA load, Pd = 1.0W of heat.',
    projectRole:
      'Provides isolated +5V power rails for both the Transmitter (Tx) and Receiver (Rx) modules to prevent ground loops and protect delicate PAM8403 ICs from 9V battery voltage sag and transient spikes.',
    schematicTip:
      'Always place a 100nF (0.1µF) ceramic capacitor close to Pin 3 (Output) to prevent high-frequency oscillations, and heatsink the TO-220 tab if driving high volume!',
  },
  pam8403_tx: {
    id: 'pam8403_tx',
    name: 'PAM8403 (Tx Pre-Amplifier & Modulator)',
    subtitle: 'Filterless 3W+3W Class-D Stereo Audio Amplifier Module',
    category: 'Amplification',
    specs: [
      { label: 'Supply Voltage (VDD)', value: '+2.5V – +5.5V DC (5V provided by LM7805)' },
      { label: 'Output Power', value: '3.0W into 4Ω at 10% THD' },
      { label: 'Modulation Architecture', value: 'Class-D Bridge-Tied Load (BTL) PWM (~250 kHz)' },
      { label: 'Efficiency', value: '> 90% (negligible heat generated)' },
      { label: 'Signal-to-Noise Ratio', value: '80 dB' },
      { label: 'Built-in Potentiometer', value: 'Volume switch with integrated mute' },
    ],
    description:
      'The PAM8403 is a high-efficiency Class-D audio amplifier that converts low-level line audio from a laptop/phone into an amplified differential voltage. On the Transmitter side, the left output channel (L_OUT+ and L_OUT-) directly modulates the operating forward current through the laser diode.',
    pinout: [
      { pin: 1, label: 'VDD (+5V)', function: 'Positive DC power from LM7805 Output.' },
      { pin: 2, label: 'GND', function: 'Power supply ground return.' },
      { pin: 3, label: 'L_IN / R_IN', function: 'Audio signal from 3.5mm AUX headphone jack (Left channel utilized).' },
      { pin: 4, label: 'L_OUT+ / L_OUT-', function: 'Modulated audio output connected across the Laser Diode in series with current-limiting resistor.' },
      { pin: 5, label: 'MUTE / SHDN', function: 'Active-low shutdown pins tied high to VDD for continuous transmission.' },
    ],
    workingPrinciple:
      'Class-D amplification samples the incoming analog audio waveform at ~250 kHz against an internal triangle wave to generate pulse-width modulated (PWM) switching signals. The average voltage delivered to the laser fluctuates synchronously with audio frequency and amplitude.',
    projectRole:
      'Pre-amplifies weak millivolt AUX audio signals to modulate the laser diode forward current between laser threshold and maximum safe optical flux.',
    schematicTip:
      'To prevent clipping distortion, set the PAM8403 input potentiometer below 75% rotation so the laser diode remains in its linear optical emission regime.',
  },
  laser_diode: {
    id: 'laser_diode',
    name: 'Semiconductor Laser Diode Module',
    subtitle: 'Coherent Optical Emitter (650nm Red / 532nm Green, 5mW Class 3R)',
    category: 'Optics',
    specs: [
      { label: 'Optical Wavelength (λ)', value: '650 nm (Red) or 532 nm (DPSS Green)' },
      { label: 'Output Optical Power', value: '3 mW – 5 mW CW (Class 3R compliant)' },
      { label: 'Operating Voltage (Vf)', value: '2.8V – 3.2V DC forward threshold' },
      { label: 'Threshold Current (Ith)', value: '18 mA – 25 mA' },
      { label: 'Beam Divergence (θ)', value: '< 1.5 mrad with brass collimating lens' },
      { label: 'Modulation Bandwidth', value: '> 100 MHz (easily handles 20Hz–20kHz audio)' },
    ],
    description:
      'The laser diode is the optical transmitter transducer. When biased slightly above its threshold current (Ith) and driven by the PAM8403 audio output, the emitted photon flux (optical intensity) varies linearly with the instantaneous audio voltage, creating an Amplitude Modulated (AM) free-space optical link.',
    pinout: [
      { pin: 1, label: 'LD Anode (+)', function: 'Positive terminal connecting through a 100Ω current limiter to PAM8403 audio output.' },
      { pin: 2, label: 'LD Cathode (-)', function: 'Connected to negative modulation return / ground.' },
      { pin: 3, label: 'PD Cathode (Case)', function: 'Monitor photodiode feedback connection (grounded in standard modules).' },
    ],
    workingPrinciple:
      'Stimulated emission of photons within an AlGaInP quantum well semiconductor cavity. Above the threshold current (Ith), output optical power P_opt increases with high differential quantum efficiency: P_opt = η × (I_f - I_th). Audio voltage modulates I_f, creating optical AM audio.',
    projectRole:
      'Serves as the high-speed optical carrier. Its coherent, low-divergence beam allows audio signals to travel across free space over dozens of meters without fiber optic cabling.',
    schematicTip:
      'Laser diodes are highly sensitive to reverse voltage and electrostatic discharge (ESD). A 1N4148 reverse diode across the terminals prevents reverse-bias breakdown.',
  },
  mirror_reflector: {
    id: 'mirror_reflector',
    name: 'Precision First-Surface Optical Mirror',
    subtitle: 'Front-Surface Aluminized Dielectric Reflector',
    category: 'Optics',
    specs: [
      { label: 'Reflectivity (R)', value: '> 96% at 650 nm / 532 nm' },
      { label: 'Reflector Type', value: 'First-surface (no secondary ghost reflections)' },
      { label: 'Kinematic Tilt Range', value: '±15° dual-axis micrometric gimbal' },
      { label: 'Target Alignment Angle', value: '45.0° (90° total beam fold deflection)' },
    ],
    description:
      'The optical mirror allows steering the laser beam around obstacles or aligning the transmission path between arbitrary transmitter and receiver locations. By adjusting the mirror tilt angle, the beam can be targeted precisely onto the active photosensitive area of the solar panel.',
    pinout: [
      { pin: 1, label: 'Mechanical Axis', function: 'Kinematic spring-loaded swivel mount with fine-pitch pitch/yaw thumb screws.' },
      { pin: 2, label: 'Reflective Surface', function: 'Protected aluminum vapor coating on optical grade float glass.' },
    ],
    workingPrinciple:
      'Law of Specular Reflection: The angle of incidence equals the angle of reflection (θ_i = θ_r) measured relative to the mirror surface normal. If the mirror is tilted by Δθ, the reflected beam angle changes by 2 × Δθ.',
    projectRole:
      'Redirects the laser beam onto the solar cell. Demonstrates how optical Li-Fi links require precise beam pointing; even a 1-degree misalignment causes the beam to miss the receiver, silencing the speaker.',
    schematicTip:
      'In classroom demonstrations, use an index card to trace the laser spot from the mirror surface to the center of the solar panel detector.',
  },
  solar_panel: {
    id: 'solar_panel',
    name: 'Photovoltaic Solar Panel Detector',
    subtitle: 'Multi-Crystalline Silicon Photodiode Array (0.5V – 5V open circuit)',
    category: 'Detection',
    specs: [
      { label: 'Active Photosensitive Area', value: '55 mm × 55 mm' },
      { label: 'Spectral Responsivity (R_λ)', value: '0.45 A/W at 650 nm (Red) / 0.35 A/W at 532 nm' },
      { label: 'Open Circuit Voltage (Voc)', value: '2.5V DC in room light' },
      { label: 'AC Audio Coupling', value: '10 µF electrolytic capacitor removes DC bias' },
      { label: 'Frequency Response', value: '10 Hz to 18 kHz (Audio band)' },
    ],
    description:
      'A compact silicon photovoltaic cell array acts as a wide-area photodetector. When the modulated laser beam strikes the silicon junction, photons generate electron-hole pairs, producing a fluctuating photocurrent that tracks the original audio waveform. The DC component (from ambient light and laser bias) is filtered out by an AC coupling capacitor, passing only pure AC audio to the receiver amplifier.',
    pinout: [
      { pin: 1, label: 'Positive (+) Anode', function: 'Connects to 10µF DC-blocking capacitor leading to Rx PAM8403 Left Input.' },
      { pin: 2, label: 'Negative (-) Cathode', function: 'Connects to common Receiver Ground (GND).' },
    ],
    workingPrinciple:
      'Photoelectric effect within a p-n semiconductor junction. Incident photons with energy hν > E_g (1.1 eV for silicon) generate free electron-hole pairs swept by the built-in depletion field. The resulting photocurrent I_ph is directly proportional to incident optical power P_opt.',
    projectRole:
      'Demodulates the optical AM laser beam back into electrical alternating current (AC) audio voltage without requiring complex digital decoding chips.',
    schematicTip:
      'Strong ambient room lighting or sunlight can saturate the solar cell junction, pushing it into non-linear compression. A simple optical tube or shroud over the panel dramatically improves the SNR!',
  },
  pam8403_rx: {
    id: 'pam8403_rx',
    name: 'PAM8403 (Rx Power Amplifier)',
    subtitle: 'Filterless 3W+3W Class-D Audio Amplifier Module for Speaker Drive',
    category: 'Amplification',
    specs: [
      { label: 'Supply Voltage (VDD)', value: '+5.0V DC regulated via Rx LM7805' },
      { label: 'Output Drive', value: 'Up to 3W into 4Ω / 10W speaker' },
      { label: 'Input Sensitivity', value: '100 mV RMS' },
      { label: 'THD+N', value: '< 0.1% at 1W output' },
      { label: 'Frequency Response', value: '20 Hz – 20 kHz' },
    ],
    description:
      'The receiver amplifier takes the small AC voltage generated by the solar panel (~50mV–200mV) and amplifies it to drive the physical 10W loudspeaker voice coil with clean, loud sound reproduction.',
    pinout: [
      { pin: 1, label: 'VDD (+5V)', function: 'Positive +5V supply from Rx LM7805 regulator.' },
      { pin: 2, label: 'GND', function: 'Common receiver ground.' },
      { pin: 3, label: 'L_IN', function: 'AC-coupled audio input from solar panel (+) via 10µF capacitor.' },
      { pin: 4, label: 'L_OUT+ / L_OUT-', function: 'Differential Class-D speaker outputs to 10W Loudspeaker voice coil.' },
    ],
    workingPrinciple:
      'High-speed PWM switching bridge drives the speaker coil directly in BTL (Bridge-Tied Load) configuration, eliminating the need for bulky DC-blocking capacitors at the speaker output.',
    projectRole:
      'Boosts the solar panel’s micro-watt electrical audio output into high-power acoustic audio capable of driving a room-filling speaker.',
    schematicTip:
      'Keep speaker leads short and twisted to prevent radiated electromagnetic interference (EMI) from the 250kHz Class-D switching frequency.',
  },
  speaker: {
    id: 'speaker',
    name: '10W 4Ω Dynamic Loudspeaker',
    subtitle: 'Full-Range Acoustic Transducer with Paper Cone & Rubber Surround',
    category: 'Transducer',
    specs: [
      { label: 'Nominal Impedance', value: '4 Ω' },
      { label: 'Power Handling', value: '10W Peak, 5W RMS' },
      { label: 'Frequency Response', value: '80 Hz – 18,000 Hz' },
      { label: 'Sensitivity', value: '88 dB/W/m' },
      { label: 'Voice Coil Diameter', value: '25 mm copper wound on Kapton former' },
      { label: 'Magnet Type', value: 'High-energy Ferrite / Neodymium' },
    ],
    description:
      'The final stage of the optical communication link. The loudspeaker converts the amplified electrical AC audio currents from the Rx PAM8403 into longitudinal pressure waves in the air, allowing the listener to hear the transmitted sound with crystal clarity.',
    pinout: [
      { pin: 1, label: 'Terminal (+)', function: 'Connected to Rx PAM8403 L_OUT+ terminal.' },
      { pin: 2, label: 'Terminal (-)', function: 'Connected to Rx PAM8403 L_OUT- terminal.' },
    ],
    workingPrinciple:
      'Lorentz Force F = I × (L × B). Alternating audio current (I) flowing through the voice coil wire of length (L) in a permanent magnetic field (B) exerts an axial magnetic force, moving the speaker diaphragm and radiating acoustic waves.',
    projectRole:
      'Provides immediate acoustic verification of the optical audio link. Shows the physical result of laser beam interruption and alignment changes in real time.',
    schematicTip:
      'Mounting the speaker in a small baffle or cardboard enclosure dramatically enhances low-frequency bass response by preventing phase cancellation between front and back waves.',
  },
};
