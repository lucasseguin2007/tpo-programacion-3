import { describe, expect, it } from 'vitest';
import { WORLD } from '../../state/fixtures';
import { BERTH_HEADING, dock, edgeKey, HEIGHT, LABEL_ANCHOR, placeBadges, position, shortName, uiScale, WIDTH } from './layout';

const ids = WORLD.ubicaciones.map(i => i.id);

describe('geometría del mapa', () => {
  it('cada isla tiene un punto de atraque propio, junto al muelle y dentro del lienzo', () => {
    const seen = new Set<string>();
    for (const id of ids) {
      const [x, y] = dock(id), [ix, iy] = position(id);
      expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(WIDTH);
      expect(y).toBeGreaterThan(iy); expect(y).toBeLessThan(iy + 44); // a la altura del muelle, no debajo del nombre
      expect(iy + LABEL_ANCHOR[1] + 24).toBeLessThan(HEIGHT); // el nombre entra en el lienzo
      expect(x).toBeGreaterThan(ix + 28 + 14); // a la derecha del muelle, con lugar para el casco
      seen.add(`${x},${y}`);
    }
    expect(seen.size).toBe(ids.length);
  });

  it('el rumbo de amarre apunta al norte (proa hacia el muelle)', () => expect(BERTH_HEADING).toBeCloseTo(-Math.PI / 2));

  it('los nombres cortos son únicos y legibles', () => {
    const shorts = WORLD.ubicaciones.map(i => shortName(i.nombre));
    expect(new Set(shorts).size).toBe(shorts.length);
    expect(shortName('Isla del Kraken')).toBe('Kraken');
    expect(shortName('Puerto Real')).toBe('Real');
  });
});

describe('escala de la interfaz del mapa', () => {
  it('en pantallas grandes mantiene los tamaños base y nombres completos', () => {
    const s = uiScale(1);
    expect(s).toMatchObject({ compact: false, labelFont: 16, islandScale: 1, hitWidth: 140, hitHeight: 125 });
  });

  it('en un teléfono agranda textos, islas y zonas táctiles con tope', () => {
    const phone = uiScale(3.2);
    expect(phone.compact).toBe(true);
    expect(phone.labelFont).toBeGreaterThan(uiScale(1).labelFont);
    expect(phone.labelFont / 3.2).toBeGreaterThanOrEqual(9); // ≥ 9 px reales en pantalla
    expect(phone.badgeFont / 3.2).toBeGreaterThanOrEqual(8);
    expect(phone.islandScale).toBeGreaterThan(1); expect(phone.islandScale).toBeLessThanOrEqual(1.3);
    expect(phone.hitWidth / 3.2).toBeGreaterThanOrEqual(43); // objetivo táctil usable
  });

  it('las zonas táctiles de islas vecinas nunca se solapan, ni siquiera en el máximo', () => {
    const { hitWidth, hitHeight } = uiScale(10);
    for (const a of ids) for (const b of ids) {
      if (a >= b) continue;
      const [ax, ay] = position(a), [bx, by] = position(b);
      expect(Math.abs(ax - bx) >= hitWidth || Math.abs(ay - by) >= hitHeight).toBe(true);
    }
  });

  it('valores inválidos caen a la escala base', () => {
    expect(uiScale(NaN)).toEqual(uiScale(1));
    expect(uiScale(0)).toEqual(uiScale(1));
    expect(uiScale(-3)).toEqual(uiScale(1));
  });
});

describe('costos de los tramos sobre el mapa', () => {
  const { spots, worstClearance } = placeBadges(WORLD.rutas, ids);

  it('hay un lugar para cada una de las 14 rutas, sin importar el sentido', () => {
    expect(spots.size).toBe(14);
    for (const r of WORLD.rutas) expect(spots.has(edgeKey(r.destino, r.origen))).toBe(true);
  });

  it('ningún costo queda sobre una isla, un nombre u otro costo', () => expect(worstClearance).toBeGreaterThan(0));

  it('cada costo está sobre su ruta', () => {
    for (const r of WORLD.rutas) {
      const [px, py] = spots.get(edgeKey(r.origen, r.destino))!;
      const [ax, ay] = dock(r.origen), [bx, by] = dock(r.destino);
      const cross = Math.abs((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / Math.hypot(bx - ax, by - ay);
      expect(cross).toBeLessThan(0.001);
      expect(px).toBeGreaterThanOrEqual(Math.min(ax, bx)); expect(px).toBeLessThanOrEqual(Math.max(ax, bx));
    }
  });
});
