import Phaser from 'phaser';
import type { World } from '../api/client';
import type { SailHandlers, Sailor } from '../state/navigation';
import { BERTH_HEADING, clamp, dock, edgeKey, HEIGHT, LABEL_ANCHOR, placeBadges, position, shortName, uiScale, WIDTH, type UiScale } from './world/layout';
import { stepHeading, turnDelayMs } from './world/steering';

const GOLD = 0xe8c27a;
const TURN_RATE = 2.4; // rad/s: una vuelta de proa completa tarda ~1,3 s
const WAKE_LIFE = 1800; // ms que tarda en borrarse la estela
const WAKE_STEP = 38; // ms entre puntos de estela
const SHADOW_OFFSET: [number, number] = [4, 8]; // la luz viene de arriba a la izquierda: la sombra cae siempre hacia abajo a la derecha
/** Dónde clavar la bandera de una isla visitada y dónde probar el cartel de rol (en coordenadas de la isla). */
const FLAG_SPOT: [number, number] = [-50, -10];
const TAG_SPOTS: Array<[number, number]> = [[0, -100], [0, -82], [0, -66], [-74, -72], [74, -72], [0, -118], [-86, -34], [86, -48]];

interface Box { left: number; right: number; top: number; bottom: number }
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

type Role = 'origin' | 'stop' | 'destination';
const ROLE_STYLE: Record<Role, { stroke: number; width: number; fill: number; fillAlpha: number; text: string; color: string; bg: string }> = {
  origin: { stroke: 0x8fd3b8, width: 3, fill: 0x8fd3b8, fillAlpha: 0.18, text: 'ORIGEN', color: '#0d2a24', bg: '#8fd3b8' },
  stop: { stroke: 0xd9bf84, width: 2, fill: 0xd9bf84, fillAlpha: 0.14, text: 'ESCALA', color: '#2a2110', bg: '#d9bf84' },
  destination: { stroke: 0xf2c879, width: 4, fill: 0xf2c879, fillAlpha: 0.3, text: 'DESTINO', color: '#2a1c06', bg: '#f2c879' },
};

interface IslandView {
  id: string; x: number; y: number; name: string;
  art: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; tag: Phaser.GameObjects.Text;
  berth: Phaser.GameObjects.Ellipse; hit: Phaser.GameObjects.Zone;
}
interface WakePoint { x: number; y: number; born: number; heading: number }

export class ArchipelagoScene extends Phaser.Scene implements Sailor {
  private ship!: Phaser.GameObjects.Container;
  private hull!: Phaser.GameObjects.Container;
  private shadow!: Phaser.GameObjects.Ellipse;
  private flags = new Map<string, Phaser.GameObjects.Container>();
  private seals = new Map<string, Phaser.GameObjects.Graphics>();
  private visited = new Set<string>();
  private visitedSeen = false;
  private lastTick = 0;
  private wake!: Phaser.GameObjects.Graphics;
  private routeInk!: Phaser.GameObjects.Graphics;
  private selection!: Phaser.GameObjects.Ellipse;
  private islands = new Map<string, IslandView>();
  private badges = new Map<string, Phaser.GameObjects.Text>();
  private waves: Phaser.GameObjects.Rectangle[] = [];
  private trail: WakePoint[] = [];
  private moveTween: Phaser.Tweens.Tween | null = null;
  private moving = false;
  private heading = BERTH_HEADING;
  private targetHeading = BERTH_HEADING;
  private lastWake = 0;
  private route: string[] = [];
  private selected: string | null = null;
  private hovered: string | null = null;
  private ui: UiScale = uiScale(1);
  private lastScale = 0;
  private frame = 0;
  /** Con "reducir movimiento" se omiten las animaciones que no terminan nunca (cabeceo, pulso). */
  private calm = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  constructor(private world: World, private select: (id: string) => void, private ready: (scene: ArchipelagoScene) => void) { super('archipelago'); }

