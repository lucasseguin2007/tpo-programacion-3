import Phaser from 'phaser';
import type { World } from '../api/client';
import { HEIGHT, WIDTH, position } from './world/layout';

export class ArchipelagoScene extends Phaser.Scene {
  private ship!: Phaser.GameObjects.Container;
  private routeInk!: Phaser.GameObjects.Graphics;
  private markers = new Map<string, Phaser.GameObjects.Arc>();
  private waves: Phaser.GameObjects.Rectangle[] = [];
  constructor(private world: World, private select: (id: string) => void, private ready: (scene: ArchipelagoScene) => void) { super('archipelago'); }
  create() {
    this.cameras.main.setBackgroundColor('#103f4b');
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
    this.add.text(750, 707, 'AGUAS SIN CARTOGRAFIAR', { fontFamily: 'Georgia', fontSize: '11px', color: '#80a9a4', letterSpacing: 3 }).setAlpha(.5);
    const routes = this.add.graphics();
    for (const edge of this.world.rutas) {
      const [ax, ay] = position(edge.origen), [bx, by] = position(edge.destino);
      const distance = Phaser.Math.Distance.Between(ax, ay, bx, by);
      routes.fillStyle(0x91c9bc, .25);
      for (let t = 0; t < 1; t += 12 / distance) routes.fillCircle(ax + (bx - ax) * t, ay + (by - ay) * t, 1.4);
    }
    this.routeInk = this.add.graphics();
    this.world.ubicaciones.forEach((island, index) => {
      const [x, y] = position(island.id);
      this.drawIsland(x, y - 24, island.id, index);
      const marker = this.add.circle(x, y + 10, 9, 0xe7c17a, .12).setStrokeStyle(1, 0xe7c17a, .5);
      this.markers.set(island.id, marker);
      const label = this.add.text(x, y + 56, island.nombre.toUpperCase(), { fontFamily: 'Georgia', fontSize: '16px', color: '#e9e4c8', letterSpacing: 1, backgroundColor: '#103e48', padding: { x: 7, y: 5 } }).setOrigin(.5);
      const hit = this.add.zone(x, y, 140, 125).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.select(island.id));
      hit.on('pointerover', () => { label.setColor('#ffe1a0'); marker.setScale(1.4); });
      hit.on('pointerout', () => { label.setColor('#e9e4c8'); marker.setScale(1); });
    });
    this.drawCompass();
    this.ship = this.add.container(...position('PR')).setDepth(20);
    const shadow = this.add.ellipse(0, 8, 46, 19, 0x061f29, .5);
    const boat = this.add.graphics();
    const rect = (color: number, x: number, y: number, w: number, h: number) => boat.fillStyle(color).fillRect(x, y, w, h);
    rect(0x503128, -12, -16, 24, 32); rect(0x503128, -8, -22, 16, 42); rect(0xa2693d, -8, -16, 16, 32);
    rect(0xd0a363, -5, -16, 3, 29); rect(0x342f2b, -1, -24, 3, 44);
    rect(0xf4e5b5, -16, -15, 32, 5); rect(0xe8cf94, -13, -10, 26, 15); rect(0xf8e8bb, -10, 5, 20, 5);
    rect(0x5c3833, -1, -24, 15, 6); rect(0xe8cf94, 4, -23, 3, 3);
    this.ship.add([shadow, boat]);
    this.tweens.add({ targets: boat, y: -3, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.ready(this);
  }
  private drawIsland(cx: number, cy: number, id: string, seed: number) {
    const g = this.add.graphics();
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
        pixel(0x79553c, 12, 23, 16, 45); pixel(0xc59a5d, 15, 23, 10, 45);
        for (let n = 0; n < 3; n++) { const x = -30 + n * 22; pixel(0xd3ba82, x, -5, 18, 20); pixel(id === 'PD' ? 0xbd8f3e : 0x9b5740, x - 3, -12, 24, 10); pixel(0x344b43, x + 6, 4, 6, 11); }
      }
      if (id === 'IP') { pixel(0x829786, -15, -25, 12, 34); pixel(0x9eae94, 12, -30, 12, 39); pixel(0xb7c1a1, -15, -30, 39, 7); }
    }
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
  highlight(ids: string[]) {
    if (!this.routeInk) return;
    this.routeInk.clear().lineStyle(3, 0xe8c27a, .95);
    for (let i = 1; i < ids.length; i++) {
      const [a, b] = position(ids[i - 1]), [c, d] = position(ids[i]);
      this.routeInk.lineBetween(a, b, c, d);
    }
    this.markers.forEach((marker, id) => marker.setFillStyle(0xffd590, ids.includes(id) ? .8 : .12));
  }
  sail(to: string, arrived: () => void) {
    const [x, y] = position(to);
    const angle = Phaser.Math.Angle.Between(this.ship.x, this.ship.y, x, y) + Math.PI / 2;
    this.ship.setRotation(angle);
    this.tweens.add({ targets: this.ship, x, y, duration: 4200, ease: 'Sine.easeInOut', onComplete: arrived });
  }
  resetShip(id: string) { if (this.ship) { this.tweens.killTweensOf(this.ship); this.ship.setPosition(...position(id)).setRotation(0); this.highlight([]); } }
  update(time: number) { this.waves.forEach((wave, i) => { wave.setAlpha(.09 + (Math.sin(time / 1600 + i) + 1) * .07); }); }
}
