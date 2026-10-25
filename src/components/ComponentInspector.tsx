import React, { useState } from 'react';
import { ComponentInfo } from '../types/simulator';
import { COMPONENTS_DATA } from '../data/componentsData';
import { BookOpen, CheckCircle, Cpu, HelpCircle, Layers, Lightbulb, Wrench, X } from 'lucide-react';

interface ComponentInspectorProps {
  selectedComponentId: string | null;
  onClose: () => void;
  onSelectComponent: (id: string) => void;
}

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  selectedComponentId,
  onClose,
  onSelectComponent,
}) => {
  const [activeTab, setActiveTab] = useState<'specs' | 'pinout' | 'theory' | 'wiring'>('specs');

  if (!selectedComponentId) return null;

  const comp: ComponentInfo = COMPONENTS_DATA[selectedComponentId] || COMPONENTS_DATA['lm7805'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono tracking-tight">{comp.name}</h2>
              <p className="text-xs text-slate-400">{comp.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Component Switcher Ribbon */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/70 border-b border-slate-800 overflow-x-auto text-xs font-mono">
          {Object.values(COMPONENTS_DATA).map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectComponent(item.id)}
              className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
                comp.id === item.id
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {item.name.split('(')[0].trim()}
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900 px-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'specs'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Specifications
          </button>
          <button
            onClick={() => setActiveTab('pinout')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'pinout'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pinout & Connections
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'theory'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Working Principle
          </button>
          <button
            onClick={() => setActiveTab('wiring')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'wiring'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Breadboard Wiring
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 text-sm text-slate-300 space-y-4">
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-slate-300">{comp.description}</p>
              
              <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800">
                <h3 className="text-xs font-mono font-bold text-slate-200 mb-2 uppercase tracking-wide">
                  Technical Specifications
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  {comp.specs.map((s, idx) => (
                    <div key={idx} className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      <div className="text-slate-400">{s.label}:</div>
                      <div className="text-cyan-300 font-semibold mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-lg p-3 text-xs leading-relaxed text-cyan-200">
                <strong className="text-cyan-300 font-mono">Role in this Communicator: </strong>
                {comp.projectRole}
              </div>
            </div>
          )}

          {activeTab === 'pinout' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Detailed pin assignments and electrical interface requirements for hardware assembly.
              </p>

              <div className="space-y-2">
                {comp.pinout.map((p) => (
                  <div key={p.pin} className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 flex gap-3 text-xs font-mono">
                    <div className="w-8 h-8 rounded bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-300 font-bold shrink-0">
                      {p.pin}
                    </div>
                    <div className="flex-1">
                      <div className="text-slate-200 font-bold">{p.label}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5 font-sans leading-relaxed">{p.function}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded-lg text-xs text-amber-200/90 leading-relaxed">
                <strong className="text-amber-300 font-mono">Schematic Pro-Tip: </strong>
                {comp.schematicTip}
              </div>
            </div>
          )}

          {activeTab === 'theory' && (
            <div className="space-y-4 text-xs leading-relaxed">
              <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 space-y-3">
                <h3 className="font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Physics & Engineering Operating Principle
                </h3>
                <p className="text-slate-300">{comp.workingPrinciple}</p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 space-y-2 font-mono">
                <h4 className="text-slate-300 font-semibold text-xs">Mathematical Formulation:</h4>
                {comp.id === 'lm7805' && (
                  <div className="bg-slate-900 p-2.5 rounded text-cyan-300 text-[11px]">
                    P_d = (V_in - V_out) × I_load = (9.0V - 5.0V) × 0.25A = 1.0 Watt (Thermal Heat)
                  </div>
                )}
                {comp.id.startsWith('pam8403') && (
                  <div className="bg-slate-900 p-2.5 rounded text-cyan-300 text-[11px]">
                    V_btl(t) = 2 × A_v × V_in(t) · PWM carrier @ 250 kHz (Filterless Class-D)
                  </div>
                )}
                {comp.id === 'laser_diode' && (
                  <div className="bg-slate-900 p-2.5 rounded text-cyan-300 text-[11px]">
                    P_opt(t) = η_d × (I_bias + k·V_audio(t) - I_th) for I_f &gt; I_th
                  </div>
                )}
                {comp.id === 'solar_panel' && (
                  <div className="bg-slate-900 p-2.5 rounded text-cyan-300 text-[11px]">
                    I_ph = R_λ × P_opt(t) = (0.45 A/W) × P_opt · V_ac(t) = I_ph × R_load
                  </div>
                )}
                {comp.id === 'speaker' && (
                  <div className="bg-slate-900 p-2.5 rounded text-cyan-300 text-[11px]">
                    F = I_audio × (L × B) → Voice coil displacement x(t) = F / (k_s - m·ω²)
                  </div>
                )}
                {comp.id === 'mirror_reflector' && (
                  <div className="bg-slate-900 p-2.5 rounded text-cyan-300 text-[11px]">
                    θ_reflection = θ_incident · Reflected ray deflection Δθ_beam = 2 × Δθ_mirror
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'wiring' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <h3 className="font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-cyan-400" />
                DIY Physical Breadboard Assembly Steps
              </h3>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold">Step 1: Power Regulation</span>
                  <p className="text-slate-400 font-sans mt-0.5">
                    Mount the LM7805 on the breadboard. Connect 9V Battery (+) to Pin 1 (IN) and Battery (-) to Pin 2 (GND). Place a 100nF capacitor between Pin 3 (OUT) and GND. Verify +5.0V with a multimeter.
                  </p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold">Step 2: Transmitter PAM8403 Wiring</span>
                  <p className="text-slate-400 font-sans mt-0.5">
                    Connect LM7805 Pin 3 (+5V) to PAM8403 VDD. Connect 3.5mm AUX Left & GND to PAM8403 L_IN and GND. Connect PAM8403 L_OUT+ to the Laser Diode Anode via a 100Ω resistor. Connect Laser Cathode to PAM8403 L_OUT-.
                  </p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold">Step 3: Receiver Photovoltaic Demodulator</span>
                  <p className="text-slate-400 font-sans mt-0.5">
                    Wire the Solar Panel (+) to the positive lead of a 10µF capacitor. Connect the capacitor's negative lead to Rx PAM8403 L_IN. Wire Solar Panel (-) to Rx circuit Ground.
                  </p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold">Step 4: Speaker Drive & Testing</span>
                  <p className="text-slate-400 font-sans mt-0.5">
                    Connect the 10W speaker terminals across Rx PAM8403 L_OUT+ and L_OUT-. Power on both 9V batteries, aim the laser beam directly onto the solar panel cell, and play audio on your phone!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950 text-xs font-mono">
          <span className="text-slate-500">Optical Audio Communicator Lab Manual</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
