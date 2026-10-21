import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Route } from '../api/client';
import { NavigationController, type NavEvent } from './navigation';
import { memoryStore, SAVE_KEY, SaveSlot } from './save';
import { deferred, FakeSailor, FN_TO_IP, TO_IP, WORLD } from './fixtures';
import { TANK } from './voyage';

type Fetch = (origin: string, destination: string, signal: AbortSignal) => Promise<Route>;

function setup(options: { store?: ReturnType<typeof memoryStore>; fetchRoute?: Fetch } = {}) {
  const store = options.store ?? memoryStore();
  const events: NavEvent[] = [];
  const fetchRoute = vi.fn<Fetch>(options.fetchRoute ?? (async () => TO_IP));
  const sailor = new FakeSailor();
  const controller = new NavigationController({ world: WORLD, fetchRoute, slot: new SaveSlot(store), onEvent: e => events.push(e) });
  controller.attachSailor(sailor);
  const saved = () => JSON.parse(store.data.get(SAVE_KEY) ?? 'null');
  const state = () => controller.getState();
  /** Traza PR→IP y deja todo listo para zarpar. */
  const planned = async () => { controller.select('IP'); await controller.plan(); };
  return { controller, sailor, store, events, fetchRoute, saved, state, planned };
}

describe('recorrido completo', () => {
  it('arranca en Puerto Real con el tanque lleno y sin guardado', () => {
    const { state, store, sailor } = setup();
    expect(state()).toMatchObject({ current: 'PR', fuel: TANK, visits: ['PR'], phase: 'docked', route: null });
    expect(store.data.size).toBe(0);
    expect(sailor.placed).toEqual(['PR']);
  });

  it('traza, zarpa, hace escala, llega y guarda en cada llegada', async () => {
    const { controller, sailor, saved, state, events, planned } = setup();
    await planned();
    expect(state().route).toEqual(TO_IP);
    expect(state().phase).toBe('docked');

    controller.depart();
    expect(state()).toMatchObject({ phase: 'sailing', fuel: 21, leg: { from: 'PR', to: 'FN', index: 1, total: 2, cost: 9 } });
    expect(sailor.legs).toHaveLength(1);
    expect(saved()).toBeNull(); // nada se guarda a mitad de un tramo

    sailor.finish();
    // en memoria el segundo tramo ya descontó; lo guardado es la escala, con el combustible de su llegada
    expect(state()).toMatchObject({ current: 'FN', fuel: 13, phase: 'sailing', leg: { to: 'IP', index: 2, cost: 8 } });
    expect(saved()).toMatchObject({ current: 'FN', fuel: 21, visits: ['PR', 'FN'] });

    sailor.finish();
    expect(state()).toMatchObject({ current: 'IP', fuel: 13, phase: 'docked', route: null, leg: null, stopRequested: false });
    expect(state().visits).toEqual(['PR', 'FN', 'IP']);
    expect(saved()).toMatchObject({ current: 'IP', fuel: 13, visits: ['PR', 'FN', 'IP'] });
    expect(events).toEqual(['depart', 'stopover', 'dock']);
  });

  it('informa el avance del tramo y de toda la travesía sin saturar de estados', async () => {
    const { controller, sailor, state, planned } = setup();
    await planned();
    controller.depart();
    const listener = vi.fn();
    controller.subscribe(listener);
    sailor.last.handlers.onProgress(0.5);
    expect(state().legProgress).toBe(0.5);
    expect(state().voyageProgress).toBeCloseTo(4.5 / 17);
    const calls = listener.mock.calls.length;
    sailor.last.handlers.onProgress(0.503); // menos de un paso: no publica
    expect(listener.mock.calls.length).toBe(calls);
    sailor.finish();
    expect(state().voyageProgress).toBeCloseTo(9 / 17);
  });

  it('registra la bitácora y la limita a 8 entradas', async () => {
    const { controller, sailor, state, planned } = setup();
    await planned();
    controller.depart();
    sailor.finish(); sailor.finish();
    expect(state().journal.slice(0, 3)).toEqual([
      'Arribamos a Isla Perdida. Tramo completado: 8 UC.',
      'Arribamos a Fortaleza Naval. Tramo completado: 9 UC.',
      'Zarpamos hacia Isla Perdida. Consumo previsto: 17 UC.',
    ]);
    for (let i = 0; i < 12; i++) controller.refuel();
    expect(state().journal.length).toBeLessThanOrEqual(8);
  });

  it('ignora llegadas duplicadas y avances posteriores a la llegada', async () => {
    const { controller, sailor, state, planned } = setup();
    await planned();
    controller.depart();
    const first = sailor.last;
    sailor.finish(first);
    const after = state();
    first.handlers.onArrive();
    first.handlers.onProgress(0.9);
    expect(state()).toBe(after);
  });
});

