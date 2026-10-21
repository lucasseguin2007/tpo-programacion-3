import type { World } from '../api/client';
import { TANK } from './voyage';

export const SAVE_KEY = 'cartas-del-archipielago:partida:v1';
export const SAVE_VERSION = 1;

/** Lo mínimo que necesitamos de localStorage; permite probar sin navegador. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Estado que sobrevive a una recarga. Se escribe en cada llegada, nunca a mitad de un tramo. */
export interface SavedGame {
  version: typeof SAVE_VERSION;
  current: string;
  fuel: number;
  visits: string[];
  journal: string[];
}

/** localStorage si está disponible y permite escribir (modo privado, políticas del navegador). */
export function browserStore(): KeyValueStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = `${SAVE_KEY}:probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * Ranura de guardado. Nunca lanza: si el almacenamiento falla o el contenido no es
 * coherente con el mapa actual, la partida simplemente empieza de cero.
 */
export class SaveSlot {
  constructor(private readonly store: KeyValueStore | null, private readonly key = SAVE_KEY) {}

  get available(): boolean { return this.store !== null; }

  load(world: World): SavedGame | null {
    if (!this.store) return null;
    try {
      const raw = this.store.getItem(this.key);
      if (raw === null) return null;
      const game = this.validate(JSON.parse(raw), world);
      if (!game) this.clear(); // contenido inservible: no insistir en cada recarga
      return game;
    } catch {
      this.clear();
      return null;
    }
  }

  save(game: Omit<SavedGame, 'version'>): boolean {
    if (!this.store) return false;
    try {
      this.store.setItem(this.key, JSON.stringify({ version: SAVE_VERSION, ...game }));
      return true;
    } catch {
      return false; // cuota llena o almacenamiento bloqueado: se sigue jugando sin guardar
    }
  }

  clear(): void {
    try { this.store?.removeItem(this.key); } catch { /* nada que hacer */ }
  }

  private validate(data: unknown, world: World): SavedGame | null {
    if (typeof data !== 'object' || data === null) return null;
    const game = data as Record<string, unknown>;
    if (game.version !== SAVE_VERSION) return null;
    const ids = new Set(world.ubicaciones.map(island => island.id));
    if (typeof game.current !== 'string' || !ids.has(game.current)) return null;
    if (typeof game.fuel !== 'number' || !Number.isFinite(game.fuel) || game.fuel < 0 || game.fuel > TANK) return null;
    if (!isStringArray(game.visits) || game.visits.some(id => !ids.has(id))) return null;
    const visits = [...new Set(game.visits)];
    if (!visits.includes(game.current)) visits.push(game.current);
    const journal = isStringArray(game.journal) ? game.journal.slice(0, 8) : [];
    return { version: SAVE_VERSION, current: game.current, fuel: game.fuel, visits, journal };
  }
}
