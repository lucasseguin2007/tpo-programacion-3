/**
 * Giro de la proa, sin Phaser: así se puede probar y no depende del `delta` suavizado del motor,
 * que con cuadros lentos hacía girar al barco mucho más despacio de lo que avanzaba.
 */

/** Lleva cualquier ángulo al rango (-π, π]. */
export function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Diferencia mínima, en radianes (0..π), entre dos rumbos. */
export function angleGap(from: number, to: number): number {
  return Math.abs(wrapAngle(to - from));
}

/**
 * Gira `current` hacia `target` por el camino más corto, como máximo `rate` rad/s durante `dt` segundos.
 * Nunca se pasa del objetivo: si alcanza, queda exactamente en él.
 */
export function stepHeading(current: number, target: number, rate: number, dt: number): number {
  const diff = wrapAngle(target - current);
  const maxStep = Math.max(0, rate) * Math.max(0, dt);
  if (!Number.isFinite(diff) || Math.abs(diff) <= maxStep) return wrapAngle(target);
  return wrapAngle(current + Math.sign(diff) * maxStep);
}

/**
 * Milisegundos que el barco espera quieto antes de avanzar: lo que tarda la proa en quedar a `lead`
 * radianes del rumbo (así sale ya mirando hacia donde va, sin clavarse en seco).
 */
export function turnDelayMs(current: number, target: number, rate: number, lead = 0.35, max = 1600): number {
  if (!(rate > 0)) return 0;
  const remaining = angleGap(current, target) - lead;
  return remaining <= 0 ? 0 : Math.min(max, remaining / rate * 1000);
}
