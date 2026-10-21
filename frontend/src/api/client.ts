export interface Island { id: string; nombre: string; tipo: string }
export interface Edge { origen: string; destino: string; costo: number }
export interface World { ubicaciones: Island[]; rutas: Edge[] }
export interface Route { vertices: string[]; costoTotal: number }
async function get(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal: signal ?? AbortSignal.timeout(12000) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detalle || 'No pudimos contactar al puerto. Revisá que Spring Boot y Neo4j estén disponibles.');
  }
  return response.json();
}
export async function fetchWorld(): Promise<World> {
  const data = await get('/api/juego/mapa') as World;
  if (!Array.isArray(data.ubicaciones) || !Array.isArray(data.rutas) || !data.ubicaciones.some(i => i.id === 'PR')) throw new Error('El mapa recibido no contiene Puerto Real. Revisá la carga inicial.');
  const ids = new Set(data.ubicaciones.map(i => i.id));
  if (data.rutas.some(r => !ids.has(r.origen) || !ids.has(r.destino) || !Number.isFinite(r.costo) || r.costo < 0)) throw new Error('El mapa contiene rutas inválidas.');
  return data;
}
export async function fetchRoute(origin: string, destination: string): Promise<Route> {
  const data = await get(`/api/grafo/dijkstra?${new URLSearchParams({ origen: origin, destino: destination })}`) as Route;
  if (!Array.isArray(data.vertices) || data.vertices[0] !== origin || data.vertices.at(-1) !== destination || !Number.isFinite(data.costoTotal) || data.costoTotal < 0) throw new Error('El puerto devolvió un itinerario inválido.');
  return data;
}
