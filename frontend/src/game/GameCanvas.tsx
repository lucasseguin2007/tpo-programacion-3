import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { World } from '../api/client';
import { ArchipelagoScene } from './ArchipelagoScene';
import { WIDTH, HEIGHT } from './world/layout';
export function GameCanvas({ world, onSelect, onReady }: { world: World; onSelect: (id: string) => void; onReady: (scene: ArchipelagoScene | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect); select.current = onSelect;
  const ready = useRef(onReady); ready.current = onReady;
  useEffect(() => {
    const scene = new ArchipelagoScene(world, id => select.current(id), value => ready.current(value));
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host.current!, width: WIDTH, height: HEIGHT, pixelArt: true, antialias: false, backgroundColor: '#103f4b', scene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { roundPixels: true }, audio: { noAudio: true } });
    return () => { ready.current(null); game.destroy(true); };
  }, [world]);
  return <div className="game-canvas" ref={host} role="img" aria-label="Mapa navegable del archipiélago. También podés elegir destinos con el selector de la carta de navegación." />;
}
