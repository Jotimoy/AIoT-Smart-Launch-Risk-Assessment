import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/apiClient';
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

  const defaultCloudUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/telemetry`
      : 'https://ais-dev-pxg3hy4tefieeapipfzejv-284212303288.asia-southeast1.run.app/api/telemetry';
  const [serverTargetMode, setServerTargetMode] = useState<'cloud' | 'local'>('cloud');
  const [customLocalUrl, setCustomLocalUrl] = useState('http://192.168.43.100:3000/api/telemetry');

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
    triggerBlobDownload(effectiveFirmwareCode, 'smart_launch_esp32.ino');
    setCommandStatus('Downloaded genuine C++ smart_launch_esp32.ino! Open in Arduino IDE and click Upload.');
    setTimeout(() => setCommandStatus(null), 4000);
  };

  const handleDownloadMysqlSchema = async () => {
    try {
      const res = await apiFetch('/api/schema/mysql');
      if (!res.ok) throw new Error('Forbidden');
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

    apiFetch('/api/device/command', {
      method: 'POST',
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
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white tracking-wide flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Verified ESP32 Hardware Pin Mapping &amp; Firmware
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-mono">
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
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              {copiedSection === 'ino' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'ino' ? 'Code Copied!' : 'Copy Full .INO Code'}
            </button>
            <button
              onClick={handleDownloadMysqlSchema}
              className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-cyan-800 border border-[#CBD5E1] dark:bg-[#1F2937] dark:hover:bg-slate-700 dark:text-cyan-300 dark:border-[#334155] font-mono text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              MySQL Schema
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Hotspot & Server Target Card */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/60 dark:to-cyan-950/40 border border-blue-200 dark:border-blue-500/40 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-600/20 border border-blue-300 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wifi className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider font-mono">
                  Configured Phone Hotspot &amp; Server Target
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40">
                  EMBEDDED IN .INO
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-300 mt-0.5 font-mono">
                Turn on your phone&apos;s Personal Hotspot. ESP32 auto-connects &amp; streams telemetry.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1120]/90 border border-[#CBD5E1] dark:border-[#334155] text-[#64748B] dark:text-slate-300 shadow-2xs">
              <span className="mr-1.5">SSID:</span>
              <strong className="text-cyan-700 dark:text-cyan-300">Smart Launch</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1120]/90 border border-[#CBD5E1] dark:border-[#334155] text-[#64748B] dark:text-slate-300 shadow-2xs">
              <span className="mr-1.5">PASSWORD:</span>
              <strong className="text-cyan-700 dark:text-cyan-300">12345678</strong>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-blue-200 dark:border-blue-500/20 flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-[#64748B] dark:text-slate-400">SERVER_URL in .INO:</span>
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B1120] p-1 rounded-lg border border-[#CBD5E1] dark:border-[#334155]">
            <button
              onClick={() => setServerTargetMode('cloud')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                serverTargetMode === 'cloud'
                  ? 'bg-cyan-600 text-white'
                  : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Cloud URL
            </button>
            <button
              onClick={() => setServerTargetMode('local')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                serverTargetMode === 'local'
                  ? 'bg-cyan-600 text-white'
                  : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-slate-200'
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
              className="flex-1 min-w-[260px] bg-white dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] rounded-lg px-2.5 py-1 text-cyan-800 dark:text-cyan-300 text-xs"
              placeholder="http://192.168.43.100:3000/api/telemetry"
            />
          ) : (
            <code className="text-[11px] text-cyan-800 dark:text-cyan-300 bg-white dark:bg-[#0B1120]/80 px-2.5 py-1 rounded border border-[#CBD5E1] dark:border-[#334155] truncate max-w-full">
              {defaultCloudUrl}
            </code>
          )}
        </div>
      </div>

      {/* Direct USB Web Serial Bridge Card */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                serialConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-950/80 dark:border-emerald-500/50 dark:text-emerald-400'
                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-cyan-600 dark:bg-[#0B1120] dark:border-[#334155] dark:text-cyan-400'
              }`}
            >
              <Usb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider font-mono">
                  Direct USB Serial Live Bridge (115200 Baud)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    serialConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/50'
                      : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0] dark:bg-[#0B1120] dark:text-slate-400 dark:border-[#334155]'
                  }`}
                >
                  {serialConnected ? 'USB STREAMING LIVE' : 'STANDBY'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-mono">
                Plug ESP32 into your Mac via USB to stream real sensor readings directly into this dashboard (works even if Cloud URL blocks Wi-Fi POST).
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleUsbSerial}
            disabled={!serialSupported}
            className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              !serialSupported
                ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                : serialConnected
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            {serialConnected ? 'Disconnect USB ESP32' : 'Connect ESP32 via USB'}
          </button>
        </div>

        {serialError && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 rounded-lg text-xs font-mono text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{serialError}</span>
          </div>
        )}

        {serialLogs.length > 0 && (
          <pre className="bg-slate-900 dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] rounded-lg p-3 text-[11px] font-mono text-emerald-300 max-h-40 overflow-y-auto leading-relaxed">
            {serialLogs.join('\n')}
          </pre>
        )}
      </div>

      {/* Command Queue Feedback */}
      {commandStatus && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/60 rounded-xl text-xs font-mono text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-pulse">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{commandStatus}</span>
        </div>
      )}

      {/* Interactive Serial Commands Panel */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
              Serial Monitor Commands (USB &amp; Remote Web Console)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">
            Click to dispatch remotely or type in Arduino IDE Serial Monitor (115200 baud)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
          <button
            onClick={() => handleSendSerialCommand('d', 'Water Dry Calibration')}
            className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-left transition flex flex-col justify-between cursor-pointer"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/40 font-bold">
                &apos;d&apos;
              </span>
              <Send className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            </div>
            <strong className="text-[#0F172A] dark:text-slate-100">Water Dry Calib</strong>
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Keep sensor completely dry</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('w', 'Water Wet Calibration')}
            className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-left transition flex flex-col justify-between cursor-pointer"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/40 font-bold">
                &apos;w&apos;
              </span>
              <Send className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            </div>
            <strong className="text-[#0F172A] dark:text-slate-100">Water Wet Calib</strong>
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Wet sensor sensing tracks</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('t', 'Tare Both Load Cells')}
            className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-left transition flex flex-col justify-between cursor-pointer"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-500/40 font-bold">
                &apos;t&apos;
              </span>
              <Send className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
            <strong className="text-[#0F172A] dark:text-slate-100">Tare Load Cells</strong>
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">দুইটি Load Cell Tare (Zero weight)</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('m', 'MPU6050 Level Calibration')}
            className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-left transition flex flex-col justify-between cursor-pointer"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-500/40 font-bold">
                &apos;m&apos;
              </span>
              <Send className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            </div>
            <strong className="text-[#0F172A] dark:text-slate-100">MPU6050 Calib</strong>
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Keep model still &amp; level</span>
          </button>

          <button
            onClick={() => handleSendSerialCommand('z', 'Reset Passenger Counts')}
            className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-left transition flex flex-col justify-between cursor-pointer"
          >
            <div className="flex justify-between items-center w-full mb-1">
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500/40 font-bold">
                &apos;z&apos;
              </span>
              <Send className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            </div>
            <strong className="text-[#0F172A] dark:text-slate-100">Reset Passengers</strong>
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Passenger Count Reset to 0</span>
          </button>
        </div>
      </div>

      {/* Collapsible Full Arduino Source Code Preview */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setShowCodePreview(!showCodePreview)}
            className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono cursor-pointer"
          >
            <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>ESP32 Arduino Source Code (smart_launch_esp32.ino)</span>
            {showCodePreview ? (
              <ChevronUp className="w-4 h-4 text-[#64748B] dark:text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#64748B] dark:text-slate-400" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(effectiveFirmwareCode, 'ino-box')}
              className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-slate-200 text-cyan-800 border border-[#CBD5E1] dark:bg-[#1F2937] dark:hover:bg-slate-700 dark:text-cyan-300 dark:border-[#334155] text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
            >
              {copiedSection === 'ino-box' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'ino-box' ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={handleDownloadFirmware}
              className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .INO
            </button>
          </div>
        </div>

        {showCodePreview && (
          <pre className="bg-slate-900 dark:bg-[#0B1120] p-3.5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-96 leading-relaxed">
            {effectiveFirmwareCode}
          </pre>
        )}
      </div>

      {/* Official Verified Hardware Pin Mapping Table */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow">
        <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Active Hardware Pinout Configuration (ESP32-WROOM-32D)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8FAFC] dark:bg-[#1F2937] text-[#64748B] dark:text-[#94A3B8] border-b border-[#E2E8F0] dark:border-[#334155]">
              <tr>
                <th className="p-2.5">Device / Peripheral</th>
                <th className="p-2.5">Module Pins</th>
                <th className="p-2.5">ESP32 GPIO</th>
                <th className="p-2.5">Operating Parameters</th>
                <th className="p-2.5">Protection &amp; Wiring Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] text-[#0F172A] dark:text-slate-300">
              <tr className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                <td className="p-2.5 font-bold text-blue-700 dark:text-blue-300">Left HX711 Load Cell</td>
                <td className="p-2.5">DT / SCK</td>
                <td className="p-2.5 text-cyan-700 dark:text-cyan-300 font-bold">GPIO 19 / GPIO 18</td>
                <td className="p-2.5">Cal Factor: <strong>695.416</strong></td>
                <td className="p-2.5 text-emerald-700 dark:text-emerald-400">Direct 3.3V connection</td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                <td className="p-2.5 font-bold text-amber-700 dark:text-amber-300">Right HX711 Load Cell</td>
                <td className="p-2.5">DT / SCK</td>
                <td className="p-2.5 text-cyan-700 dark:text-cyan-300 font-bold">GPIO 25 / GPIO 26</td>
                <td className="p-2.5">Cal Factor: <strong>706.785</strong></td>
                <td className="p-2.5 text-emerald-700 dark:text-emerald-400">Direct 3.3V connection</td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                <td className="p-2.5 font-bold text-amber-700 dark:text-amber-300">MPU6050 Accelerometer/Gyro</td>
                <td className="p-2.5">SDA / SCL</td>
                <td className="p-2.5 text-cyan-700 dark:text-cyan-300 font-bold">GPIO 21 / GPIO 22</td>
                <td className="p-2.5">I2C Address: <strong>0x68</strong></td>
                <td className="p-2.5 text-emerald-700 dark:text-emerald-400">Direct 3.3V I2C bus</td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                <td className="p-2.5 font-bold text-teal-700 dark:text-teal-300">Water Sensor Signal</td>
                <td className="p-2.5">SIG (Analog)</td>
                <td className="p-2.5 text-cyan-700 dark:text-cyan-300 font-bold">GPIO 34</td>
                <td className="p-2.5">12-bit ADC (0–4095)</td>
                <td className="p-2.5 text-emerald-700 dark:text-emerald-400">ADC1 Input only (no Wi-Fi RF conflict)</td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                <td className="p-2.5 font-bold text-rose-700 dark:text-rose-300">Buzzer Transistor</td>
                <td className="p-2.5">Base Pin</td>
                <td className="p-2.5 text-cyan-700 dark:text-cyan-300 font-bold">GPIO 27</td>
                <td className="p-2.5">Active HIGH / PWM</td>
                <td className="p-2.5 text-amber-700 dark:text-amber-300">NPN Transistor base resistor (1 kΩ)</td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                <td className="p-2.5 font-bold text-sky-700 dark:text-sky-300">u-blox NEO-6M GPS</td>
                <td className="p-2.5">TX / RX</td>
                <td className="p-2.5 text-cyan-700 dark:text-cyan-300 font-bold">GPIO 16 / GPIO 17</td>
                <td className="p-2.5">Hardware UART2 (9600 Baud)</td>
                <td className="p-2.5 text-emerald-700 dark:text-emerald-400">GPS TX &rarr; GPIO16 (RX2); Common GND</td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                <td className="p-2.5 font-bold text-cyan-700 dark:text-cyan-300">Entry HC-SR04 (Gate 1)</td>
                <td className="p-2.5">TRIG / ECHO</td>
                <td className="p-2.5 text-cyan-700 dark:text-cyan-300 font-bold">GPIO 32 / GPIO 33</td>
                <td className="p-2.5">Detect Dist: <strong>15.0 cm</strong></td>
                <td className="p-2.5 text-amber-700 dark:text-amber-300">ECHO pin MUST use 5V&rarr;3.3V divider</td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40">
                <td className="p-2.5 font-bold text-cyan-700 dark:text-cyan-300">Exit HC-SR04 (Gate 2)</td>
                <td className="p-2.5">TRIG / ECHO</td>
                <td className="p-2.5 text-cyan-700 dark:text-cyan-300 font-bold">GPIO 13 / GPIO 14</td>
                <td className="p-2.5">Detect Dist: <strong>15.0 cm</strong></td>
                <td className="p-2.5 text-amber-700 dark:text-amber-300">ECHO pin MUST use 5V&rarr;3.3V divider</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* cURL Test Block */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
              Live Hardware HTTP POST Testing
            </h3>
          </div>
          <button
            onClick={() => handleCopy(cUrlCommand, 'curl')}
            className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-slate-200 text-cyan-800 border border-[#CBD5E1] dark:bg-[#1F2937] dark:hover:bg-slate-700 dark:text-cyan-300 dark:border-[#334155] text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
          >
            {copiedSection === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSection === 'curl' ? 'Copied!' : 'Copy cURL'}
          </button>
        </div>

        <pre className="bg-slate-900 dark:bg-[#0B1120] p-3.5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
          {cUrlCommand}
        </pre>
      </div>
    </div>
  );
};
