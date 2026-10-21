import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { fetchRoute, type World } from '../api/client';
import { browserStore, SaveSlot } from './save';
import { NavigationController, type NavEvent, type NavState } from './navigation';

const noopSubscribe = () => () => {};
const IDLE: NavState = {
  current: 'PR', destination: 'IP', fuel: 0, visits: [], route: null, phase: 'docked', stopRequested: false,
  leg: null, legProgress: 0, voyageProgress: 0, error: '', journal: [],
};

/**
 * Puente fino entre el controlador y React: crea uno por mapa cargado y re-renderiza
 * solo cuando el estado cambia. No contiene reglas de juego.
 */
export function useNavigation(world: World | null, onEvent?: (event: NavEvent) => void) {
  const [controller, setController] = useState<NavigationController | null>(null);
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;

  useEffect(() => {
    if (!world) { setController(null); return; }
    const created = new NavigationController({
      world,
      fetchRoute,
      slot: new SaveSlot(browserStore()),
      onEvent: event => eventRef.current?.(event),
    });
    setController(created);
    return () => { created.dispose(); setController(c => c === created ? null : c); };
  }, [world]);

  const state = useSyncExternalStore(controller?.subscribe ?? noopSubscribe, controller?.getState ?? (() => IDLE));
  return { controller, state };
}
