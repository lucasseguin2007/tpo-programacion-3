import { browserStore, type KeyValueStore } from '../state/save';

export const MUTE_KEY = 'cartas-del-archipielago:silencio:v1';
const MASTER_VOLUME = 0.32;
const SEA_VOLUME = 0.05;

type ContextFactory = () => AudioContext;

function defaultFactory(): ContextFactory | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? () => new Ctor() : null;
}

/**
 * Sonidos discretos sintetizados en el momento: mar de fondo mientras se navega, una campana
 * al zarpar y otra al llegar. Sin archivos de audio. El estado "silenciado" se recuerda.
 * Ningún método lanza: si el audio no está disponible, el juego sigue en silencio.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sea: { source: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null;
  private muted: boolean;
  private listeners = new Set<() => void>();

  constructor(
    private readonly store: KeyValueStore | null = browserStore(),
    private readonly factory: ContextFactory | null = defaultFactory(),
  ) {
    this.muted = this.readMuted();
  }

  isMuted(): boolean { return this.muted; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  setMuted(value: boolean): void {
    this.muted = value;
    try { if (value) this.store?.setItem(MUTE_KEY, '1'); else this.store?.removeItem(MUTE_KEY); } catch { /* sin persistencia */ }
    if (value) this.stopSea(0.1);
    this.listeners.forEach(listener => listener());
  }

  /** Zarpe: campana grave y mar de fondo hasta la llegada. */
  depart(): void {
    this.safely(ctx => {
      this.bell(ctx, 0, 392, 0.12, 1.6);
      this.bell(ctx, 0.16, 523.25, 0.09, 1.4);
      this.startSea(ctx);
    });
  }

  /** Escala intermedia: una campanada suave; el mar sigue. */
  stopover(): void { this.safely(ctx => this.bell(ctx, 0, 659.25, 0.1, 1.2)); }

  /** Llegada final: dos campanadas y el mar se apaga. */
  dock(): void {
    this.safely(ctx => {
      this.bell(ctx, 0, 659.25, 0.13, 1.8);
      this.bell(ctx, 0.32, 880, 0.11, 2.2);
    });
    this.stopSea(1.2);
  }

  /** Corte abrupto (reinicio, mapa perdido): solo se apaga el mar. */
  halt(): void { this.stopSea(0.4); }

  // ---- internos ------------------------------------------------------------------------

  private readMuted(): boolean {
    try { return this.store?.getItem(MUTE_KEY) === '1'; } catch { return false; }
  }

  private context(): AudioContext | null {
    if (this.muted || !this.factory) return null;
    if (!this.ctx) {
      try {
        this.ctx = this.factory();
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_VOLUME;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null; this.master = null;
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private safely(play: (ctx: AudioContext, master: GainNode) => void): void {
    try {
      const ctx = this.context();
      if (ctx && this.master) play(ctx, this.master);
    } catch { /* el sonido nunca debe romper la partida */ }
  }

  /** Campana: un tono con su armónico, ataque corto y caída larga. */
  private bell(ctx: AudioContext, delay: number, frequency: number, volume: number, decay: number): void {
    const start = ctx.currentTime + delay;
    for (const [ratio, level] of [[1, 1], [2.76, 0.35]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency * ratio;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume * level, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + decay / ratio);
      osc.connect(gain).connect(this.master!);
      osc.start(start);
      osc.stop(start + decay / ratio + 0.05);
    }
  }

  /** Mar: ruido filtrado con un vaivén lento de volumen, como oleaje lejano. */
  private startSea(ctx: AudioContext): void {
    if (this.sea) return;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; } // ruido "marrón"
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(SEA_VOLUME, ctx.currentTime + 1);
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.11;
    depth.gain.value = SEA_VOLUME * 0.45;
    lfo.connect(depth).connect(gain.gain);
    source.connect(filter).connect(gain).connect(this.master!);
    source.start();
    lfo.start();
    this.sea = { source, gain, lfo };
  }

  private stopSea(fade: number): void {
    const sea = this.sea;
    if (!sea) return;
    this.sea = null;
    try {
      const now = this.ctx!.currentTime;
      sea.gain.gain.cancelScheduledValues(now);
      sea.gain.gain.setValueAtTime(Math.max(sea.gain.gain.value, 0.0001), now);
      sea.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
      sea.source.stop(now + fade + 0.05);
      sea.lfo.stop(now + fade + 0.05);
    } catch { /* ya estaba detenido */ }
  }
}
