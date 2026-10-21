import { describe, expect, it } from 'vitest';
import { memoryStore, SAVE_KEY, SaveSlot, type KeyValueStore } from './save';
import { WORLD } from './fixtures';

const good = { version: 1, current: 'FN', fuel: 21, visits: ['PR', 'FN'], journal: ['Arribamos a Fortaleza Naval.'] };
const slotWith = (value: unknown) => new SaveSlot(memoryStore({ [SAVE_KEY]: typeof value === 'string' ? value : JSON.stringify(value) }));

describe('guardado local', () => {
  it('guarda y recupera ubicación, combustible, visitas y bitácora', () => {
    const store = memoryStore();
    const slot = new SaveSlot(store);
    expect(slot.save({ current: 'FN', fuel: 21, visits: ['PR', 'FN'], journal: ['x'] })).toBe(true);
    expect(new SaveSlot(store).load(WORLD)).toEqual({ version: 1, current: 'FN', fuel: 21, visits: ['PR', 'FN'], journal: ['x'] });
  });

  it('sin partida guardada devuelve null', () => expect(new SaveSlot(memoryStore()).load(WORLD)).toBeNull());

  it('acepta un guardado válido', () => expect(slotWith(good).load(WORLD)?.current).toBe('FN'));

  it.each([
    ['JSON roto', '{no es json'],
    ['versión desconocida', { ...good, version: 2 }],
    ['isla inexistente en este mapa', { ...good, current: 'XX' }],
    ['visita inexistente', { ...good, visits: ['PR', 'XX'] }],
    ['combustible mayor al tanque', { ...good, fuel: 31 }],
    ['combustible negativo', { ...good, fuel: -1 }],
    ['combustible no numérico', { ...good, fuel: '21' }],
    ['combustible infinito', { ...good, fuel: 'Infinity' }],
    ['contenido que no es un objeto', 42],
    ['visitas que no son una lista', { ...good, visits: 'PR' }],
  ])('descarta y limpia un guardado inválido: %s', (_name, value) => {
    const store = memoryStore({ [SAVE_KEY]: typeof value === 'string' ? value : JSON.stringify(value) });
    expect(new SaveSlot(store).load(WORLD)).toBeNull();
    expect(store.data.has(SAVE_KEY)).toBe(false);
  });

  it('completa y deduplica las visitas', () => {
    const loaded = slotWith({ ...good, visits: ['PR', 'PR'] }).load(WORLD);
    expect(loaded?.visits).toEqual(['PR', 'FN']);
  });

  it('tolera una bitácora ausente o mal formada', () => expect(slotWith({ ...good, journal: 7 }).load(WORLD)?.journal).toEqual([]));

  it('sin almacenamiento disponible juega igual', () => {
    const slot = new SaveSlot(null);
    expect(slot.available).toBe(false);
    expect(slot.save({ current: 'PR', fuel: 30, visits: ['PR'], journal: [] })).toBe(false);
    expect(slot.load(WORLD)).toBeNull();
    expect(() => slot.clear()).not.toThrow();
  });

  it('si el almacenamiento falla al escribir (cuota llena) no lanza', () => {
    const broken: KeyValueStore = { getItem: () => null, setItem: () => { throw new DOMException('lleno', 'QuotaExceededError'); }, removeItem: () => { throw new Error('bloqueado'); } };
    const slot = new SaveSlot(broken);
    expect(slot.save({ current: 'PR', fuel: 30, visits: ['PR'], journal: [] })).toBe(false);
    expect(() => slot.clear()).not.toThrow();
  });

  it('clear borra la partida', () => {
    const store = memoryStore({ [SAVE_KEY]: JSON.stringify(good) });
    new SaveSlot(store).clear();
    expect(store.data.size).toBe(0);
  });
});
