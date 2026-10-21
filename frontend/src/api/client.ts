export interface Island { id: string; nombre: string; tipo: string }
export interface Edge { origen: string; destino: string; costo: number }
export interface World { ubicaciones: Island[]; rutas: Edge[] }
export interface Route { vertices: string[]; costoTotal: number }

export const REQUEST_TIMEOUT_MS = 12000;
export const NETWORK_MESSAGE = 'No pudimos contactar al puerto. Revisá que Spring Boot y Neo4j estén disponibles.';
export const TIMEOUT_MESSAGE = 'El puerto tardó demasiado en responder. Probá de nuevo en unos segundos.';
export const UNREADABLE_MESSAGE = 'El puerto devolvió una respuesta ilegible.';

/** Une la cancelación del llamador con un límite de tiempo, sin depender de AbortSignal.any. */
function withTimeout(signal: AbortSignal | undefined, ms: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, ms);
  const forward = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', forward, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    done: () => { clearTimeout(timer); signal?.removeEventListener('abort', forward); },
  };
}

/** Un AbortError del llamador se propaga tal cual; el resto se traduce a mensajes para el jugador. */
async function get(path: string, signal?: AbortSignal): Promise<unknown> {
  const guard = withTimeout(signal, REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(path, { signal: guard.signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error(guard.timedOut() ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detalle || NETWORK_MESSAGE);
    }
    try {
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error(guard.timedOut() ? TIMEOUT_MESSAGE : UNREADABLE_MESSAGE);
    }
  } finally {
    guard.done();
  }
}

export async function fetchWorld(signal?: AbortSignal): Promise<World> {
  const data = await get('/api/juego/mapa', signal) as World;
  if (!Array.isArray(data?.ubicaciones) || !Array.isArray(data.rutas) || !data.ubicaciones.some(i => i.id === 'PR')) throw new Error('El mapa recibido no contiene Puerto Real. Revisá la carga inicial.');
  const ids = new Set(data.ubicaciones.map(i => i.id));
  if (data.rutas.some(r => !ids.has(r.origen) || !ids.has(r.destino) || !Number.isFinite(r.costo) || r.costo < 0)) throw new Error('El mapa contiene rutas inválidas.');
  return data;
}

export async function fetchRoute(origin: string, destination: string, signal?: AbortSignal): Promise<Route> {
  const data = await get(`/api/grafo/dijkstra?${new URLSearchParams({ origen: origin, destino: destination })}`, signal) as Route;
  if (!Array.isArray(data?.vertices) || data.vertices[0] !== origin || data.vertices.at(-1) !== destination || !Number.isFinite(data.costoTotal) || data.costoTotal < 0) throw new Error('El puerto devolvió un itinerario inválido.');
  return data;
}
