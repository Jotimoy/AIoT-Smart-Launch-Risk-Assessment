import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Download,
  Copy,
  Check,
  Database,
  Terminal,
  FileCode,
  Send,
  Wifi,
  Usb,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import rawFirmwareCode from '../../firmware/smart_launch_esp32.ino?raw';
import { webSerialBridge } from '../utils/webSerialBridge';

interface HardwareDocsViewProps {
  onSendCommand?: (cmd: string) => void;
}

export const HardwareDocsView: React.FC<HardwareDocsViewProps> = ({ onSendCommand }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [showCodePreview, setShowCodePreview] = useState(false);

  // Endpoint selector for generated .ino firmware
  const defaultCloudUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/telemetry`
      : 'https://ais-dev-pxg3hy4tefieeapipfzejv-284212303288.asia-southeast1.run.app/api/telemetry';
  const [serverTargetMode, setServerTargetMode] = useState<'cloud' | 'local'>('cloud');
  const [customLocalUrl, setCustomLocalUrl] = useState('http://192.168.43.100:3000/api/telemetry');

  // USB Web Serial Bridge state
  const [serialConnected, setSerialConnected] = useState(webSerialBridge.isConnected());
  const [serialError, setSerialError] = useState<string | null>(null);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const serialSupported = webSerialBridge.isSupported();

  useEffect(() => {
    const unsubStatus = webSerialBridge.onStatusChange((connected, error) => {
      setSerialConnected(connected);
      setSerialError(error ?? null);
    });
    const unsubLog = webSerialBridge.onLog((line) => {
      setSerialLogs((prev) => [...prev.slice(-39), line]);
    });
    return () => {
      unsubStatus();
      unsubLog();
    };
  }, []);

  const activeServerUrl = serverTargetMode === 'cloud' ? defaultCloudUrl : customLocalUrl.trim();

  const effectiveFirmwareCode = useMemo(() => {
    return rawFirmwareCode.replace(
      /const char\*\s+SERVER_URL\s*=\s*"[^"]*";/,
      `const char* SERVER_URL    = "${activeServerUrl}";`
    );
  }, [activeServerUrl]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const triggerBlobDownload = (content: string, filename: string, mimeType = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFirmware = () => {
    // Client-side Blob guarantees genuine C++ .ino source (never an HTML auth redirect)
    triggerBlobDownload(effectiveFirmwareCode, 'smart_launch_esp32.ino');
    setCommandStatus('Downloaded genuine C++ smart_launch_esp32.ino! Open in Arduino IDE and click Upload.');
    setTimeout(() => setCommandStatus(null), 4000);
  };

  const handleDownloadMysqlSchema = async () => {
    try {
      const res = await fetch('/api/schema/mysql');
      const sql = await res.text();
      triggerBlobDownload(sql, 'smart_launch_mysql_schema.sql');
    } catch {
      setCommandStatus('Could not download MySQL schema.');
      setTimeout(() => setCommandStatus(null), 3500);
    }
  };

  const handleToggleUsbSerial = async () => {
    setSerialError(null);
    if (serialConnected) {
      await webSerialBridge.disconnect();
    } else {
      const result = await webSerialBridge.connect();
      if (!result.ok && result.error) {
        setSerialError(result.error);
      }
    }
  };

  const handleSendSerialCommand = (cmd: string, name: string) => {
    if (serialConnected) {
      webSerialBridge.sendCommand(cmd);
    }

    fetch('/api/device/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    })
      .then((r) => r.json())
      .then(() => {
        setCommandStatus(
          serialConnected
            ? `Command '${cmd}' (${name}) sent via USB Serial + Wi-Fi queue!`
            : `Command '${cmd}' (${name}) queued for ESP32!`
        );
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

  const cUrlCommand = `curl -X POST ${activeServerUrl} \\
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
              Verified ESP32 Hardware Pin Mapping &amp; Firmware
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Configured strictly according to your tested hardware code on ESP32-WROOM-32D.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadFirmware}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .INO Firmware
            </button>
            <button
              onClick={() => handleCopy(effectiveFirmwareCode, 'ino')}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              {copiedSection === 'ino' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'ino' ? 'Code Copied!' : 'Copy Full .INO Code'}
            </button>
            <button
              onClick={handleDownloadMysqlSchema}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              MySQL Schema
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Hotspot & Server Target Card */}
      <div className="bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border border-blue-500/40 rounded-xl p-4 shadow space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Wifi className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Configured Phone Hotspot &amp; Server Target
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  EMBEDDED IN .INO
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                Turn on your phone&apos;s Personal Hotspot. ESP32 auto-connects &amp; streams telemetry.
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

        <div className="pt-2 border-t border-blue-500/20 flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">SERVER_URL in .INO:</span>
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setServerTargetMode('cloud')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                serverTargetMode === 'cloud'
                  ? 'bg-cyan-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cloud URL
            </button>
            <button
              onClick={() => setServerTargetMode('local')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                serverTargetMode === 'local'
                  ? 'bg-cyan-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Local Hotspot IP
            </button>
          </div>
          {serverTargetMode === 'local' ? (
            <input
              type="text"
              value={customLocalUrl}
              onChange={(e) => setCustomLocalUrl(e.target.value)}
              className="flex-1 min-w-[260px] bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-cyan-300 text-xs"
              placeholder="http://192.168.43.100:3000/api/telemetry"
            />
          ) : (
            <code className="text-[11px] text-cyan-300 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 truncate max-w-full">
              {defaultCloudUrl}
            </code>
          )}
        </div>
      </div>

      {/* Direct USB Web Serial Bridge Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                serialConnected
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-cyan-400'
              }`}
            >
              <Usb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Direct USB Serial Live Bridge (115200 Baud)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    serialConnected
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-700'
                  }`}
                >
                  {serialConnected ? 'USB STREAMING LIVE' : 'STANDBY'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Plug ESP32 into your Mac via USB to stream real sensor readings directly into this dashboard (works even if Cloud URL blocks Wi-Fi POST).
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleUsbSerial}
            disabled={!serialSupported}
            className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              !serialSupported
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : serialConnected
                ? 'bg-rose-700 hover:bg-rose-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            {serialConnected ? 'Disconnect USB ESP32' : 'Connect ESP32 via USB'}
          </button>
        </div>

        {serialError && (
          <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-lg text-xs font-mono text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{serialError}</span>
          </div>
        )}

        {serialLogs.length > 0 && (
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-emerald-300 max-h-40 overflow-y-auto leading-relaxed">
            {serialLogs.join('\n')}
          </pre>
        )}
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
              Serial Monitor Commands (USB &amp; Remote Web Console)
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
                &apos;d&apos;
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
                &apos;w&apos;
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
                &apos;t&apos;
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
                &apos;m&apos;
              </span>
              <Send className="w-3 h-3 text-amber-400" />
            </div>
            <strong className="text-slate-100">MPU6050 Calib</strong>
            <span className="text-[10px] text-slate-400 mt-1">Keep model still &amp; level</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('z', 'Reset Passenger Counts')}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition flex flex-col justify-between"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-bold">
                &apos;z&apos;
              </span>
              <Send className="w-3 h-3 text-rose-400" />
            </div>
            <strong className="text-slate-100">Reset Passengers</strong>
            <span className="text-[10px] text-slate-400 mt-1">Passenger Count Reset to 0</span>
          </button>
        </div>
      </div>

      {/* Collapsible Full Arduino Source Code Preview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setShowCodePreview(!showCodePreview)}
            className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider font-mono cursor-pointer"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>ESP32 Arduino Source Code (smart_launch_esp32.ino)</span>
            {showCodePreview ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(effectiveFirmwareCode, 'ino-box')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
            >
              {copiedSection === 'ino-box' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'ino-box' ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={handleDownloadFirmware}
              className="px-2.5 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .INO
            </button>
          </div>
        </div>

        {showCodePreview && (
          <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-96 leading-relaxed">
            {effectiveFirmwareCode}
          </pre>
        )}
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
                <th className="p-2.5">Protection &amp; Wiring Notes</th>
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
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
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
