import { describe, expect, it } from 'vitest';
import { angleGap, stepHeading, turnDelayMs, wrapAngle } from './steering';

const RATE = 2.4;
const deg = (d: number) => d * Math.PI / 180;

describe('giro de la proa', () => {
  it('normaliza ángulos', () => {
    expect(wrapAngle(deg(190))).toBeCloseTo(deg(-170));
    expect(wrapAngle(deg(-190))).toBeCloseTo(deg(170));
    expect(wrapAngle(deg(720))).toBeCloseTo(0);
    expect(angleGap(deg(170), deg(-170))).toBeCloseTo(deg(20)); // por el camino corto, cruzando ±180°
  });

  it('gira por el camino más corto, incluso cruzando ±180°', () => {
    expect(stepHeading(deg(170), deg(-170), RATE, 0.05)).toBeGreaterThan(deg(170)); // sigue hacia +180, no da la vuelta larga
    expect(stepHeading(deg(10), deg(-10), RATE, 0.01)).toBeLessThan(deg(10));
    expect(stepHeading(deg(-170), deg(170), RATE, 0.05)).toBeLessThan(deg(-170));
  });

  it('avanza a lo sumo rate × dt y llega exacto sin pasarse', () => {
    expect(stepHeading(0, Math.PI / 2, RATE, 0.1)).toBeCloseTo(0.24);
    expect(stepHeading(0, 0.1, RATE, 0.1)).toBe(0.1);
    expect(stepHeading(1, 1, RATE, 1)).toBe(1);
  });

  it('el tiempo real manda: un cuadro lento gira lo mismo que varios rápidos', () => {
    let fast = 0;
    for (let i = 0; i < 30; i++) fast = stepHeading(fast, Math.PI, RATE, 1 / 60);
    expect(stepHeading(0, Math.PI, RATE, 0.5)).toBeCloseTo(fast, 6);
  });

  it('una media vuelta completa tarda ~1,3 s', () => {
    let h = 0, t = 0;
    while (angleGap(h, Math.PI) > 1e-9 && t < 5) { h = stepHeading(h, Math.PI, RATE, 1 / 60); t += 1 / 60; }
    expect(t).toBeGreaterThan(1.2); expect(t).toBeLessThan(1.45);
  });

  it('dt o velocidad inválidos no mueven ni rompen el rumbo', () => {
    expect(stepHeading(1, 2, RATE, -1)).toBeCloseTo(1);
    expect(stepHeading(1, 2, 0, 1)).toBeCloseTo(1);
  });
});

describe('espera antes de avanzar', () => {
  it('no espera si ya mira casi hacia donde va', () => {
    expect(turnDelayMs(0, deg(10), RATE)).toBe(0);
  });

  it('espera lo que falta para quedar alineada, con tope', () => {
    const d = turnDelayMs(0, deg(90), RATE);
    expect(d).toBeGreaterThan(300); expect(d).toBeLessThan(700);
    expect(turnDelayMs(0, Math.PI, RATE)).toBeGreaterThan(d);
    expect(turnDelayMs(0, Math.PI, RATE, 0.35, 500)).toBe(500);
  });

  it('cuando sale, la proa ya está dentro del margen de alineación', () => {
    const target = deg(150);
    const wait = turnDelayMs(0, target, RATE) / 1000;
    expect(angleGap(stepHeading(0, target, RATE, wait), target)).toBeLessThanOrEqual(0.36);
  });

  it('velocidad inválida: no espera', () => expect(turnDelayMs(0, 3, 0)).toBe(0));
});
