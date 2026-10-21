import type { Route, World } from '../api/client';
export const TANK = 30;
export function legCost(world: World, from: string, to: string): number {
  const edge = world.rutas.find(r => (r.origen === from && r.destino === to) || (r.destino === from && r.origen === to));
  if (!edge) throw new Error('El itinerario incluye un tramo inexistente. Volvé a consultar el mapa.');
  return edge.costo;
}
export function validateVoyage(world: World, route: Route, fuel: number): void {
  const total = route.vertices.slice(1).reduce((sum, to, i) => sum + legCost(world, route.vertices[i], to), 0);
  if (Math.abs(total - route.costoTotal) > 0.000001) throw new Error('Los costos del mapa cambiaron. Recargá el mapa antes de zarpar.');
  if (total > fuel) throw new Error(`Necesitás ${total - fuel} UC más para esta travesía.`);
  if (route.vertices.length < 2) throw new Error('Ya estás en ese destino.');
}
