// Web Audio API synthesizer simulating the Active Buzzer (2.4 kHz resonant frequency)
// according to the required maritime alert patterns

class BuzzerSoundController {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalTimer: number | null = null;
  private isMuted: boolean = false;
  private currentPattern: 'OFF' | 'INTERMITTENT_WARNING' | 'RAPID_HIGH_RISK' | 'CONTINUOUS_ALARM' = 'OFF';

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    } else {
      this.setPattern(this.currentPattern);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stop() {
    if (this.intervalTimer) {
      window.clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch {
        // Ignore already stopped oscillator
      }
      this.oscillator = null;
    }
    this.gainNode = null;
  }

  private beep(durationMs: number, freq = 2400) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square'; // standard active buzzer square wave harmonic
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, this.audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000 + 0.02);
    } catch {
      // Audio might be blocked before user interaction
    }
  }

  public setPattern(pattern: 'OFF' | 'INTERMITTENT_WARNING' | 'RAPID_HIGH_RISK' | 'CONTINUOUS_ALARM') {
    this.currentPattern = pattern;
    this.stop();

    if (this.isMuted || pattern === 'OFF') return;

    if (pattern === 'INTERMITTENT_WARNING') {
      // Intermittent short beeps: 250ms beep every 1.5 seconds
      this.beep(250, 2400);
      this.intervalTimer = window.setInterval(() => {
        this.beep(250, 2400);
      }, 1500);
    } else if (pattern === 'RAPID_HIGH_RISK') {
      // Repeated faster beeps: 150ms beep every 400ms
      this.beep(150, 2600);
      this.intervalTimer = window.setInterval(() => {
        this.beep(150, 2600);
      }, 400);
    } else if (pattern === 'CONTINUOUS_ALARM') {
      // Urgent continuous alternating siren
      let toggle = false;
      this.intervalTimer = window.setInterval(() => {
        this.beep(120, toggle ? 2800 : 2300);
        toggle = !toggle;
      }, 140);
    }
  }

  public testBuzzer() {
    this.initContext();
    const prevMute = this.isMuted;
    this.isMuted = false;
    this.beep(400, 2500);
    setTimeout(() => {
      this.beep(400, 2700);
      setTimeout(() => {
        this.isMuted = prevMute;
      }, 500);
    }, 450);
  }
}

export const buzzerAudio = new BuzzerSoundController();