describe('parada, combustible y reabastecimiento', () => {
  it('detener en la próxima escala atraca allí y permite elegir otro rumbo', async () => {
    const { controller, sailor, state, events, saved, planned } = setup();
    await planned();
    controller.depart();
    controller.requestStop();
    expect(state().stopRequested).toBe(true);
    sailor.finish();
    expect(state()).toMatchObject({ current: 'FN', fuel: 21, phase: 'docked', route: null, stopRequested: false, destination: 'IP' });
    expect(sailor.legs).toHaveLength(1);
    expect(events).toEqual(['depart', 'dock']);
    expect(saved()).toMatchObject({ current: 'FN', fuel: 21 });
  });

  it('desde la escala se puede trazar y completar el resto', async () => {
    const { controller, sailor, state, fetchRoute, planned } = setup();
    await planned();
    controller.depart(); controller.requestStop(); sailor.finish();
    fetchRoute.mockResolvedValueOnce(FN_TO_IP);
    await controller.plan();
    expect(fetchRoute).toHaveBeenLastCalledWith('FN', 'IP', expect.any(AbortSignal));
    controller.depart();
    sailor.finish();
    expect(state()).toMatchObject({ current: 'IP', fuel: 13, phase: 'docked' });
  });

  it('pedir parada en el último tramo no cambia nada: igual atraca en el destino', async () => {
    const { controller, sailor, state, planned } = setup();
    await planned();
    controller.depart(); sailor.finish();
    controller.requestStop();
    sailor.finish();
    expect(state()).toMatchObject({ current: 'IP', phase: 'docked' });
  });

  it('no deja zarpar con combustible insuficiente y avisa cuánto falta', async () => {
    const store = memoryStore({ [SAVE_KEY]: JSON.stringify({ version: 1, current: 'PR', fuel: 16, visits: ['PR'], journal: [] }) });
    const { controller, sailor, state, planned } = setup({ store });
    await planned();
    controller.depart();
    expect(state().phase).toBe('docked');
    expect(state().error).toContain('1 UC');
    expect(sailor.legs).toHaveLength(0);
    controller.refuel();
    expect(state().fuel).toBe(TANK);
    controller.depart();
    expect(state().phase).toBe('sailing');
  });

  it('el combustible nunca baja de cero', async () => {
    const { controller, sailor, state, planned } = setup();
    await planned();
    controller.depart();
    expect(state().fuel).toBeGreaterThanOrEqual(0);
    sailor.finish(); sailor.finish();
    expect(state().fuel).toBeGreaterThanOrEqual(0);
  });

  it('reabastecer guarda; con el tanque lleno o navegando no hace nada', async () => {
    const { controller, state, saved, planned } = setup();
    controller.refuel();
    expect(saved()).toBeNull(); // tanque lleno: nada que hacer
    await planned();
    controller.depart();
    const sailing = state();
    controller.refuel();
    expect(state()).toBe(sailing);
  });

  it('navegando se ignoran cambios de destino y nuevos trazados', async () => {
    const { controller, state, fetchRoute, planned } = setup();
    await planned();
    controller.depart();
    const sailing = state();
    controller.select('BN');
    await controller.plan();
    controller.clearRoute();
    expect(state()).toBe(sailing);
    expect(fetchRoute).toHaveBeenCalledTimes(1);
  });

  it('rechaza destinos inexistentes y el viaje al mismo puerto', async () => {
    const { controller, state, fetchRoute } = setup();
    controller.select('XX');
    expect(state().destination).toBe('IP');
    controller.select('PR');
    await controller.plan();
    expect(fetchRoute).not.toHaveBeenCalled();
  });
});

