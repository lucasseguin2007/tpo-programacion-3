import type { Route, World } from '../api/client';
import type { SaveSlot } from './save';
import { legCost, TANK, validateVoyage } from './voyage';

/**
 * Reglas de navegación del juego: travesías, combustible, respuestas pendientes y guardado.
 * No conoce React ni Phaser: la escena se acopla mediante `Sailor` y la interfaz lee `getState()`.
 * Las misiones de la próxima etapa deberían enchufarse acá (o escuchando `onEvent`),
 * sin tocar animaciones ni botones.
 */

export type Phase = 'docked' | 'planning' | 'sailing';
export const START = 'PR';
export const JOURNAL_LIMIT = 8;
/** Cuánto debe avanzar un tramo para publicar un nuevo estado (evita renderizar por cuadro). */
export const PROGRESS_STEP = 0.01;
const FIRST_ENTRY = 'La Aurora está lista. Elegí una isla y trazá tu primera travesía.';

export interface LegInfo { from: string; to: string; index: number; total: number; cost: number }

export interface NavState {
  current: string;
  destination: string;
  fuel: number;
  visits: string[];
  route: Route | null;
  phase: Phase;
  stopRequested: boolean;
  /** Tramo en curso; null cuando el barco está atracado. */
  leg: LegInfo | null;
  /** Avance 0..1 del tramo en curso y de toda la travesía. */
  legProgress: number;
  voyageProgress: number;
  error: string;
  journal: string[];
}

/** 'halt' = la travesía terminó de golpe (reinicio, escena perdida): útil para cortar sonidos. */
export type NavEvent = 'depart' | 'stopover' | 'dock' | 'halt';

export interface SailHandlers { onProgress(progress: number): void; onArrive(): void }
/** Lo que el controlador necesita de la escena. La implementa ArchipelagoScene. */
export interface Sailor {
  sail(from: string, to: string, handlers: SailHandlers): void;
  cancel(): void;
  place(id: string): void;
}

export interface NavDeps {
  world: World;
  fetchRoute(origin: string, destination: string, signal: AbortSignal): Promise<Route>;
  slot: SaveSlot;
  onEvent?(event: NavEvent): void;
}

