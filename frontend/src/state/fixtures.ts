import type { Route, World } from '../api/client';
import type { SailHandlers, Sailor } from './navigation';

/** El archipiélago del TPO: 8 ubicaciones, 14 rutas bidireccionales. Solo para pruebas. */
export const WORLD: World = {
  ubicaciones: [
    { id: 'PR', nombre: 'Puerto Real', tipo: 'PUERTO' }, { id: 'IT', nombre: 'Isla Tortuga', tipo: 'ISLA' },
    { id: 'BN', nombre: 'Bahía Negra', tipo: 'PUERTO' }, { id: 'IC', nombre: 'Isla Calavera', tipo: 'ISLA' },
    { id: 'PD', nombre: 'Puerto Dorado', tipo: 'PUERTO' }, { id: 'IK', nombre: 'Isla del Kraken', tipo: 'ISLA' },
    { id: 'FN', nombre: 'Fortaleza Naval', tipo: 'FORTALEZA' }, { id: 'IP', nombre: 'Isla Perdida', tipo: 'ISLA' },
  ],
  rutas: [
    { origen: 'PR', destino: 'IT', costo: 4 }, { origen: 'PR', destino: 'BN', costo: 7 }, { origen: 'PR', destino: 'FN', costo: 9 },
    { origen: 'IT', destino: 'BN', costo: 3 }, { origen: 'IT', destino: 'IC', costo: 6 }, { origen: 'IT', destino: 'PD', costo: 8 },
    { origen: 'BN', destino: 'IC', costo: 5 }, { origen: 'BN', destino: 'FN', costo: 6 }, { origen: 'IC', destino: 'PD', costo: 4 },
    { origen: 'IC', destino: 'IK', costo: 7 }, { origen: 'PD', destino: 'IK', costo: 3 }, { origen: 'PD', destino: 'IP', costo: 9 },
    { origen: 'IK', destino: 'IP', costo: 5 }, { origen: 'FN', destino: 'IP', costo: 8 },
  ],
};

export const TO_IP: Route = { vertices: ['PR', 'FN', 'IP'], costoTotal: 17 };
export const FN_TO_IP: Route = { vertices: ['FN', 'IP'], costoTotal: 8 };

/** Escena falsa: el test decide cuándo y cómo termina cada tramo. */
export class FakeSailor implements Sailor {
  legs: Array<{ from: string; to: string; handlers: SailHandlers }> = [];
  placed: string[] = [];
  cancelled = 0;
  sail(from: string, to: string, handlers: SailHandlers) { this.legs.push({ from, to, handlers }); }
  cancel() { this.cancelled++; }
  place(id: string) { this.placed.push(id); }
  get last() { return this.legs[this.legs.length - 1]; }
  /** Completa el tramo más reciente pasando por la mitad. */
  finish(leg = this.last) { leg.handlers.onProgress(0.5); leg.handlers.onProgress(1); leg.handlers.onArrive(); }
}

/** Promesa controlada desde afuera, para simular respuestas lentas o caídas. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
