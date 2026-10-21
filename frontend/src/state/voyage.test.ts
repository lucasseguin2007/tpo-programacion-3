import { describe, expect, it } from 'vitest';
import { legCost, validateVoyage } from './voyage';
import type { World } from '../api/client';
const world: World = { ubicaciones: [], rutas: [{ origen: 'PR', destino: 'FN', costo: 9 }, { origen: 'FN', destino: 'IP', costo: 8 }] };
const route = { vertices: ['PR', 'FN', 'IP'], costoTotal: 17 };
describe('travesías con costos del backend', () => {
  it('acepta combustible exacto y respeta rutas bidireccionales', () => {
    expect(() => validateVoyage(world, route, 17)).not.toThrow();
    expect(legCost(world, 'IP', 'FN')).toBe(8);
  });
  it('impide zarpar con combustible insuficiente', () => expect(() => validateVoyage(world, route, 16)).toThrow('1 UC'));
  it('rechaza discrepancias entre el mapa y el itinerario', () => expect(() => validateVoyage(world, { ...route, costoTotal: 16 }, 30)).toThrow('costos'));
  it('rechaza un tramo inexistente', () => expect(() => validateVoyage(world, { vertices: ['PR', 'IP'], costoTotal: 17 }, 30)).toThrow('inexistente'));
  it('no permite un viaje al mismo puerto', () => expect(() => validateVoyage(world, { vertices: ['PR'], costoTotal: 0 }, 30)).toThrow('Ya estás'));
});