  create() {
    this.cameras.main.setBackgroundColor('#103f4b');
    this.drawSea();
    this.drawRoutes();
    this.selection = this.add.ellipse(0, 0, 176, 128).setStrokeStyle(3, GOLD, 0.9).setFillStyle(GOLD, 0.07).setDepth(5).setVisible(false);
    if (!this.calm) this.tweens.add({ targets: this.selection, alpha: 0.45, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.world.ubicaciones.forEach((island, index) => this.addIsland(island.id, island.nombre, index));
    this.drawCompass();
    this.wake = this.add.graphics().setDepth(10);
    this.buildShip();
    this.relayout(true);
    this.ready(this);
  }

  // ---- Sailor: lo que usa el controlador de navegación ----------------------------------

  /** Pone el barco amarrado en una isla, sin animar. */
  place(id: string) {
    if (!this.ship) return;
    this.cancelMotion();
    const [x, y] = dock(id);
    this.ship.setPosition(x, y);
    this.heading = this.targetHeading = BERTH_HEADING;
    this.ship.setRotation(this.heading + Math.PI / 2);
    this.trail = [];
  }

  /**
   * Navega hasta el muelle de `to`. Primero la proa gira (rápido si el rumbo cambia poco) y recién
   * entonces avanza; al llegar suelta ondas, se acomoda paralela al muelle y avisa.
   * Parte de donde esté el barco, aunque no sea `from`.
   */
  sail(_from: string, to: string, handlers: SailHandlers) {
    this.cancelMotion();
    const [tx, ty] = dock(to);
    const sx = this.ship.x, sy = this.ship.y;
    this.targetHeading = Math.atan2(ty - sy, tx - sx);
    // Sale ya mirando hacia donde va: espera lo que tarda la proa en alinearse (antes salía a medio girar).
    const delay = turnDelayMs(this.heading, this.targetHeading, TURN_RATE);
    const duration = clamp(Phaser.Math.Distance.Between(sx, sy, tx, ty) * 8, 2400, 6200);
    const progress = { t: 0 };
    this.moveTween = this.tweens.add({
      targets: progress, t: 1, delay, duration, ease: 'Sine.easeInOut',
      onStart: () => { this.moving = true; },
      onUpdate: () => { this.ship.setPosition(sx + (tx - sx) * progress.t, sy + (ty - sy) * progress.t); handlers.onProgress(progress.t); },
      onComplete: () => {
        this.moveTween = null;
        this.moving = false;
        this.ship.setPosition(tx, ty);
        this.targetHeading = BERTH_HEADING; // se acomoda paralela al muelle (si zarpa de nuevo, esto se pisa)
        this.arrivalEffect(tx, ty, to);
        handlers.onArrive();
      },
    });
  }

  cancel() { this.cancelMotion(); }

  // ---- vista: ruta, isla elegida y roles -------------------------------------------------

  /** Marca origen, escalas y destino de la ruta trazada y resalta sus tramos y costos. */
  showRoute(ids: string[]) {
    this.route = ids;
    this.routeInk.clear().lineStyle(4, GOLD, 0.95);
    for (let i = 1; i < ids.length; i++) {
      const [a, b] = dock(ids[i - 1]), [c, d] = dock(ids[i]);
      this.routeInk.lineBetween(a, b, c, d);
    }
    this.refreshStyles();
  }

  /** Destaca la isla que el jugador eligió como destino. */
  setSelected(id: string | null) {
    this.selected = id;
    this.refreshStyles();
  }

  /** Clava una bandera en cada isla visitada; la que se suma en esta llegada cae con un pequeño rebote. */
  setVisited(ids: string[]) {
    const next = new Set(ids.filter(id => this.islands.has(id)));
    const animate = this.visitedSeen;
    this.visitedSeen = true;
    for (const id of next) if (!this.visited.has(id)) this.plantFlag(id, animate);
    for (const [id, flag] of this.flags) if (!next.has(id)) { flag.destroy(); this.flags.delete(id); this.seals.get(id)?.destroy(); this.seals.delete(id); }
    this.visited = next;
    this.refreshStyles();
  }

  // ---- construcción ----------------------------------------------------------------------

  private drawSea() {
    const sea = this.add.graphics();
    for (let y = 0; y < HEIGHT; y += 8) for (let x = 0; x < WIDTH; x += 8) {
      const noise = Math.sin(x * .048 + y * .022) + Math.cos(y * .035 - x * .018);
      sea.fillStyle(noise > 1 ? 0x134650 : noise < -1 ? 0x103f4b : 0x11434e);
      sea.fillRect(x, y, 8, 8);
    }
    for (let i = 0; i < 125; i++) {
      const x = (i * 137 + 23) % WIDTH, y = (i * 83 + 51) % HEIGHT;
      this.waves.push(this.add.rectangle(x, y, 10 + i % 4 * 4, 2, 0x80bbb0, .18));
    }
    const grid = this.add.graphics().lineStyle(1, 0xa9c9bc, .045);
    for (let x = 0; x < WIDTH; x += 110) grid.lineBetween(x, 0, x, HEIGHT);
    for (let y = 0; y < HEIGHT; y += 95) grid.lineBetween(0, y, WIDTH, y);
    this.add.text(42, 32, 'MAR DE LOS SUSURROS', { fontFamily: 'Georgia', fontSize: '13px', color: '#80a9a4', letterSpacing: 5 }).setAlpha(.6);
    this.add.text(750, 737, 'AGUAS SIN CARTOGRAFIAR', { fontFamily: 'Georgia', fontSize: '11px', color: '#80a9a4', letterSpacing: 3 }).setAlpha(.5);
  }

  /** Las rutas unen muelles, no centros de isla: el barco navega exactamente por las líneas. */
  private drawRoutes() {
    const routes = this.add.graphics();
    for (const edge of this.world.rutas) {
      const [ax, ay] = dock(edge.origen), [bx, by] = dock(edge.destino);
      const distance = Phaser.Math.Distance.Between(ax, ay, bx, by);
      routes.fillStyle(0x91c9bc, .25);
      for (let t = 0; t < 1; t += 12 / distance) routes.fillCircle(ax + (bx - ax) * t, ay + (by - ay) * t, 1.4);
    }
    this.routeInk = this.add.graphics().setDepth(3);
    const { spots } = placeBadges(this.world.rutas, this.world.ubicaciones.map(i => i.id));
    for (const edge of this.world.rutas) {
      const [x, y] = spots.get(edgeKey(edge.origen, edge.destino))!;
      const badge = this.add.text(x, y, String(edge.costo), { fontFamily: 'DM Sans, sans-serif', fontStyle: 'bold', fontSize: '13px', align: 'center' }).setOrigin(.5).setDepth(8);
      this.badges.set(edgeKey(edge.origen, edge.destino), badge);
    }
  }

  private plantFlag(id: string, animate: boolean) {
    const view = this.islands.get(id);
    if (!view || this.flags.has(id)) return;
    const g = this.add.graphics();
    g.fillStyle(0x0a2a32, .45).fillEllipse(0, 1, 13, 4); // sombra en la arena
    g.fillStyle(0x2e2018).fillRect(-1, -32, 3, 33); // mástil
    g.fillStyle(0x2b1c0a).fillTriangle(2, -33, 21, -26, 2, -17); // borde
    g.fillStyle(0xf2c879).fillTriangle(3, -30.5, 16.5, -26, 3, -20.5); // gallardete dorado
    const flag = this.add.container(0, 0, [g]).setDepth(7);
    // Sello dorado con tilde junto al nombre: se ve de un vistazo qué islas ya se recorrieron.
    const seal = this.add.graphics().setDepth(7);
    seal.fillStyle(0x2b1c0a).fillCircle(0, 0, 11).fillStyle(0xf2c879).fillCircle(0, 0, 9.5);
    seal.lineStyle(2.6, 0x2b1c0a).beginPath().moveTo(-4.5, 0.5).lineTo(-1.2, 4).lineTo(5, -3.8).strokePath();
    this.flags.set(id, flag);
    this.seals.set(id, seal);
    this.layoutFlag(view, flag);
    if (animate && !this.calm) {
      const y = flag.y;
      this.tweens.add({ targets: flag, y: { from: y - 22, to: y }, alpha: { from: 0, to: 1 }, duration: 560, ease: 'Bounce.easeOut' });
      this.tweens.add({ targets: seal, alpha: { from: 0, to: 1 }, scale: { from: 0.2, to: seal.scale }, duration: 420, ease: 'Back.easeOut' });
    }
  }

  private layoutFlag(view: IslandView, flag: Phaser.GameObjects.Container) {
    const k = this.ui.islandScale;
    flag.setScale(k * 1.8).setPosition(view.x + FLAG_SPOT[0] * k, view.y + FLAG_SPOT[1] * k);
    const seal = this.seals.get(view.id);
    if (seal) {
      const box = view.label.getBounds(), f = this.ui.labelFont / 16;
      seal.setScale(f).setPosition(Math.max(12 * f, box.left - 13 * f), view.label.y);
    }
  }

  private addIsland(id: string, name: string, seed: number) {
    const [x, y] = position(id);
    const [dx, dy] = dock(id);
    const art = this.add.graphics().setPosition(x, y);
    this.drawIsland(art, id, seed);
    const berth = this.add.ellipse(dx, dy, 48, 96).setDepth(4);
    const label = this.add.text(x, y + LABEL_ANCHOR[1], name.toUpperCase(), { fontFamily: 'Georgia', fontSize: '16px', color: '#e9e4c8', backgroundColor: '#103e48' }).setOrigin(.5).setDepth(6);
    const tag = this.add.text(x, y - 104, '', { fontFamily: 'DM Sans, sans-serif', fontStyle: 'bold', fontSize: '13px' }).setOrigin(.5).setDepth(9).setVisible(false);
    const hit = this.add.zone(x, y, 140, 125).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.select(id));
    hit.on('pointerover', () => { this.hovered = id; this.refreshStyles(); });
    hit.on('pointerout', () => { if (this.hovered === id) this.hovered = null; this.refreshStyles(); });
    this.islands.set(id, { id, x, y, name, art, label, tag, berth, hit });
  }

  private buildShip() {
    const [x, y] = dock(this.world.ubicaciones.some(i => i.id === 'PR') ? 'PR' : this.world.ubicaciones[0].id);
    this.ship = this.add.container(x, y).setDepth(20);
    const shadow = this.shadow = this.add.ellipse(SHADOW_OFFSET[0], SHADOW_OFFSET[1], 34, 80, 0x061f29, .38);
    this.hull = this.add.container(0, 0);
    this.hull.add(this.drawBalandra());
    this.ship.add([shadow, this.hull]);
    this.ship.setRotation(this.heading + Math.PI / 2);
    this.keepShadowDown();
    // Cabeceo suave y balanceo: el barco nunca está del todo quieto.
    if (this.calm) return;
    this.tweens.add({ targets: this.hull, y: 1.8, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.hull, angle: 1.8, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Balandra vista desde arriba con la proa hacia -y: casco, cubierta, vela mayor, foque, mástil y gallardete. */
  private drawBalandra(): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    const poly = (color: number, points: Array<[number, number]>, alpha = 1) => g.fillStyle(color, alpha).fillPoints(points.map(([x, y]) => ({ x, y })), true);
    const rect = (color: number, x: number, y: number, w: number, h: number) => g.fillStyle(color).fillRect(x, y, w, h);
    // casco: borda oscura y cubierta de madera
    poly(0x2d1a12, [[0, -40], [7, -33], [12, -19], [14, -2], [13, 16], [10, 28], [6, 34], [-6, 34], [-10, 28], [-13, 16], [-14, -2], [-12, -19], [-7, -33]]);
    poly(0xb98a55, [[0, -35], [5, -28], [9, -17], [10, -2], [9, 15], [7, 25], [4, 30], [-4, 30], [-7, 25], [-9, 15], [-10, -2], [-9, -17], [-5, -28]]);
    for (let y = -26; y <= 26; y += 5) { const half = Math.min(9, 4 + (y + 36) * 0.18, 9 - Math.max(0, y - 14) * 0.35); rect(0x9a6f42, -half, y, half * 2, 1); }
    poly(0x6a4630, [[-7, 17], [7, 17], [6, 27], [-6, 27]]); // camarote de popa
    rect(0xf2c879, -1, 29, 3, 3); // farol
    rect(0xd9b45f, -1, -41, 3, 3); // mascarón
    // foque (adelante) y vela mayor (a lo largo de la botavara)
    poly(0xe7d7a6, [[0, -8], [0, -34], [-8, -13]]);
    poly(0xf6ebc6, [[0, -6], [15, 0], [18, 11], [13, 22], [0, 22]]);
    poly(0xd2bf8a, [[0, 8], [18, 11], [13, 22], [0, 22]], .55);
    rect(0x4a3222, -1, -6, 2, 30); // botavara
    // mástil y gallardete rojo
    g.fillStyle(0x2e2018).fillCircle(0, -6, 3.2);
    poly(0xc4452f, [[0, -7], [-4, -5], [-6, 15]]); // gallardete flameando hacia popa: marca de dónde está la proa
    return g;
  }

  /** La sombra vive dentro del barco que gira; se la contra-rota para que caiga siempre hacia el mismo lado. */
  private keepShadowDown() {
    const r = this.ship.rotation, [ox, oy] = SHADOW_OFFSET;
    this.shadow.setPosition(ox * Math.cos(r) + oy * Math.sin(r), -ox * Math.sin(r) + oy * Math.cos(r));
  }

  private drawIsland(g: Phaser.GameObjects.Graphics, id: string, seed: number) {
    const cx = 0, cy = -24; // el gráfico se posiciona en el centro de la isla; el escalado nace de ahí
    for (let y = -60; y <= 52; y += 4) for (let x = -76; x <= 76; x += 4) {
      const d = x * x / 4300 + y * y / 1900;
      const edge = 1 + .13 * Math.sin(x * .13 + seed) * Math.cos(y * .12);
      if (d < edge + .8) { g.fillStyle(d > edge + .45 ? 0x205e64 : 0x32867d, .75); g.fillRect(cx + x, cy + y + 6, 4, 4); }
      if (d < edge + .13) { g.fillStyle(0x96bc9b); g.fillRect(cx + x, cy + y + 4, 4, 4); }
      if (d < edge) { g.fillStyle(d > edge - .27 ? 0xd3b87c : ((x + y + seed * 4) % 12 === 0 ? 0x4f8254 : 0x386d4e)); g.fillRect(cx + x, cy + y, 4, 4); }
    }
    const pixel = (color: number, x: number, y: number, w: number, h: number) => g.fillStyle(color).fillRect(cx + x, cy + y, w, h);
    if (id === 'FN') {
      pixel(0x39444b, -38, -34, 76, 52); pixel(0x87918a, -34, -38, 68, 44);
      for (const x of [-38, -12, 14, 30]) { pixel(0xadb3a0, x, -48, 12, 20); pixel(0x49575a, x + 4, -36, 4, 8); }
      pixel(0x263d40, -8, -4, 16, 24); pixel(0xc2c4a4, -2, -65, 3, 25); pixel(0x9a4c3d, 1, -65, 20, 12);
    } else if (id === 'IC') {
      pixel(0xa2ad91, -25, -32, 50, 35); pixel(0xc6c9a3, -17, -40, 34, 48);
      pixel(0x304a43, -17, -23, 12, 12); pixel(0x304a43, 5, -23, 12, 12); pixel(0x304a43, -3, -7, 7, 7);
      for (let x = -13; x < 15; x += 8) pixel(0x304a43, x, 3, 4, 9);
    } else if (id === 'IK') {
      pixel(0x4f6064, -22, -38, 44, 50); pixel(0x727f79, -12, -50, 24, 55);
      pixel(0x30454b, -6, -28, 15, 22);
      for (let n = 0; n < 3; n++) { pixel(0x668d7e, 42 + n * 10, 20 - n * 8, 7, 22); pixel(0xa1ae89, 42 + n * 10, 17 - n * 8, 7, 5); }
    } else {
      for (let n = 0; n < 4; n++) {
        const x = -42 + n * 26, y = (n % 2) * 20 - 20;
        pixel(0x7e6941, x, y, 4, 28); pixel(0x234e40, x - 16, y - 6, 36, 7); pixel(0x418357, x - 12, y - 10, 28, 6);
        pixel(0x5c9960, x - 4, y - 18, 8, 22); pixel(0x2a6046, x - 12, y + 1, 28, 5);
      }
      if (id === 'PR' || id === 'PD' || id === 'BN') {
        for (let n = 0; n < 3; n++) { const x = -30 + n * 22; pixel(0xd3ba82, x, -5, 18, 20); pixel(id === 'PD' ? 0xbd8f3e : 0x9b5740, x - 3, -12, 24, 10); pixel(0x344b43, x + 6, 4, 6, 11); }
      }
      if (id === 'IP') { pixel(0x829786, -15, -25, 12, 34); pixel(0x9eae94, 12, -30, 12, 39); pixel(0xb7c1a1, -15, -30, 39, 7); }
    }
    // Todas las islas tienen muelle (x 12..28, y -1..44 desde el centro): es donde el barco amarra.
    const plank = (color: number, x: number, y: number, w: number, h: number) => g.fillStyle(color).fillRect(x, y, w, h);
    plank(0x79553c, 12, -1, 16, 45); plank(0xc59a5d, 15, -1, 10, 45);
    for (let y = 3; y < 44; y += 8) plank(0x8a6a44, 15, y, 10, 1);
    for (const y of [4, 20, 36]) { plank(0x3a2a1e, 10, y, 3, 4); plank(0x3a2a1e, 27, y, 3, 4); }
    plank(0xf2c879, 18, 40, 4, 4); // farol en la punta
  }

  private drawCompass() {
    const x = 100, y = 130, g = this.add.graphics();
    g.lineStyle(1, 0xa9bca0, .38).strokeCircle(x, y, 36).strokeCircle(x, y, 28);
    g.fillStyle(0xc2b983, .8).fillTriangle(x, y - 28, x - 6, y + 9, x, y + 3);
    g.fillStyle(0x779e93, .8).fillTriangle(x, y + 28, x + 6, y - 9, x, y - 3);
    this.add.text(x, y - 52, 'N', { fontFamily: 'Georgia', fontSize: '15px', color: '#c8c49b' }).setOrigin(.5);
    this.add.text(x - 46, y, 'O', { fontFamily: 'Georgia', fontSize: '10px', color: '#829e91' }).setOrigin(.5);
    this.add.text(x + 46, y, 'E', { fontFamily: 'Georgia', fontSize: '10px', color: '#829e91' }).setOrigin(.5);
  }

  // ---- estilos y escala ------------------------------------------------------------------

  /** Aplica a cada isla el aspecto que le corresponde: elegida, con rol en la ruta, o neutra. */
  private refreshStyles() {
    const roles = new Map<string, { role: Role; n: number }>();
    this.route.forEach((id, i) => {
      if (this.route.length < 2) return;
      roles.set(id, i === 0 ? { role: 'origin', n: 0 } : i === this.route.length - 1 ? { role: 'destination', n: 0 } : { role: 'stop', n: i });
    });
    const compact = this.ui.compact;
    for (const view of this.islands.values()) {
      const role = roles.get(view.id);
      const hot = view.id === this.hovered || view.id === this.selected;
      const seen = this.visited.has(view.id);
      view.label.setColor(hot ? '#ffe1a0' : seen ? '#f5e3a8' : '#e9e4c8').setBackgroundColor(view.id === this.selected ? '#4a3d16' : seen ? '#1d4b3c' : '#103e48');
      if (role) {
        const style = ROLE_STYLE[role.role];
        view.berth.setStrokeStyle(style.width, style.stroke, 0.95).setFillStyle(style.fill, style.fillAlpha);
        const text = role.role === 'stop' && this.route.length > 3 ? `${style.text} ${role.n}` : style.text;
        view.tag.setText(text).setColor(style.color).setBackgroundColor(style.bg).setVisible(true);
      } else {
        view.berth.setStrokeStyle(2, GOLD, hot ? 0.8 : 0.28).setFillStyle(GOLD, hot ? 0.16 : 0.05);
        view.tag.setVisible(false);
      }
    }
    // Costos: todos en pantallas grandes; en pantallas chicas solo los de la ruta trazada.
    const onRoute = new Set<string>();
    for (let i = 1; i < this.route.length; i++) onRoute.add(edgeKey(this.route[i - 1], this.route[i]));
    for (const [key, badge] of this.badges) {
      const active = onRoute.has(key);
      badge.setVisible(active || !compact);
      if (active) badge.setColor('#2b2418').setBackgroundColor('#f2c879').setAlpha(1);
      else badge.setColor('#bfe0d4').setBackgroundColor('#0f3a44').setAlpha(this.route.length > 1 ? 0.45 : 0.8);
    }
    const target = this.selected ? this.islands.get(this.selected) : null;
    this.selection.setVisible(!!target);
    if (target) this.selection.setPosition(target.x, target.y - 18);
    this.placeTags();
  }

  /**
   * Cada cartel de rol busca, entre varios lugares alrededor de su isla, el que menos tape nombres,
   * costos y otros carteles (en pantallas chicas el de arriba pisaba el nombre de la isla vecina).
   */
  private placeTags() {
    const k = this.ui.islandScale;
    const avoid: Box[] = [...this.islands.values()].map(v => v.label.getBounds());
    for (const badge of this.badges.values()) if (badge.visible) avoid.push(badge.getBounds());
    for (const view of this.islands.values()) {
      if (!view.tag.visible) continue;
      let best = TAG_SPOTS[0], bestScore = Infinity;
      for (const spot of TAG_SPOTS) {
        view.tag.setPosition(view.x + spot[0] * k, view.y + spot[1] * k);
        const box = view.tag.getBounds();
        const score = avoid.reduce((sum, other) => sum + overlap(box, other), 0);
        if (score < bestScore) { best = spot; bestScore = score; }
        if (score === 0) break;
      }
      view.tag.setPosition(view.x + best[0] * k, view.y + best[1] * k);
      avoid.push(view.tag.getBounds());
    }
  }

  /** Reajusta textos, islas y zonas táctiles al tamaño real del lienzo en pantalla. */
  private relayout(force = false) {
    const k = this.scale.displayScale?.x || 1;
    if (!force && Math.abs(k - this.lastScale) < 0.03) return;
    this.lastScale = k;
    const u = this.ui = uiScale(k);
    const f = u.labelFont / 16, pad = Math.min(f, 1.5);
    for (const view of this.islands.values()) {
      view.art.setScale(u.islandScale);
      view.label.setText(u.compact ? shortName(view.name).toUpperCase() : view.name.toUpperCase())
        .setFontSize(u.labelFont).setPadding(7 * pad, 5 * pad, 7 * pad, 5 * pad)
        .setPosition(view.x, view.y + LABEL_ANCHOR[1] - 16 + u.labelFont);
      view.tag.setFontSize(u.tagFont).setPadding(6, 3, 6, 3);
      view.hit.setSize(u.hitWidth, u.hitHeight);
      const flag = this.flags.get(view.id);
      if (flag) this.layoutFlag(view, flag);
    }
    this.selection.setScale(u.islandScale);
    for (const badge of this.badges.values()) badge.setFontSize(u.badgeFont).setPadding(5, 2, 5, 2);
    this.refreshStyles();
  }

  // ---- movimiento y efectos --------------------------------------------------------------

  private cancelMotion() {
    this.moveTween?.stop();
    this.moveTween = null;
    this.moving = false;
  }

  /** Dos ondas expansivas y un pulso en el amarre: la llegada se nota aunque se mire de reojo. */
  private arrivalEffect(x: number, y: number, id: string) {
    for (let i = 0; i < 2; i++) {
      const ring = this.add.circle(x, y, 16).setStrokeStyle(3, 0xfff0c0, 0.9).setFillStyle(0xffffff, 0).setDepth(9);
      this.tweens.add({ targets: ring, scale: 3.6, alpha: 0, duration: 1200, delay: i * 280, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    const berth = this.islands.get(id)?.berth;
    if (berth) this.tweens.add({ targets: berth, scale: { from: 1.35, to: 1 }, duration: 520, ease: 'Back.easeOut' });
  }

  update(time: number) {
    this.waves.forEach((wave, i) => { wave.setAlpha(.09 + (Math.sin(time / 1600 + i) + 1) * .07); });
    if (!this.ship) return;
    // Giro gradual: la proa persigue el rumbo a velocidad angular limitada.
    // Con reloj real (no con el delta suavizado del motor): giro y avance llevan el mismo tiempo aunque caigan los cuadros.
    const now = performance.now();
    const dt = this.lastTick ? Math.min(0.5, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    this.heading = stepHeading(this.heading, this.targetHeading, TURN_RATE, dt);
    this.ship.setRotation(this.heading + Math.PI / 2);
    this.keepShadowDown();
    this.drawWake(time);
    if (++this.frame % 20 === 0) this.relayout(); // sigue el tamaño del lienzo aunque no haya evento de resize
  }

  /** Estela: espuma que nace en la popa, se abre en V y se desvanece. */
  private drawWake(now: number) {
    if (this.moving && now - this.lastWake > WAKE_STEP) {
      this.lastWake = now;
      this.trail.push({ x: this.ship.x - Math.cos(this.heading) * 30, y: this.ship.y - Math.sin(this.heading) * 30, born: now, heading: this.heading });
      if (this.trail.length > 80) this.trail.shift();
    }
    let kept = 0;
    for (const point of this.trail) if (now - point.born < WAKE_LIFE) this.trail[kept++] = point;
    this.trail.length = kept;
    this.wake.clear();
    for (const p of this.trail) {
      const age = (now - p.born) / WAKE_LIFE, alpha = 0.55 * (1 - age) ** 1.6, spread = 3 + age * 17;
      const nx = -Math.sin(p.heading), ny = Math.cos(p.heading);
      this.wake.fillStyle(0xe6f7f1, alpha);
      this.wake.fillCircle(p.x, p.y, 2.4 + age * 5);
      this.wake.fillCircle(p.x + nx * spread, p.y + ny * spread, 1.8 + age * 3.4);
      this.wake.fillCircle(p.x - nx * spread, p.y - ny * spread, 1.8 + age * 3.4);
    }
    if (this.moving) { // ola de proa
      const bx = this.ship.x + Math.cos(this.heading) * 36, by = this.ship.y + Math.sin(this.heading) * 36;
      const nx = -Math.sin(this.heading), ny = Math.cos(this.heading);
      this.wake.fillStyle(0xffffff, 0.6);
      for (const side of [-1, 1]) {
        this.wake.fillCircle(bx + nx * 7 * side, by + ny * 7 * side, 2.4);
        this.wake.fillCircle(bx + nx * 12 * side - Math.cos(this.heading) * 7, by + ny * 12 * side - Math.sin(this.heading) * 7, 1.8);
      }
    }
  }
}
