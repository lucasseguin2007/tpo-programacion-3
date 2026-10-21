import { describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../state/save';
import { MUTE_KEY, SoundEngine } from './sound';

/** Contexto de audio falso: cualquier método o propiedad existe y devuelve otro falso. */
function fakeContext(initial: 'running' | 'suspended' = 'running') {
  const calls: string[] = [];
  let state = initial;
  const stub: any = new Proxy(function () {}, {
    get: (_t, prop) => {
      if (prop === 'state') return state;
      if (prop === 'resume') return () => { calls.push('resume'); state = 'running'; return Promise.resolve(); };
      if (prop === 'currentTime') return 0;
      if (prop === 'sampleRate') return 8000;
      if (prop === 'getChannelData') return () => new Float32Array(16000);
      if (prop === 'then') return undefined;
      calls.push(String(prop));
      return stub;
    },
    set: () => true,
    apply: () => stub,
  });
  return { ctx: stub as AudioContext, calls };
}

describe('sonidos', () => {
  it('arranca con sonido activado salvo que se haya silenciado antes', () => {
    expect(new SoundEngine(memoryStore(), null).isMuted()).toBe(false);
    expect(new SoundEngine(memoryStore({ [MUTE_KEY]: '1' }), null).isMuted()).toBe(true);
  });

  it('silenciar se recuerda al recargar y se puede revertir', () => {
    const store = memoryStore();
    const engine = new SoundEngine(store, null);
    engine.setMuted(true);
    expect(new SoundEngine(store, null).isMuted()).toBe(true);
    engine.setMuted(false);
    expect(new SoundEngine(store, null).isMuted()).toBe(false);
    expect(store.data.has(MUTE_KEY)).toBe(false);
  });

  it('avisa a la interfaz cuando cambia el silencio', () => {
    const engine = new SoundEngine(memoryStore(), null);
    const listener = vi.fn();
    engine.subscribe(listener);
    engine.setMuted(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('silenciado no crea ni usa el contexto de audio', () => {
    const factory = vi.fn();
    const engine = new SoundEngine(memoryStore({ [MUTE_KEY]: '1' }), factory);
    engine.depart(); engine.stopover(); engine.dock(); engine.halt();
    expect(factory).not.toHaveBeenCalled();
  });

  it('con sonido crea el contexto una sola vez y reproduce zarpe, escala y llegada', () => {
    const { ctx, calls } = fakeContext();
    const factory = vi.fn(() => ctx);
    const engine = new SoundEngine(memoryStore(), factory);
    expect(() => { engine.depart(); engine.stopover(); engine.dock(); engine.halt(); }).not.toThrow();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(calls).toContain('createOscillator');
    expect(calls).toContain('createBufferSource'); // el mar de fondo
  });

  it('silenciar durante una travesía corta el mar', () => {
    const { ctx } = fakeContext();
    const engine = new SoundEngine(memoryStore(), () => ctx);
    engine.depart();
    expect(() => engine.setMuted(true)).not.toThrow();
    expect(() => engine.dock()).not.toThrow();
  });

  it('si el navegador no tiene audio, el juego sigue en silencio', () => {
    const engine = new SoundEngine(memoryStore(), null);
    expect(() => { engine.depart(); engine.stopover(); engine.dock(); engine.halt(); }).not.toThrow();
  });

  it('si crear el contexto falla (política de autoplay, sin dispositivo) no lanza', () => {
    const engine = new SoundEngine(memoryStore(), () => { throw new Error('NotAllowedError'); });
    expect(() => engine.depart()).not.toThrow();
  });

  it('si el almacenamiento falla, igual se puede silenciar', () => {
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    const engine = new SoundEngine(broken, null);
    expect(engine.isMuted()).toBe(false);
    expect(() => engine.setMuted(true)).not.toThrow();
    expect(engine.isMuted()).toBe(true);
  });

  it('unlock prepara el audio con un gesto, sin sonar', () => {
    const { ctx, calls } = fakeContext('suspended');
    const factory = vi.fn(() => ctx);
    const engine = new SoundEngine(memoryStore(), factory);
    engine.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(calls).toContain('resume');
    expect(calls).not.toContain('createOscillator');
  });

  it('con el contexto suspendido espera a reanudarlo antes de tocar (las notas no se pierden)', async () => {
    const { ctx, calls } = fakeContext('suspended');
    const engine = new SoundEngine(memoryStore(), () => ctx);
    engine.stopover();
    expect(calls).not.toContain('createOscillator'); // todavía no: el reloj estaba detenido
    await Promise.resolve(); await Promise.resolve();
    expect(calls).toContain('createOscillator');
  });

  it('si se silencia mientras se reanuda, no suena', async () => {
    const { ctx, calls } = fakeContext('suspended');
    const engine = new SoundEngine(memoryStore(), () => ctx);
    engine.dock();
    engine.setMuted(true);
    await Promise.resolve(); await Promise.resolve();
    expect(calls).not.toContain('createOscillator');
  });

  it('al activar el sonido suena una campanita de confirmación; al silenciar, nada', () => {
    const { ctx, calls } = fakeContext();
    const engine = new SoundEngine(memoryStore({ [MUTE_KEY]: '1' }), () => ctx);
    engine.setMuted(true);
    expect(calls).not.toContain('createOscillator');
    engine.setMuted(false);
    expect(calls).toContain('createOscillator');
  });

  it('pasa por un limitador antes de los parlantes (volumen alto sin saturar)', () => {
    const { ctx, calls } = fakeContext();
    new SoundEngine(memoryStore(), () => ctx).unlock();
    expect(calls).toContain('createDynamicsCompressor');
  });
});
