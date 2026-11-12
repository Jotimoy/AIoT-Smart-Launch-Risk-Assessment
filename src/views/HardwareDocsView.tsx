import React, { useState } from 'react';
import { Cpu, Download, Copy, Check, AlertTriangle, ShieldCheck, Zap, Database, Terminal, FileCode, Radio, Send, Play, Wifi, Globe } from 'lucide-react';

interface HardwareDocsViewProps {
  onSendCommand?: (cmd: string) => void;
}

export const HardwareDocsView: React.FC<HardwareDocsViewProps> = ({ onSendCommand }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleSendSerialCommand = (cmd: string, name: string) => {
    fetch('/api/device/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    })
      .then(r => r.json())
      .then(res => {
        setCommandStatus(`Command '${cmd}' (${name}) queued for ESP32!`);
        setTimeout(() => setCommandStatus(null), 3500);
      })
      .catch(() => {
        setCommandStatus(`Error sending command '${cmd}'`);
        setTimeout(() => setCommandStatus(null), 3500);
      });

    if (onSendCommand) {
      onSendCommand(cmd);
    }
  };

  const cUrlCommand = `curl -X POST http://YOUR_SERVER_IP:3000/api/telemetry \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "LAUNCH-BD-8902",
    "passengerCount": 12,
    "entryCount": 15,
    "exitCount": 3,
    "leftLoad": 420.5,
    "rightLoad": 415.0,
    "totalLoad": 835.5,
    "loadImbalancePercent": 0.7,
    "dualHX711Connected": true,
    "roll": 1.2,
    "pitch": 0.8,
    "waterLevelRaw": 180,
    "waterLevelPercent": 2.5,
    "gps": {
      "fixValid": true,
      "latitude": 23.7042,
      "longitude": 90.4183,
      "speedKmh": 16.5,
      "course": 145,
      "satellites": 9
    }
  }'`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Verified ESP32 Hardware Pin Mapping & Serial Commands
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Configured strictly according to your tested hardware code on ESP32-WROOM-32D.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/firmware/smart_launch_esp32.ino"
              download="smart_launch_esp32.ino"
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download Updated .INO Firmware
            </a>
            <a
              href="/api/schema/mysql"
              download="smart_launch_mysql_schema.sql"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Database className="w-3.5 h-3.5" />
              MySQL Schema
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Hotspot Connection Card */}
      <div className="bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border border-blue-500/40 rounded-xl p-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Wifi className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Configured Phone Hotspot
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  READY IN .INO
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                Turn on your phone's Personal Hotspot. ESP32 will auto-connect and stream sensor telemetry.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-300">
              <span className="text-slate-500 mr-1.5">SSID:</span>
              <strong className="text-cyan-300">Smart Launch</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-300">
              <span className="text-slate-500 mr-1.5">PASSWORD:</span>
              <strong className="text-cyan-300">12345678</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Command Queue Feedback */}
      {commandStatus && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs font-mono text-emerald-200 flex items-center gap-2 animate-pulse">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{commandStatus}</span>
        </div>
      )}

      {/* Interactive Serial Commands Panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Serial Monitor Commands (USB & Remote Web Console)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Click to dispatch remotely or type in Arduino IDE Serial Monitor (115200 baud)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
          <button
            onClick={() => handleSendSerialCommand('d', 'Water Dry Calibration')}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition flex flex-col justify-between"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                'd'
              </span>
              <Send className="w-3 h-3 text-cyan-400" />
            </div>
            <strong className="text-slate-100">Water Dry Calib</strong>
            <span className="text-[10px] text-slate-400 mt-1">Keep sensor completely dry</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('w', 'Water Wet Calibration')}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition flex flex-col justify-between"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                'w'
              </span>
              <Send className="w-3 h-3 text-cyan-400" />
            </div>
            <strong className="text-slate-100">Water Wet Calib</strong>
            <span className="text-[10px] text-slate-400 mt-1">Wet sensor sensing tracks</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('t', 'Tare Both Load Cells')}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition flex flex-col justify-between"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40 font-bold">
                't'
              </span>
              <Send className="w-3 h-3 text-indigo-400" />
            </div>
            <strong className="text-slate-100">Tare Load Cells</strong>
            <span className="text-[10px] text-slate-400 mt-1">দুইটি Load Cell Tare (Zero weight)</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('m', 'MPU6050 Level Calibration')}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition flex flex-col justify-between"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                'm'
              </span>
              <Send className="w-3 h-3 text-amber-400" />
            </div>
            <strong className="text-slate-100">MPU6050 Calib</strong>
            <span className="text-[10px] text-slate-400 mt-1">Keep model still & level</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('z', 'Reset Passenger Counts')}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition flex flex-col justify-between"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-bold">
                'z'
              </span>
              <Send className="w-3 h-3 text-rose-400" />
            </div>
            <strong className="text-slate-100">Reset Passengers</strong>
            <span className="text-[10px] text-slate-400 mt-1">Passenger Count Reset to 0</span>
          </button>
        </div>
      </div>

      {/* Official Verified Hardware Pin Mapping Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Active Hardware Pinout Configuration (ESP32-WROOM-32D)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Device / Peripheral</th>
                <th className="p-2.5">Module Pins</th>
                <th className="p-2.5">ESP32 GPIO</th>
                <th className="p-2.5">Operating Parameters</th>
                <th className="p-2.5">Protection & Wiring Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="p-2.5 font-bold text-blue-300">Left HX711 Load Cell</td>
                <td className="p-2.5">DT / SCK</td>
                <td className="p-2.5 text-cyan-300 font-bold">GPIO 19 / GPIO 18</td>
                <td className="p-2.5">Cal Factor: <strong>695.416</strong></td>
                <td className="p-2.5 text-emerald-400">Direct 3.3V connection</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-amber-300">Right HX711 Load Cell</td>
                <td className="p-2.5">DT / SCK</td>
                <td className="p-2.5 text-cyan-300 font-bold">GPIO 25 / GPIO 26</td>
                <td className="p-2.5">Cal Factor: <strong>706.785</strong></td>
                <td className="p-2.5 text-emerald-400">Direct 3.3V connection</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-amber-300">MPU6050 Accelerometer/Gyro</td>
                <td className="p-2.5">SDA / SCL</td>
                <td className="p-2.5 text-cyan-300 font-bold">GPIO 21 / GPIO 22</td>
                <td className="p-2.5">I2C Address: <strong>0x68</strong></td>
                <td className="p-2.5 text-emerald-400">Direct 3.3V I2C bus</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-teal-300">Water Sensor Signal</td>
                <td className="p-2.5">SIG (Analog)</td>
                <td className="p-2.5 text-cyan-300 font-bold">GPIO 34</td>
                <td className="p-2.5">12-bit ADC (0–4095)</td>
                <td className="p-2.5 text-emerald-400">ADC1 Input only (no Wi-Fi RF conflict)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-rose-300">Buzzer Transistor</td>
                <td className="p-2.5">Base Pin</td>
                <td className="p-2.5 text-cyan-300 font-bold">GPIO 27</td>
                <td className="p-2.5">Active HIGH / PWM</td>
                <td className="p-2.5 text-amber-300">NPN Transistor base resistor (1 kΩ)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-sky-300">u-blox NEO-6M GPS</td>
                <td className="p-2.5">TX / RX</td>
                <td className="p-2.5 text-cyan-300 font-bold">GPIO 16 / GPIO 17</td>
                <td className="p-2.5">Hardware UART2 (9600 Baud)</td>
                <td className="p-2.5 text-emerald-400">GPS TX &rarr; GPIO16 (RX2); Common GND</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-cyan-300">Entry HC-SR04 (Gate 1)</td>
                <td className="p-2.5">TRIG / ECHO</td>
                <td className="p-2.5 text-cyan-300 font-bold">GPIO 32 / GPIO 33</td>
                <td className="p-2.5">Detect Dist: <strong>15.0 cm</strong></td>
                <td className="p-2.5 text-amber-300">ECHO pin MUST use 5V&rarr;3.3V divider</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-cyan-300">Exit HC-SR04 (Gate 2)</td>
                <td className="p-2.5">TRIG / ECHO</td>
                <td className="p-2.5 text-cyan-300 font-bold">GPIO 13 / GPIO 14</td>
                <td className="p-2.5">Detect Dist: <strong>15.0 cm</strong></td>
                <td className="p-2.5 text-amber-300">ECHO pin MUST use 5V&rarr;3.3V divider</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* cURL Test Block */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Live Hardware HTTP POST Testing
            </h3>
          </div>
          <button
            onClick={() => handleCopy(cUrlCommand, 'curl')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 border border-slate-700 transition"
          >
            {copiedSection === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSection === 'curl' ? 'Copied!' : 'Copy cURL'}
          </button>
        </div>

        <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
          {cUrlCommand}
        </pre>
      </div>
    </div>
  );
};
