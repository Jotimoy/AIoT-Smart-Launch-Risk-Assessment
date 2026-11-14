// Browser Web Serial API Bridge for direct USB ESP32 telemetry & commands

type SerialLogListener = (line: string) => void;
type SerialStatusListener = (connected: boolean, error?: string) => void;

interface SerialPortLike {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

class WebSerialBridge {
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private keepReading = false;
  private connected = false;
  private logListeners = new Set<SerialLogListener>();
  private statusListeners = new Set<SerialStatusListener>();
  private encoder = new TextEncoder();

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public onLog(listener: SerialLogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  public onStatusChange(listener: SerialStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitLog(line: string) {
    this.logListeners.forEach(fn => fn(line));
  }

  private emitStatus(connected: boolean, error?: string) {
    this.connected = connected;
    this.statusListeners.forEach(fn => fn(connected, error));
  }

  public async connect(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isSupported()) {
      const msg = 'Web Serial API is not supported in this browser. Use Google Chrome or Microsoft Edge on desktop.';
      this.emitStatus(false, msg);
      return { ok: false, error: msg };
    }

    try {
      const navSerial = (navigator as unknown as { serial: { requestPort: () => Promise<SerialPortLike> } }).serial;
      this.port = await navSerial.requestPort();
      await this.port.open({ baudRate: 115200 });

      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }

      this.keepReading = true;
      this.emitStatus(true);
      this.emitLog('[USB SERIAL] Connected at 115200 baud. Waiting for ESP32 telemetry...');
      this.readLoop();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      let friendly = message;
      if (message.includes('Permissions policy') || message.includes('disallowed')) {
        friendly = 'USB Serial is blocked inside embedded preview frame. Open the Shared App URL in a full Chrome tab to use USB connection, or use Wi-Fi HTTP POST.';
      } else if (message.includes('No port selected')) {
        friendly = 'No USB serial port selected.';
      }
      this.emitStatus(false, friendly);
      return { ok: false, error: friendly };
    }
  }

  private async readLoop() {
    if (!this.port?.readable) return;
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      this.reader = this.port.readable.getReader();
      while (this.keepReading && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          if (line.startsWith('TELEMETRY_JSON:')) {
            const jsonText = line.slice('TELEMETRY_JSON:'.length).trim();
            try {
              const payload = JSON.parse(jsonText);
              fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              }).catch(() => {});
            } catch {
              // Ignore malformed partial line
            }
          } else {
            this.emitLog(line);
          }
        }
      }
    } catch (err) {
      if (this.keepReading) {
        const msg = err instanceof Error ? err.message : String(err);
        this.emitLog(`[USB SERIAL ERROR] ${msg}`);
      }
    } finally {
      await this.disconnect();
    }
  }

  public async sendCommand(cmd: string): Promise<boolean> {
    if (!this.connected || !this.writer) return false;
    try {
      await this.writer.write(this.encoder.encode(`${cmd}\n`));
      this.emitLog(`[SENT VIA USB] '${cmd}'`);
      return true;
    } catch {
      return false;
    }
  }

  public async disconnect() {
    this.keepReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close().catch(() => {});
        this.port = null;
      }
    } finally {
      if (this.connected) {
        this.emitStatus(false);
        this.emitLog('[USB SERIAL] Disconnected.');
      }
    }
  }
}

export const webSerialBridge = new WebSerialBridge();
