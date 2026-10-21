export const WIDTH = 1100, HEIGHT = 760;
export const positions: Record<string, [number, number]> = { PR: [170, 535], IT: [230, 300], BN: [460, 490], IC: [520, 210], PD: [760, 335], IK: [835, 140], FN: [650, 635], IP: [955, 520] };
export function position(id: string): [number, number] { return positions[id] ?? [550, 380]; }
export const descriptions: Record<string, string> = { PR: 'Tu refugio entre mareas. Acá empieza toda gran historia.', IT: 'Palmeras, aguas tranquilas y secretos de viejos corsarios.', BN: 'Las luces del muelle apenas atraviesan la bruma.', IC: 'Una silueta de piedra vigila a quienes se acercan.', PD: 'El último sol enciende los tejados del puerto mercante.', IK: 'Bajo estas aguas, las leyendas todavía respiran.', FN: 'Muros de piedra y banderas sobre el paso del sur.', IP: 'Más allá de las cartas conocidas, una nueva orilla.' };

/**
 * El muelle de cada isla ocupa x+12..x+28, y-1..y+44. El barco amarra paralelo, a su derecha:
 * proa al norte, costado contra los pilotes. Así no tapa el nombre de la isla ni el muelle.
 */
export const DOCK_OFFSET: [number, number] = [46, 20];
export function dock(id: string): [number, number] {
  const [x, y] = position(id);
  return [x + DOCK_OFFSET[0], y + DOCK_OFFSET[1]];
}

/** Rumbo de amarre: proa hacia el muelle, es decir, hacia el norte (ángulo matemático). */
export const BERTH_HEADING = -Math.PI / 2;

/** "Isla del Kraken" → "KRAKEN": en pantallas chicas los nombres completos se pisan. */
export function shortName(nombre: string): string {
  const words = nombre.trim().split(/\s+/);
  return words[words.length - 1];
}

// ---- Escalado según el tamaño real del lienzo --------------------------------------------
// `displayScale` es (tamaño del mundo) / (tamaño en pantalla): 1 en pantallas grandes,
// 3 o más en un teléfono. Todo lo que se lee o se toca se agranda para compensar.
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export interface UiScale {
  displayScale: number;
  compact: boolean;
  labelFont: number;
  badgeFont: number;
  tagFont: number;
  islandScale: number;
  hitWidth: number;
  hitHeight: number;
}
export function uiScale(displayScale: number): UiScale {
  const k = Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1;
  return {
    displayScale: k,
    compact: k > 1.6,
    labelFont: clamp(11 * k, 16, 30),
    badgeFont: clamp(9 * k, 13, 26),
    tagFont: clamp(8.5 * k, 12, 22),
    islandScale: clamp(1 + (k - 1) * 0.2, 1, 1.3),
    // objetivo táctil de ~48 px en pantalla, sin que las zonas de islas vecinas se solapen
    hitWidth: clamp(48 * k, 140, 180),
    hitHeight: clamp(48 * k, 125, 140),
  };
}

// ---- Etiquetas de costo sobre las rutas --------------------------------------------------
/**
 * El nombre va centrado bajo la isla: [dx, dy] desde su centro. Con el barco amarrado de costado
 * (la popa llega a y+58) no se pisan; a la izquierda, en cambio, tapaba las rutas que llegan por ahí.
 */
export const LABEL_ANCHOR: [number, number] = [0, 84];
/** Un nombre completo en tamaño base ocupa a lo sumo ~190 px de ancho. */
const LABEL_HALF: [number, number] = [95, 18];
const LABEL_CENTER_DX = LABEL_ANCHOR[0];
const BADGE_HALF: [number, number] = [16, 12];
const ISLAND_BODY: [number, number, number, number] = [0, -24, 82, 62]; // dx, dy, rx, ry respecto de la isla
// de 0.5 hacia afuera, para preferir el centro de la ruta cuando hay lugar
const CANDIDATES = Array.from({ length: 31 }, (_, i) => 0.5 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.01 * 1.5).filter(t => t > 0.12 && t < 0.88);

export const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function rectClearance(px: number, py: number, cx: number, cy: number, hw: number, hh: number) {
  const dx = Math.max(Math.abs(px - cx) - hw, 0), dy = Math.max(Math.abs(py - cy) - hh, 0);
  return Math.hypot(dx, dy) - (px >= cx - hw && px <= cx + hw && py >= cy - hh && py <= cy + hh ? hh : 0);
}

function clearanceAt(px: number, py: number, placed: Array<[number, number]>, ids: string[]) {
  let worst = Infinity;
  for (const [ox, oy] of placed) worst = Math.min(worst, Math.max(Math.abs(px - ox) - 2 * BADGE_HALF[0], Math.abs(py - oy) - 2 * BADGE_HALF[1]));
  for (const id of ids) {
    const [x, y] = position(id);
    worst = Math.min(worst, rectClearance(px, py, x + LABEL_CENTER_DX, y + LABEL_ANCHOR[1], LABEL_HALF[0] + BADGE_HALF[0], LABEL_HALF[1] + BADGE_HALF[1]));
    const [dx, dy, rx, ry] = ISLAND_BODY;
    const q = Math.hypot((px - (x + dx)) / rx, (py - (y + dy)) / ry);
    worst = Math.min(worst, (q - 1) * Math.min(rx, ry));
  }
  return worst;
}

/**
 * Elige dónde poner el costo de cada tramo para que no tape islas, nombres ni otros costos.
 * Prueba varios puntos a lo largo de la ruta y se queda con el de mayor holgura.
 */
export function placeBadges(edges: Array<{ origen: string; destino: string }>, ids: string[]) {
  const spots = new Map<string, [number, number]>();
  const placed: Array<[number, number]> = [];
  let worstClearance = Infinity;
  for (const edge of edges) {
    const [ax, ay] = dock(edge.origen), [bx, by] = dock(edge.destino);
    let best: [number, number] = [(ax + bx) / 2, (ay + by) / 2], bestScore = -Infinity;
    for (const t of CANDIDATES) {
      const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
      const score = clearanceAt(px, py, placed, ids);
      if (score > bestScore + 0.5) { best = [px, py]; bestScore = score; }
    }
    spots.set(edgeKey(edge.origen, edge.destino), best);
    placed.push(best);
    worstClearance = Math.min(worstClearance, bestScore);
  }
  return { spots, worstClearance };
}
