import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { fetchWorld, type World } from './api/client';
import { SoundEngine } from './audio/sound';
import { GameCanvas } from './game/GameCanvas';
import type { ArchipelagoScene } from './game/ArchipelagoScene';
import { descriptions } from './game/world/layout';
import { messageOf, type NavEvent } from './state/navigation';
import { useNavigation } from './state/useNavigation';
import { legCost, TANK } from './state/voyage';

/**
 * Interfaz del juego. Las reglas (travesías, combustible, respuestas pendientes, guardado) viven en
 * `state/navigation.ts`; acá solo se dibuja su estado y se reenvían los clics. Las misiones de la
 * próxima etapa se suman en el controlador, sin mezclarse con botones ni animaciones.
 */
export default function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [scene, setScene] = useState<ArchipelagoScene | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const loadToken = useRef(0);

  const sound = useMemo(() => new SoundEngine(), []);
  const muted = useSyncExternalStore(sound.subscribe, () => sound.isMuted());
  const playEvent = (event: NavEvent) => {
    if (event === 'depart') sound.depart(); else if (event === 'stopover') sound.stopover(); else if (event === 'dock') sound.dock(); else sound.halt();
  };
  const { controller, state } = useNavigation(world, playEvent);
  const { current, destination, fuel, visits, route, phase, stopRequested, leg, legProgress, voyageProgress, journal } = state;
  const error = state.error || loadError;

  async function load() {
    const token = ++loadToken.current;
    setLoading(true); setLoadError('');
    try { const loaded = await fetchWorld(); if (token === loadToken.current) setWorld(loaded); }
    catch (e) { if (token === loadToken.current) setLoadError(messageOf(e, 'No se pudo cargar el mapa.')); }
    finally { if (token === loadToken.current) setLoading(false); }
  }
  useEffect(() => { void load(); return () => { loadToken.current++; }; }, []);

  // La escena solo dibuja: el controlador le ordena navegar y la vista refleja su estado.
  useEffect(() => { controller?.attachSailor(scene); return () => controller?.attachSailor(null); }, [controller, scene]);
  useEffect(() => { scene?.showRoute(route?.vertices ?? []); }, [scene, route]);
  useEffect(() => { scene?.setSelected(world ? destination : null); }, [scene, world, destination]);

  const name = (id: string) => world?.ubicaciones.find(i => i.id === id)?.nombre ?? id;
  const sailing = phase === 'sailing';
  const ready = scene !== null && controller !== null;
  const destinationName = name(destination);
  const legCosts = useMemo(() => {
    if (!world || !route) return [];
    try { return route.vertices.slice(1).map((to, i) => legCost(world, route.vertices[i], to)); } catch { return []; }
  }, [world, route]);
  const legPercent = Math.round(legProgress * 100), voyagePercent = Math.round(voyageProgress * 100);

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
          <div className="map-top"><span><i className="live-dot" /> CARTA DE NAVEGACIÓN</span>
            <button className="sound-toggle" aria-pressed={!muted} onClick={() => sound.setMuted(!muted)} title={muted ? 'Activar sonidos' : 'Silenciar sonidos'}><span aria-hidden="true">{muted ? '♪̸' : '♪'}</span> <span className="sound-label">{muted ? 'Sonido: no' : 'Sonido: sí'}</span></button>
            <span>ARCHIPIÉLAGO DEL SUR <b>✦</b></span></div>
          <div className="map-stage">
            {world ? <GameCanvas world={world} onSelect={id => controller?.select(id)} onReady={setScene} /> : <div className="empty-sea"><div className="empty-compass">✥</div><p>{loading ? 'Desplegando las cartas…' : 'Esperando noticias del puerto'}</p><small>El archipiélago se obtiene de tu servidor de juego.</small></div>}
            <div className="map-caption"><span>✦</span> {sailing ? 'Velas desplegadas. Seguimos el rumbo trazado.' : 'Seleccioná una isla para preparar tu travesía.'}</div>
            <div className="map-coordinates">34° S &nbsp; 58° O</div>
          </div>
          <div className="map-bottom"><span><i className="legend-line" /> Rutas marítimas</span><span><i className="legend-line gold" /> Rumbo trazado</span><span><i className="legend-dot origin" /> Origen</span><span><i className="legend-dot stop" /> Escala</span><span><i className="legend-dot destination" /> Destino</span><span><i className="legend-cost">9</i> Costo del tramo (UC)</span><span className="map-scale">─── &nbsp; CARTA Nº 008</span></div>
        </section>
        <aside className="sidebar">
          <section className="ship-card"><div className="eyebrow">TU NAVÍO</div><div className="ship-title"><h2>La Aurora</h2><span className="ship-icon">⚓︎</span></div><div className="ship-subtitle">BALANDRA EXPLORADORA <span className={sailing ? 'status sailing' : 'status'}>{sailing ? 'EN TRAVESÍA' : 'ATRACADA'}</span></div>
            <div className="location"><span>⌖</span><div><small>{sailing ? 'ÚLTIMA ESCALA' : 'UBICACIÓN ACTUAL'}</small><strong>{name(current)}</strong></div></div>
            <div className="fuel-label"><span>Reserva de combustible</span><strong>{fuel}<small> / {TANK} UC</small></strong></div>
            <div className="fuel-track" role="meter" aria-label="Combustible" aria-valuemin={0} aria-valuemax={TANK} aria-valuenow={fuel}><div style={{ width: `${fuel / TANK * 100}%` }} /></div>
            <div className="fuel-bottom"><span>{fuel < 10 ? 'Reserva baja' : 'Listos para el horizonte'}</span><button disabled={sailing || fuel === TANK || !controller} onClick={() => controller?.refuel()}>+ Reabastecer</button></div>
          </section>
          <section className="navigation-card"><div className="eyebrow">CARTA DE RUMBO</div><h2>¿Hacia dónde, capitán?</h2>
            <label htmlFor="destination">PRÓXIMO DESTINO</label><select id="destination" value={destination} disabled={!world || sailing} onChange={e => controller?.select(e.target.value)}>{world ? world.ubicaciones.map(i => <option key={i.id} value={i.id}>{i.nombre}{i.id === current ? ' · Estás aquí' : ''}</option>) : <option value="IP">Isla Perdida</option>}</select>
            <p className="island-description">{descriptions[destination]}</p>
            {route && <div className="route-quote"><div className="route-stops">{route.vertices.map((id, i) => <span key={`${id}-${i}`}>{i > 0 && <b title="Costo del tramo" aria-label={`tramo de ${legCosts[i - 1]} UC`}>→<small>{legCosts[i - 1]}</small></b>}{name(id)}</span>)}</div><div className="route-cost"><span>{route.vertices.length - 1} tramos · menor consumo</span><strong>{route.costoTotal} UC</strong></div></div>}
            {route && route.costoTotal > fuel && !sailing && <p className="insufficient">Faltan {route.costoTotal - fuel} UC. Reabastecé antes de zarpar.</p>}
            {sailing && leg && <div className="voyage-panel">
              <div className="voyage-next" aria-live="polite"><small>PRÓXIMO PUERTO</small><strong>{name(leg.to)}</strong></div>
              <div className="voyage-meta"><span>Tramo {leg.index} de {leg.total} · {leg.cost} UC</span><span>{legPercent}%</span></div>
              <div className="voyage-progress" role="progressbar" aria-label={`Progreso del tramo hacia ${name(leg.to)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={legPercent}><div style={{ width: `${legPercent}%` }} /></div>
              {leg.total > 1 && <small className="voyage-total">Travesía a {destinationName}: {voyagePercent}%</small>}
            </div>}
            {sailing ? <button className="primary" disabled={stopRequested} onClick={() => controller?.requestStop()}>{stopRequested ? 'Atracaremos en la próxima isla' : '⚓︎ Detener en próxima escala'}</button> : route ? <button className="primary" disabled={route.costoTotal > fuel || !ready} onClick={() => controller?.depart()}>Zarpar hacia {destinationName} <span>→</span></button> : <button className="primary" disabled={!ready || loading || phase === 'planning' || current === destination} onClick={() => void controller?.plan()}>{phase === 'planning' ? 'Consultando al navegante…' : current === destination ? 'Ya estás en este destino' : 'Trazar rumbo'} <span>→</span></button>}
            <p className="navigation-note">El navegante busca la ruta de menor consumo. La partida se guarda en cada llegada.</p>
          </section>
          <div className="progress-note"><span>◈</span><div><strong>{visits.length} de 8</strong><small>ISLAS VISITADAS</small></div><div className="progress-dots">{Array.from({ length: 8 }, (_, i) => <i className={i < visits.length ? 'visited' : ''} key={i} />)}</div></div>
        </aside>
      </div>
      {error && <div className="error-banner" role="alert"><span>⚑ {error}</span><button disabled={loading || sailing} onClick={() => { if (world) void controller?.plan(); else void load(); }}>Reintentar</button>{world && <button disabled={sailing || loading} onClick={() => { controller?.clearRoute(); void load(); }}>Recargar mapa</button>}</div>}
      <section className="journal"><div className="journal-heading"><span>≋</span><div><div className="eyebrow">CADA TRAVESÍA DEJA UNA HISTORIA</div><h2>Bitácora del capitán</h2></div><span className="journal-day">DÍA 01</span></div><div className="journal-entries" aria-live="polite">{journal.slice(0, 3).map((entry, i) => <p key={`${i}-${entry}`}><span className={i === 0 ? 'entry-dot recent' : 'entry-dot'} />{entry}</p>)}</div></section>
      <footer><span>RED DE ISLAS PIRATAS <b>✦</b> CARTAS DEL ARCHIPIÉLAGO</span><span>El mar no espera. Tu aventura tampoco.</span></footer>
    </main>
    {confirmReset && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><span className="modal-symbol">⚓︎</span><h2 id="reset-title">Una nueva singladura</h2><p>Volverás a Puerto Real con 30 UC. Se reiniciarán la travesía, las islas visitadas y la partida guardada en este navegador.</p><div><button autoFocus className="quiet" onClick={() => setConfirmReset(false)}>Seguir navegando</button><button className="primary" onClick={() => { controller?.reset(); setConfirmReset(false); }}>Comenzar de nuevo</button></div></section></div>}
  </div>;
}
