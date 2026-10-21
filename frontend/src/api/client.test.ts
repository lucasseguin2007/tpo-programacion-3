import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRoute, fetchWorld, NETWORK_MESSAGE, REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE, UNREADABLE_MESSAGE } from './client';
import { TO_IP, WORLD } from '../state/fixtures';

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, ...init });
/** fetch que nunca responde y falla con AbortError cuando se cancela, como el real. */
const hanging = () => vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_res, rej) => {
  const abort = () => rej(new DOMException('cancelado', 'AbortError'));
  if (init?.signal?.aborted) abort(); // el fetch real también rechaza al instante con una señal ya cancelada
  else init?.signal?.addEventListener('abort', abort);
}));

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('cliente HTTP: conexión y errores', () => {
  it('pide el mapa y el itinerario a los endpoints existentes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(WORLD))
      .mockResolvedValueOnce(json(TO_IP));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchWorld()).toEqual(WORLD);
    expect(await fetchRoute('PR', 'IP')).toEqual(TO_IP);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/juego/mapa');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/grafo/dijkstra?origen=PR&destino=IP');
  });

  it('servidor caído: mensaje claro en lugar de "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(fetchRoute('PR', 'IP')).rejects.toThrow(NETWORK_MESSAGE);
    await expect(fetchWorld()).rejects.toThrow(NETWORK_MESSAGE);
  });

  it('respuesta de error del backend: muestra su detalle', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detalle: 'Ubicación desconocida: ZZ' }, { status: 400 })));
    await expect(fetchRoute('PR', 'ZZ')).rejects.toThrow('Ubicación desconocida: ZZ');
  });

  it('error del backend sin cuerpo útil: mensaje genérico de conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })));
    await expect(fetchRoute('PR', 'IP')).rejects.toThrow(NETWORK_MESSAGE);
  });

  it('respuesta que no es JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('hola', { status: 200 })));
    await expect(fetchRoute('PR', 'IP')).rejects.toThrow(UNREADABLE_MESSAGE);
  });

  it('un puerto que no contesta se corta por tiempo y lo dice', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', hanging());
    const result = expect(fetchRoute('PR', 'IP')).rejects.toThrow(TIMEOUT_MESSAGE);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    await result;
  });

  it('cancelar desde afuera propaga AbortError (no es un error para mostrar)', async () => {
    vi.stubGlobal('fetch', hanging());
    const controller = new AbortController();
    const pending = fetchRoute('PR', 'IP', controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('una señal ya cancelada ni siquiera espera', async () => {
    vi.stubGlobal('fetch', hanging());
    const controller = new AbortController();
    controller.abort();
    await expect(fetchRoute('PR', 'IP', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('limpia el temporizador al terminar: no queda nada pendiente', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(TO_IP)));
    await fetchRoute('PR', 'IP');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('cliente HTTP: validación de lo recibido', () => {
  const serve = (body: unknown) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(body)));

  it('mapa sin Puerto Real', async () => {
    serve({ ubicaciones: [{ id: 'IT', nombre: 'x', tipo: 'ISLA' }], rutas: [] });
    await expect(fetchWorld()).rejects.toThrow('Puerto Real');
  });

  it('mapa con una ruta hacia una isla inexistente o costo inválido', async () => {
    serve({ ...WORLD, rutas: [{ origen: 'PR', destino: 'XX', costo: 3 }] });
    await expect(fetchWorld()).rejects.toThrow('rutas inválidas');
    serve({ ...WORLD, rutas: [{ origen: 'PR', destino: 'IT', costo: -1 }] });
    await expect(fetchWorld()).rejects.toThrow('rutas inválidas');
  });

  it('cuerpo nulo o con otra forma', async () => {
    serve(null);
    await expect(fetchWorld()).rejects.toThrow('Puerto Real');
    serve({ vertices: 'no' });
    await expect(fetchRoute('PR', 'IP')).rejects.toThrow('itinerario inválido');
  });

  it('itinerario que no empieza o no termina donde se pidió, o con costo inválido', async () => {
    serve({ vertices: ['IT', 'IP'], costoTotal: 5 });
    await expect(fetchRoute('PR', 'IP')).rejects.toThrow('itinerario inválido');
    serve({ vertices: ['PR', 'BN'], costoTotal: 5 });
    await expect(fetchRoute('PR', 'IP')).rejects.toThrow('itinerario inválido');
    serve({ vertices: ['PR', 'IP'], costoTotal: -5 });
    await expect(fetchRoute('PR', 'IP')).rejects.toThrow('itinerario inválido');
  });
});