describe('reinicio', () => {
  it('en plena travesía cancela la animación, vuelve a PR con 30 UC y borra el guardado', async () => {
    const { controller, sailor, state, store, planned } = setup();
    await planned();
    controller.depart(); sailor.finish();
    expect(store.data.has(SAVE_KEY)).toBe(true);
    const stale = sailor.last;
    controller.reset();
    expect(sailor.cancelled).toBe(1);
    expect(sailor.placed.at(-1)).toBe('PR');
    expect(state()).toMatchObject({ current: 'PR', fuel: TANK, visits: ['PR'], phase: 'docked', route: null, leg: null });
    expect(store.data.has(SAVE_KEY)).toBe(false);
    const after = state();
    stale.handlers.onProgress(0.7);
    stale.handlers.onArrive(); // la llegada que quedó pendiente no debe revivir la partida vieja
    expect(state()).toBe(after);
    expect(store.data.has(SAVE_KEY)).toBe(false);
  });

  it('emite halt para cortar los sonidos', async () => {
    const { controller, events, planned } = setup();
    await planned(); controller.depart();
    controller.reset();
    expect(events).toEqual(['depart', 'halt']);
  });
});

describe('desconexiones y respuestas tardías', () => {
  it('si el puerto no responde muestra el error, queda atracado y permite reintentar', async () => {
    const { controller, state, fetchRoute } = setup();
    fetchRoute.mockRejectedValueOnce(new Error('No pudimos contactar al puerto.'));
    controller.select('IP');
    await controller.plan();
    expect(state()).toMatchObject({ phase: 'docked', route: null, error: 'No pudimos contactar al puerto.' });
    fetchRoute.mockResolvedValueOnce(TO_IP);
    await controller.plan();
    expect(state()).toMatchObject({ phase: 'docked', route: TO_IP, error: '' });
  });

  it('un error sin mensaje usa uno genérico', async () => {
    const { controller, state, fetchRoute } = setup();
    fetchRoute.mockRejectedValueOnce('boom');
    controller.select('IP');
    await controller.plan();
    expect(state().error).toBe('No se pudo trazar el rumbo.');
  });

  it('una respuesta tardía no pisa un destino elegido después', async () => {
    const slow = deferred<Route>();
    const { controller, state, fetchRoute } = setup();
    fetchRoute.mockReturnValueOnce(slow.promise);
    controller.select('IP');
    const pending = controller.plan();
    expect(state().phase).toBe('planning');
    const signal = fetchRoute.mock.calls[0][2];
    controller.select('BN');
    expect(signal.aborted).toBe(true);
    slow.resolve(TO_IP);
    await pending;
    expect(state()).toMatchObject({ destination: 'BN', route: null, phase: 'docked', error: '' });
  });

  it('un error tardío de una consulta descartada no ensucia la pantalla', async () => {
    const slow = deferred<Route>();
    const { controller, state, fetchRoute } = setup();
    fetchRoute.mockReturnValueOnce(slow.promise);
    controller.select('IP');
    const pending = controller.plan();
    controller.select('BN');
    slow.reject(new Error('timeout viejo'));
    await pending;
    expect(state().error).toBe('');
  });

  it('con dos trazados seguidos gana el último aunque el primero llegue después', async () => {
    const first = deferred<Route>(), second = deferred<Route>();
    const { controller, state, fetchRoute } = setup();
    fetchRoute.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    controller.select('IP');
    const a = controller.plan();
    const b = controller.plan();
    second.resolve(TO_IP);
    await b;
    first.resolve({ vertices: ['PR', 'BN', 'FN', 'IP'], costoTotal: 21 });
    await a;
    expect(state().route).toEqual(TO_IP);
    expect(state().phase).toBe('docked');
  });

  it('una respuesta que llega tras un reinicio se descarta', async () => {
    const slow = deferred<Route>();
    const { controller, state, fetchRoute } = setup();
    fetchRoute.mockReturnValueOnce(slow.promise);
    controller.select('IP');
    const pending = controller.plan();
    controller.reset();
    slow.resolve(TO_IP);
    await pending;
    expect(state()).toMatchObject({ route: null, phase: 'docked' });
  });

  it('una respuesta que llega tras cerrar el controlador no cambia nada ni lanza', async () => {
    const slow = deferred<Route>();
    const { controller, fetchRoute } = setup();
    fetchRoute.mockReturnValueOnce(slow.promise);
    controller.select('IP');
    const pending = controller.plan();
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.dispose();
    slow.resolve(TO_IP);
    await expect(pending).resolves.toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  it('cerrar el controlador en plena travesía detiene la escena y silencia los callbacks', async () => {
    const { controller, sailor, state, planned } = setup();
    await planned();
    controller.depart();
    const leg = sailor.last;
    controller.dispose();
    expect(sailor.cancelled).toBe(1);
    const after = state();
    leg.handlers.onArrive();
    expect(state()).toBe(after);
  });

  it('rechaza un itinerario cuyo costo no coincide con el mapa', async () => {
    const { controller, state, fetchRoute } = setup();
    fetchRoute.mockResolvedValueOnce({ vertices: ['PR', 'FN', 'IP'], costoTotal: 16 });
    controller.select('IP');
    await controller.plan();
    expect(state().route).toBeNull();
    expect(state().error).toContain('costos');
  });

  it('rechaza un itinerario con un tramo que no existe', async () => {
    const { controller, state, fetchRoute } = setup();
    fetchRoute.mockResolvedValueOnce({ vertices: ['PR', 'IP'], costoTotal: 17 });
    controller.select('IP');
    await controller.plan();
    expect(state().route).toBeNull();
    expect(state().error).toContain('inexistente');
  });

  it('rechaza un itinerario que no parte de donde está el barco o no llega al destino pedido', async () => {
    const { controller, state, fetchRoute } = setup();
    controller.select('IP');
    fetchRoute.mockResolvedValueOnce({ vertices: ['IT', 'PR', 'FN', 'IP'], costoTotal: 21 });
    await controller.plan();
    expect(state()).toMatchObject({ route: null, phase: 'docked' });
    expect(state().error).toContain('no coincide');
    fetchRoute.mockResolvedValueOnce({ vertices: ['PR', 'FN'], costoTotal: 9 });
    await controller.plan();
    expect(state().route).toBeNull();
    expect(state().error).toContain('no coincide');
  });

  it('perder la escena en plena travesía la cancela y devuelve el combustible de la última escala', async () => {
    const { controller, sailor, state, events, planned } = setup();
    await planned();
    controller.depart();
    sailor.finish(); // llegó a FN con 21 UC y ya salió hacia IP (13 UC)
    expect(state().fuel).toBe(13);
    const stale = sailor.last;
    controller.attachSailor(null);
    expect(sailor.cancelled).toBe(1);
    expect(state()).toMatchObject({ current: 'FN', fuel: 21, phase: 'docked', route: null, leg: null });
    expect(state().error).toContain('Volvimos a la última escala');
    expect(events.at(-1)).toBe('halt');
    stale.handlers.onArrive();
    expect(state().current).toBe('FN');
    const next = new FakeSailor();
    controller.attachSailor(next);
    expect(next.placed).toEqual(['FN']);
  });
});

describe('recuperación de partida', () => {
  beforeEach(() => vi.useRealTimers());

  it('tras una recarga con el barco atracado recupera ubicación, combustible y visitas', async () => {
    const first = setup();
    await first.planned();
    first.controller.depart(); first.sailor.finish(); first.sailor.finish();
    const second = setup({ store: first.store });
    expect(second.state()).toMatchObject({ current: 'IP', fuel: 13, visits: ['PR', 'FN', 'IP'], phase: 'docked', route: null });
    expect(second.state().journal[0]).toBe('Retomamos la singladura desde Isla Perdida.');
    expect(second.state().journal).toContain('Zarpamos hacia Isla Perdida. Consumo previsto: 17 UC.');
    expect(second.state().destination).toBe('PR'); // no ofrece como destino el puerto donde ya está
    expect(second.sailor.placed).toEqual(['IP']);
  });

  it('recargar a mitad de un viaje recupera la última escala con su combustible, no el del tramo en curso', async () => {
    const first = setup();
    await first.planned();
    first.controller.depart();
    first.sailor.finish();
    expect(first.state().fuel).toBe(13); // en memoria ya se descontó el segundo tramo
    first.controller.dispose(); // se cierra la pestaña sin llegar
    const second = setup({ store: first.store });
    expect(second.state()).toMatchObject({ current: 'FN', fuel: 21, visits: ['PR', 'FN'], phase: 'docked' });
  });

  it('recargar antes de la primera llegada vuelve al inicio: nada se guardó', async () => {
    const first = setup();
    await first.planned();
    first.controller.depart();
    first.controller.dispose();
    const second = setup({ store: first.store });
    expect(second.state()).toMatchObject({ current: 'PR', fuel: TANK, visits: ['PR'] });
  });

  it('un reabastecimiento también sobrevive a la recarga', async () => {
    const first = setup({ store: memoryStore({ [SAVE_KEY]: JSON.stringify({ version: 1, current: 'FN', fuel: 5, visits: ['PR', 'FN'], journal: [] }) }) });
    first.controller.refuel();
    const second = setup({ store: first.store });
    expect(second.state()).toMatchObject({ current: 'FN', fuel: TANK });
  });

  it('un guardado corrupto o de otro mapa se ignora y se empieza de cero', () => {
    const { state } = setup({ store: memoryStore({ [SAVE_KEY]: JSON.stringify({ version: 1, current: 'ZZ', fuel: 10, visits: ['ZZ'], journal: [] }) }) });
    expect(state()).toMatchObject({ current: 'PR', fuel: TANK, visits: ['PR'] });
  });

  it('sin localStorage la partida funciona igual', async () => {
    const controller = new NavigationController({ world: WORLD, fetchRoute: async () => TO_IP, slot: new SaveSlot(null) });
    const sailor = new FakeSailor();
    controller.attachSailor(sailor);
    controller.select('IP');
    await controller.plan();
    controller.depart(); sailor.finish(); sailor.finish();
    expect(controller.getState()).toMatchObject({ current: 'IP', fuel: 13 });
  });

  it('nueva partida después de recuperar una borra el guardado', async () => {
    const first = setup();
    await first.planned();
    first.controller.depart(); first.sailor.finish(); first.sailor.finish();
    const second = setup({ store: first.store });
    second.controller.reset();
    expect(setup({ store: first.store }).state()).toMatchObject({ current: 'PR', fuel: TANK });
  });
});

describe('sin escena', () => {
  it('no zarpa si el mapa todavía no está listo', async () => {
    const controller = new NavigationController({ world: WORLD, fetchRoute: async () => TO_IP, slot: new SaveSlot(null) });
    controller.select('IP');
    await controller.plan();
    controller.depart();
    expect(controller.getState()).toMatchObject({ phase: 'docked', route: TO_IP });
  });

  it('un sonido que falla no frena la travesía', async () => {
    const controller = new NavigationController({ world: WORLD, fetchRoute: async () => TO_IP, slot: new SaveSlot(null), onEvent: () => { throw new Error('audio roto'); } });
    const sailor = new FakeSailor();
    controller.attachSailor(sailor);
    controller.select('IP');
    await controller.plan();
    expect(() => { controller.depart(); sailor.finish(); sailor.finish(); }).not.toThrow();
    expect(controller.getState().current).toBe('IP');
  });
});