export function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export class NavigationController {
  private state: NavState;
  private readonly listeners = new Set<() => void>();
  private planToken = 0;
  private voyageToken = 0;
  private planAbort: AbortController | null = null;
  private sailor: Sailor | null = null;
  private legStartFuel = TANK;
  private disposed = false;

  constructor(private readonly deps: NavDeps) {
    const saved = deps.slot.load(deps.world);
    if (saved) {
      this.legStartFuel = saved.fuel;
      this.state = {
        ...this.fresh(saved.current),
        fuel: saved.fuel,
        visits: saved.visits,
        journal: [`Retomamos la singladura desde ${this.nameOf(saved.current)}.`, ...saved.journal].slice(0, JOURNAL_LIMIT),
      };
    } else {
      this.state = this.fresh(START);
    }
  }

  // ---- lectura -------------------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getState = (): NavState => this.state;
  nameOf(id: string): string { return this.deps.world.ubicaciones.find(i => i.id === id)?.nombre ?? id; }

  // ---- acoplamiento con la escena ------------------------------------------------------

  /** La escena se conecta (o desconecta con null). Perderla en plena travesía la cancela. */
  attachSailor(sailor: Sailor | null): void {
    if (this.disposed || sailor === this.sailor) return;
    const previous = this.sailor;
    this.sailor = sailor;
    if (this.state.phase === 'sailing') {
      this.abortVoyage('La carta se recargó durante la travesía. Volvimos a la última escala.', previous);
    }
    sailor?.place(this.state.current);
  }

  // ---- acciones del jugador ------------------------------------------------------------

  select(id: string): void {
    if (this.disposed || this.state.phase === 'sailing') return;
    if (!this.deps.world.ubicaciones.some(island => island.id === id)) return;
    this.cancelPlanning();
    this.set({ destination: id, route: null, error: '', phase: 'docked' });
  }

  /** Descarta la ruta trazada y cualquier consulta en vuelo. */
  clearRoute(): void {
    if (this.disposed || this.state.phase === 'sailing') return;
    this.cancelPlanning();
    this.set({ route: null, error: '', phase: 'docked' });
  }

  async plan(): Promise<void> {
    const { world } = this.deps;
    const { current, destination, phase } = this.state;
    if (this.disposed || phase === 'sailing' || current === destination) return;
    this.cancelPlanning();
    const token = this.planToken;
    const abort = new AbortController();
    this.planAbort = abort;
    this.set({ phase: 'planning', error: '', route: null });
    try {
      const itinerary = await this.deps.fetchRoute(current, destination, abort.signal);
      if (!this.isCurrentPlan(token)) return;
      // Un itinerario ajeno a esta consulta (otro origen o destino) nunca debe poder zarpar.
      if (itinerary.vertices[0] !== current || itinerary.vertices[itinerary.vertices.length - 1] !== destination) {
        throw new Error('El puerto devolvió un itinerario que no coincide con tu ubicación y destino.');
      }
      // La consistencia con el mapa se valida aparte de la autonomía: el jugador ve el costo.
      validateVoyage(world, itinerary, Number.POSITIVE_INFINITY);
      this.set({ route: itinerary });
    } catch (error) {
      if (this.isCurrentPlan(token)) this.set({ error: messageOf(error, 'No se pudo trazar el rumbo.') });
    } finally {
      if (this.isCurrentPlan(token)) {
        this.planAbort = null;
        this.set({ phase: 'docked' });
      }
    }
  }

  depart(): void {
    const { world } = this.deps;
    const { route, phase, fuel } = this.state;
    const sailor = this.sailor;
    if (this.disposed || !route || !sailor || phase !== 'docked') return;
    try { validateVoyage(world, route, fuel); } catch (error) { this.set({ error: messageOf(error, 'No se puede zarpar.') }); return; }

    const token = ++this.voyageToken;
    const total = route.costoTotal;
    const legs = route.vertices.length - 1;
    let spent = 0;
    this.set({
      phase: 'sailing', stopRequested: false, error: '', legProgress: 0, voyageProgress: 0,
      journal: this.journalWith(`Zarpamos hacia ${this.nameOf(route.vertices[legs])}. Consumo previsto: ${total} UC.`),
    });
    this.emit('depart');

    const run = (index: number) => {
      if (!this.isCurrentVoyage(token)) return;
      const from = route.vertices[index - 1];
      const to = route.vertices[index];
      const cost = legCost(world, from, to);
      const before = spent;
      let arrived = false;
      this.legStartFuel = this.state.fuel;
      this.set({
        fuel: Math.max(0, this.state.fuel - cost),
        leg: { from, to, index, total: legs, cost },
        legProgress: 0,
        voyageProgress: total > 0 ? before / total : 0,
      });
      sailor.sail(from, to, {
        onProgress: value => {
          if (arrived || !this.isCurrentVoyage(token)) return;
          const legProgress = Math.min(1, Math.max(0, value));
          if (legProgress - this.state.legProgress < PROGRESS_STEP) return;
          this.set({ legProgress, voyageProgress: total > 0 ? (before + cost * legProgress) / total : 1 });
        },
        onArrive: () => {
          if (arrived || !this.isCurrentVoyage(token)) return;
          arrived = true;
          spent += cost;
          const finished = index === legs || this.state.stopRequested;
          const visits = this.state.visits.includes(to) ? this.state.visits : [...this.state.visits, to];
          this.set({
            current: to, visits, legProgress: 1, voyageProgress: total > 0 ? spent / total : 1,
            journal: this.journalWith(`Arribamos a ${this.nameOf(to)}. Tramo completado: ${cost} UC.`),
          });
          this.persist(); // cada llegada deja una partida coherente: ubicación, combustible y visitas
          if (finished) {
            this.set({ phase: 'docked', route: null, leg: null, stopRequested: false, legProgress: 0, voyageProgress: 0 });
            this.emit('dock');
          } else {
            this.emit('stopover');
            run(index + 1);
          }
        },
      });
    };
    run(1);
  }

  requestStop(): void {
    if (this.disposed || this.state.phase !== 'sailing' || this.state.stopRequested) return;
    this.set({ stopRequested: true });
  }

  /** Reabastecimiento gratuito de la etapa 1; en la etapa 2 pasará a depender del puerto. */
  refuel(): void {
    if (this.disposed || this.state.phase === 'sailing' || this.state.fuel >= TANK) return;
    this.set({ fuel: TANK, journal: this.journalWith(`Reabastecimiento de prueba: reserva completa, ${TANK} UC.`) });
    this.persist();
  }

  reset(): void {
    if (this.disposed) return;
    this.voyageToken++;
    this.cancelPlanning();
    this.sailor?.cancel();
    this.sailor?.place(START);
    this.deps.slot.clear();
    this.legStartFuel = TANK;
    this.set({ ...this.fresh(START), journal: ['Nueva singladura. Puerto Real nos espera con las bodegas listas.'] });
    this.emit('halt');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.voyageToken++;
    this.planToken++;
    this.planAbort?.abort();
    this.sailor?.cancel();
    this.sailor = null;
    this.listeners.clear();
  }

  // ---- internos ------------------------------------------------------------------------

  private fresh(current: string): NavState {
    const ids = this.deps.world.ubicaciones.map(i => i.id);
    const destination = ['IP', START, ...ids].find(id => id !== current && ids.includes(id)) ?? current;
    return {
      current, destination, fuel: TANK, visits: [current], route: null, phase: 'docked', stopRequested: false,
      leg: null, legProgress: 0, voyageProgress: 0, error: '', journal: [FIRST_ENTRY],
    };
  }

  private set(patch: Partial<NavState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }

  private journalWith(message: string): string[] { return [message, ...this.state.journal].slice(0, JOURNAL_LIMIT); }

  private persist(): void {
    const { current, fuel, visits, journal } = this.state;
    this.deps.slot.save({ current, fuel, visits, journal });
  }

  private emit(event: NavEvent): void {
    try { this.deps.onEvent?.(event); } catch { /* un sonido que falla no debe frenar la partida */ }
  }

  private cancelPlanning(): void {
    this.planToken++;
    this.planAbort?.abort();
    this.planAbort = null;
  }

  private isCurrentPlan(token: number): boolean { return !this.disposed && token === this.planToken; }
  private isCurrentVoyage(token: number): boolean { return !this.disposed && token === this.voyageToken && this.state.phase === 'sailing'; }

  private abortVoyage(message: string, sailor: Sailor | null): void {
    this.voyageToken++;
    sailor?.cancel();
    this.set({
      fuel: this.legStartFuel, phase: 'docked', route: null, leg: null, stopRequested: false,
      legProgress: 0, voyageProgress: 0, error: message,
    });
    this.emit('halt');
  }
}
