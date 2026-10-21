import { useEffect, useRef, useState } from 'react';
import { fetchRoute, fetchWorld, type Route, type World } from './api/client';
import { GameCanvas } from './game/GameCanvas';
import type { ArchipelagoScene } from './game/ArchipelagoScene';
import { descriptions } from './game/world/layout';
import { legCost, TANK, validateVoyage } from './state/voyage';

type Phase = 'docked' | 'planning' | 'sailing';
export default function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState('PR');
  const [destination, setDestination] = useState('IP');
  const [fuel, setFuel] = useState(TANK);
  const [route, setRoute] = useState<Route | null>(null);
  const [phase, setPhase] = useState<Phase>('docked');
  const [ready, setReady] = useState(false);
  const [stop, setStop] = useState(false);
  const [visits, setVisits] = useState<string[]>(['PR']);
  const [journal, setJournal] = useState(['La Aurora está lista. Elegí una isla y trazá tu primera travesía.']);
  const [confirmReset, setConfirmReset] = useState(false);
  const scene = useRef<ArchipelagoScene | null>(null);
  const request = useRef(0), voyage = useRef(0), stopRequested = useRef(false);
  const phaseRef = useRef<Phase>('docked');
  const changePhase = (value: Phase) => { phaseRef.current = value; setPhase(value); };
  const name = (id: string) => world?.ubicaciones.find(i => i.id === id)?.nombre ?? id;
  const log = (message: string) => setJournal(items => [message, ...items].slice(0, 8));
  async function load() {
    setLoading(true); setError('');
    try { setWorld(await fetchWorld()); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el mapa.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); return () => { request.current++; voyage.current++; }; }, []);
  function select(id: string) {
    if (phaseRef.current === 'sailing') return;
    request.current++; setDestination(id); setRoute(null); setError(''); changePhase('docked'); scene.current?.highlight([]);
  }
  async function plan() {
    if (!world || current === destination || phaseRef.current === 'sailing') return;
    const token = ++request.current;
    changePhase('planning'); setError(''); setRoute(null); scene.current?.highlight([]);
    try {
      const itinerary = await fetchRoute(current, destination);
      if (token !== request.current) return;
      // Check graph consistency separately from affordability so the player sees the quote.
      validateVoyage(world, itinerary, Number.POSITIVE_INFINITY);
      setRoute(itinerary); scene.current?.highlight(itinerary.vertices);
    } catch (e) { if (token === request.current) setError(e instanceof Error ? e.message : 'No se pudo trazar el rumbo.'); }
    finally { if (token === request.current) changePhase('docked'); }
  }
  function depart() {
    if (!route || !world || !scene.current || phaseRef.current !== 'docked') return;
    try { validateVoyage(world, route, fuel); } catch (e) { setError((e as Error).message); return; }
    const token = ++voyage.current;
    stopRequested.current = false; setStop(false); setError(''); changePhase('sailing');
    log(`Zarpamos hacia ${name(route.vertices.at(-1)!)}. Consumo previsto: ${route.costoTotal} UC.`);
    function next(index: number) {
      if (token !== voyage.current) return;
      const from = route!.vertices[index - 1], to = route!.vertices[index];
      const cost = legCost(world!, from, to);
      setFuel(value => Math.max(0, value - cost));
      scene.current!.sail(to, () => {
        if (token !== voyage.current) return;
        setCurrent(to); setVisits(ids => ids.includes(to) ? ids : [...ids, to]);
        log(`Arribamos a ${name(to)}. Tramo completado: ${cost} UC.`);
        if (index === route!.vertices.length - 1 || stopRequested.current) {
          changePhase('docked'); setRoute(null); setStop(false); stopRequested.current = false; scene.current?.highlight([]);
        } else next(index + 1);
      });
    }
    next(1);
  }
  function reset() {
    request.current++; voyage.current++; stopRequested.current = false;
    scene.current?.resetShip('PR'); setCurrent('PR'); setDestination('IP'); setFuel(TANK); setRoute(null);
    changePhase('docked'); setStop(false); setError(''); setVisits(['PR']); setConfirmReset(false);
    setJournal(['Nueva singladura. Puerto Real nos espera con las bodegas listas.']);
  }
  const sailing = phase === 'sailing';
  const destinationName = name(destination);
  return <div className="app-shell">
    <header className="masthead">
      <a className="brand" href="#" aria-label="Cartas del Archipiélago"><span className="brand-mark">⚓︎</span><span><small>RED DE ISLAS PIRATAS</small><strong>Cartas del Archipiélago</strong></span></a>
      <div className="edition"><span className="gold-dot" /> PRIMERA SINGLADURA <span className="edition-number">01</span></div>
      <button className="quiet" onClick={() => setConfirmReset(true)}>↺ <span>Nueva partida</span></button>
    </header>
    <main>
      <div className="page-heading"><div><div className="eyebrow">TU HISTORIA EMPIEZA EN EL MAR</div><h1>Un horizonte por descubrir<span>.</span></h1></div><p>Ocho islas. Un barco. Tu próximo rumbo.</p></div>
      <div className="game-layout">
        <section className="map-panel" aria-label="Carta del archipiélago">
          <div className="map-top"><span><i className="live-dot" /> CARTA DE NAVEGACIÓN</span><span>ARCHIPIÉLAGO DEL SUR <b>✦</b></span></div>
          <div className="map-stage">
            {world ? <GameCanvas world={world} onSelect={select} onReady={value => { scene.current = value; value?.resetShip(current); if (route) value?.highlight(route.vertices); setReady(!!value); }} /> : <div className="empty-sea"><div className="empty-compass">✥</div><p>{loading ? 'Desplegando las cartas…' : 'Esperando noticias del puerto'}</p><small>El archipiélago se obtiene de tu servidor de juego.</small></div>}
            <div className="map-caption"><span>✦</span> {sailing ? 'Velas desplegadas. Seguimos el rumbo trazado.' : 'Seleccioná una isla para preparar tu travesía.'}</div>
            <div className="map-coordinates">34° S &nbsp; 58° O</div>
          </div>
          <div className="map-bottom"><span><i className="legend-line" /> Rutas marítimas</span><span><i className="legend-line gold" /> Rumbo trazado</span><span className="map-scale">─── &nbsp; CARTA Nº 008</span></div>
        </section>
        <aside className="sidebar">
          <section className="ship-card"><div className="eyebrow">TU NAVÍO</div><div className="ship-title"><h2>La Aurora</h2><span className="ship-icon">⚓︎</span></div><div className="ship-subtitle">BALANDRA EXPLORADORA <span className={sailing ? 'status sailing' : 'status'}>{sailing ? 'EN TRAVESÍA' : 'ATRACADA'}</span></div>
            <div className="location"><span>⌖</span><div><small>{sailing ? 'ÚLTIMA ESCALA' : 'UBICACIÓN ACTUAL'}</small><strong>{name(current)}</strong></div></div>
            <div className="fuel-label"><span>Reserva de combustible</span><strong>{fuel}<small> / {TANK} UC</small></strong></div>
            <div className="fuel-track" role="meter" aria-label="Combustible" aria-valuemin={0} aria-valuemax={TANK} aria-valuenow={fuel}><div style={{ width: `${fuel / TANK * 100}%` }} /></div>
            <div className="fuel-bottom"><span>{fuel < 10 ? 'Reserva baja' : 'Listos para el horizonte'}</span><button disabled={sailing || fuel === TANK || !world} onClick={() => { setFuel(TANK); log('Reabastecimiento de prueba: reserva completa, 30 UC.'); }}>+ Reabastecer</button></div>
          </section>
          <section className="navigation-card"><div className="eyebrow">CARTA DE RUMBO</div><h2>¿Hacia dónde, capitán?</h2>
            <label htmlFor="destination">PRÓXIMO DESTINO</label><select id="destination" value={destination} disabled={!world || sailing} onChange={e => select(e.target.value)}>{world ? world.ubicaciones.map(i => <option key={i.id} value={i.id}>{i.nombre}{i.id === current ? ' · Estás aquí' : ''}</option>) : <option value="IP">Isla Perdida</option>}</select>
            <p className="island-description">{descriptions[destination]}</p>
            {route && <div className="route-quote"><div className="route-stops">{route.vertices.map((id, i) => <span key={`${id}-${i}`}>{i > 0 && <b>→</b>}{name(id)}</span>)}</div><div className="route-cost"><span>{route.vertices.length - 1} tramos · menor consumo</span><strong>{route.costoTotal} UC</strong></div></div>}
            {route && route.costoTotal > fuel && <p className="insufficient">Faltan {route.costoTotal - fuel} UC. Reabastecé antes de zarpar.</p>}
            {sailing ? <button className="primary" disabled={stop} onClick={() => { stopRequested.current = true; setStop(true); }}>{stop ? 'Atracaremos en la próxima isla' : '⚓︎ Detener en próxima escala'}</button> : route ? <button className="primary" disabled={route.costoTotal > fuel || !ready} onClick={depart}>Zarpar hacia {destinationName} <span>→</span></button> : <button className="primary" disabled={!world || !ready || loading || phase === 'planning' || current === destination} onClick={() => void plan()}>{phase === 'planning' ? 'Consultando al navegante…' : current === destination ? 'Ya estás en este destino' : 'Trazar rumbo'} <span>→</span></button>}
            <p className="navigation-note">El navegante busca la ruta de menor consumo.</p>
          </section>
          <div className="progress-note"><span>◈</span><div><strong>{visits.length} de 8</strong><small>ISLAS VISITADAS</small></div><div className="progress-dots">{Array.from({ length: 8 }, (_, i) => <i className={i < visits.length ? 'visited' : ''} key={i} />)}</div></div>
        </aside>
      </div>
      {error && <div className="error-banner" role="alert"><span>⚑ {error}</span><button disabled={loading || sailing} onClick={() => { if (world) void plan(); else void load(); }}>Reintentar</button>{world && <button disabled={sailing || loading} onClick={() => { request.current++; setRoute(null); scene.current?.highlight([]); changePhase('docked'); void load(); }}>Recargar mapa</button>}</div>}
      <section className="journal"><div className="journal-heading"><span>≋</span><div><div className="eyebrow">CADA TRAVESÍA DEJA UNA HISTORIA</div><h2>Bitácora del capitán</h2></div><span className="journal-day">DÍA 01</span></div><div className="journal-entries" aria-live="polite">{journal.slice(0, 3).map((entry, i) => <p key={`${i}-${entry}`}><span className={i === 0 ? 'entry-dot recent' : 'entry-dot'} />{entry}</p>)}</div></section>
      <footer><span>RED DE ISLAS PIRATAS <b>✦</b> CARTAS DEL ARCHIPIÉLAGO</span><span>El mar no espera. Tu aventura tampoco.</span></footer>
    </main>
    {confirmReset && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><span className="modal-symbol">⚓︎</span><h2 id="reset-title">Una nueva singladura</h2><p>Volverás a Puerto Real con 30 UC. Se reiniciarán la travesía y las islas visitadas de esta sesión.</p><div><button autoFocus className="quiet" onClick={() => setConfirmReset(false)}>Seguir navegando</button><button className="primary" onClick={reset}>Comenzar de nuevo</button></div></section></div>}
  </div>;
}
