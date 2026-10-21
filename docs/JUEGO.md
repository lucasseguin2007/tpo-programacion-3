# Cartas del Archipiélago — primera etapa

Implementación local en `feature/pirate-game`. El backend Maven continúa en la raíz;
el juego React + TypeScript + Phaser 3 + Vite está en `frontend/`.
No se reemplazan los algoritmos ni los endpoints de la entrega final.

## Iniciar

1. Iniciar la instancia Neo4j que contiene el TPO.
2. Abrir PowerShell en la raíz del repositorio. Configurar `NEO4J_URI`,
   `NEO4J_USER` y `NEO4J_PASSWORD` en el entorno de esa terminal y ejecutar:

   ```powershell
   .\mvnw.cmd spring-boot:run
   ```

   También se incluye `scripts/Start-Backend.ps1`, que solicita la contraseña
   de forma oculta y la conserva únicamente en el entorno mientras corre Maven:

   ```powershell
   .\scripts\Start-Backend.ps1
   ```

   La configuración predeterminada es `bolt://localhost:7687`, usuario `neo4j`.
   Un archivo `.env` por sí solo no se carga automáticamente en Spring Boot.
   No colocar secretos en el frontend ni en variables con prefijo `VITE_`.

3. En otra terminal:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

4. Abrir la URL que imprime Vite (normalmente `http://127.0.0.1:5173`).
   El proxy local envía `/api` a `http://localhost:8080`.
5. Detener los procesos con Ctrl+C en cada terminal.

Requisitos: Java 17+, Node 20.18+ y Neo4j. Los builds y tests generan archivos
ignorados en `target/`, `frontend/dist/` y `frontend/node_modules/`.

## Jugar

- Comenzás en Puerto Real con 30 unidades de combustible.
- Elegí una isla desde el mapa o el selector accesible.
- **Trazar rumbo** consulta Dijkstra en Java, muestra las escalas y el consumo.
- **Zarpar** mueve el barco a través de ese itinerario. Cada tramo descuenta su
  costo una sola vez al salir; durante la navegación no se cambia el destino.
- **Detener en próxima escala** termina el tramo actual y permite elegir otro rumbo.
- **Reabastecer** completa 30 UC de forma gratuita en cualquier ubicación. Es una
  facilidad de esta primera etapa, no una economía definitiva.
- **Nueva partida** pide confirmación y vuelve a Puerto Real, incluso si hay una
  travesía en curso. Cancela animaciones, descarta respuestas pendientes y borra
  la partida guardada.
- La bitácora registra salidas, llegadas y reabastecimientos.

La partida se guarda en el navegador (ver «Etapa 1.1»). No hay combate,
cargamentos, niebla de exploración ni control libre con WASD en esta etapa.
Las ocho ubicaciones están visibles desde el inicio; el contador indica visitas.

## Etapa 1.1: pulido

Antes de sumar misiones se mejoró cómo se siente navegar y se aisló la base.
La economía (reabastecimiento según el puerto y recompensas), el combate, el
multijugador y el movimiento libre quedan para etapas posteriores.

**El barco.** Sprite nuevo (balandra con casco, cubierta, velas y gallardete),
estela de espuma que se abre y se desvanece, ola de proa y cabeceo suave. La proa
gira gradualmente al cambiar de rumbo antes de avanzar. Al llegar, el barco amarra
paralelo al muelle de la isla, con ondas expansivas y un pulso en el amarre. Cada
isla tiene ahora un muelle propio y las rutas unen muelles, de modo que el barco
navega exactamente por las líneas dibujadas.

**Lectura del mapa.** La isla elegida como destino se resalta con un halo. Cada
tramo muestra su costo en UC. Con una ruta trazada, el origen, las escalas y el destino
se marcan distinto (color y etiqueta) y los costos de la ruta quedan resaltados. El
selector accesible y el mapa siguen siendo equivalentes.

**Pantallas chicas.** El lienzo se escala para caber, así que los textos del mapa se
agrandan según el tamaño real en pantalla. En pantallas chicas los nombres se abrevian
(«Kraken» en lugar de «Isla del Kraken»), las islas crecen un poco, las zonas táctiles
miden ~48 px reales y solo se muestran los costos de la ruta trazada. La ubicación de
los costos se calcula para no tapar islas, nombres ni otros costos
(`placeBadges` en `game/world/layout.ts`, con pruebas).

**Travesía.** Mientras se navega, la carta de rumbo muestra el próximo puerto, el
tramo actual («Tramo 1 de 2 · 9 UC»), una barra de progreso del tramo y, si hay
escalas, el avance de toda la travesía. El control sigue siendo por destinos.

**Sonido.** Mar de fondo mientras se navega, campana al zarpar, campanada en cada
escala y dos al llegar. Se sintetizan con Web Audio (sin archivos de audio) y se
pueden silenciar con el botón «Sonido» de la carta; la elección se recuerda. Si el
navegador no ofrece audio, el juego sigue en silencio. Con «reducir movimiento» activo
en el sistema se omiten las animaciones continuas (cabeceo y pulso de selección).

**Guardado.** En cada llegada se guarda en `localStorage` la ubicación, el
combustible, las islas visitadas y la bitácora; también al reabastecer. Recargar
durante un viaje recupera la última escala con el combustible que tenía al llegar
(el tramo en curso no se cobra). Un guardado ilegible, de otra versión o que no
corresponde al mapa actual se descarta y se empieza de cero. Si el navegador no
permite guardar, se juega igual. La clave es `cartas-del-archipielago:partida:v1`.

**Lógica separada de la interfaz.** `state/navigation.ts` concentra travesías,
combustible, respuestas pendientes y guardado. Una consulta de ruta tardía, o de un
destino ya cambiado, o posterior a un reinicio, se descarta (y se cancela la
petición HTTP). Un itinerario que no parte de la ubicación actual, que no llega al
destino pedido o cuyos costos no coinciden con el mapa nunca puede zarpar. Perder
la escena en plena travesía la cancela y devuelve el barco a la última escala. El
controlador emite eventos (`depart`, `stopover`, `dock`, `halt`) para que el sonido, y
más adelante las misiones, reaccionen sin mezclarse con animaciones ni botones.

**Cliente HTTP.** Un servidor caído, un puerto que no responde en 12 s o una
respuesta ilegible muestran un mensaje claro en lugar de «Failed to fetch».

## Etapa 1.2: correcciones tras probar el juego

- **Sonido audible.** Medido en un navegador real, el pico que llegaba a los parlantes era ~0,02 (casi inaudible). Se subieron
  los niveles y se agregó un limitador para no saturar. El audio se prepara en el primer toque o tecla del jugador, así las
  campanadas de escala y llegada (que no nacen de un clic) también suenan, y un contexto suspendido se reanuda antes de tocar.
  Al activar el sonido suena una campanita de confirmación.
- **Islas visitadas.** Cada isla visitada lleva una bandera dorada clavada en la costa (cae con un rebote al llegar), una marca
  `⚑` en el selector de destino, una entrada en la leyenda y un punto por isla en el panel del navío.
- **Orientación del barco.** El giro de la proa usa reloj real (`game/world/steering.ts`, con pruebas) en vez del `delta`
  suavizado del motor, y el barco espera a quedar alineado antes de avanzar (antes salía hasta ~97° desviado). El gallardete
  flamea hacia popa y la sombra cae siempre hacia el mismo lado.
- **Pantallas chicas.** Los carteles ORIGEN/ESCALA/DESTINO buscan el lugar que menos tape nombres y costos, y el cartel
  "Seleccioná una isla…" se oculta en teléfonos porque tapaba nombres de islas.

## API agregada

`GET /api/juego/mapa`

```json
{
  "ubicaciones": [{ "id": "PR", "nombre": "Puerto Real", "tipo": "PUERTO" }],
  "rutas": [{ "origen": "IT", "destino": "PR", "costo": 4.0 }]
}
```

Ejemplo abreviado. El mundo inicial contiene ocho ubicaciones y 14 rutas.
Cada conexión bidireccional aparece una sola vez; conexiones paralelas se agrupan
con su menor costo, compatible con Dijkstra. Costos negativos o no finitos producen
HTTP 400 mediante el manejador existente. El DTO evita serializar entidades Neo4j
recursivamente. No incluye credenciales ni identificadores internos de Neo4j.

La navegación usa sin cambios:

`GET /api/grafo/dijkstra?origen=PR&destino=IP`

```json
{ "vertices": ["PR", "FN", "IP"], "costoTotal": 17.0 }
```

El frontend valida que cada tramo exista y que la suma coincida con `costoTotal`.
No calcula caminos mínimos. Si la API falla, se conserva la partida y se puede
reintentar. Una respuesta atrasada no reemplaza un destino nuevo ni una partida reiniciada.

## Organización

- `game/controller`, `game/service`, `game/dto` en Java: lectura del mapa.
- `frontend/src/api`: contratos REST y tratamiento de errores.
- `frontend/src/game`: escena Phaser, arte pixel procedural y ciclo de vida del canvas.
- `frontend/src/game/world`: composición visual por ID; no guarda costos del grafo.
- `frontend/src/state`: reglas de juego, sin React ni Phaser.
  `navigation.ts` (controlador de travesías), `save.ts` (guardado local),
  `voyage.ts` (consumo y validación de itinerarios) y `useNavigation.ts`
  (puente fino hacia React).
- `frontend/src/audio`: sonidos sintetizados con Web Audio.
- `frontend/src/App.tsx`: dibuja el estado y reenvía los clics; no contiene reglas.

El controlador de navegación es dueño del estado de sesión. Phaser dibuja y anima;
informa progreso y llegada mediante la interfaz `Sailor` para que el controlador
avance al siguiente tramo. React solo se actualiza cuando el estado cambia
(el progreso del tramo se publica en pasos del 1 %, no por cuadro).
Los sprites y las islas se dibujan con código propio; no requieren imágenes de terceros.
Las fuentes de Google Fonts tienen alternativas locales si no hay conexión.

## Verificación

```powershell
.\mvnw.cmd test
cd frontend
npm test
npm run build
```

`npm test` cubre además (Vitest, sin navegador): el recorrido completo con el
controlador (salida, escalas, llegada, parada, reabastecimiento y reinicio),
combustible insuficiente, desconexiones y tiempos de espera, respuestas tardías o
cruzadas (cambio de destino, trazados repetidos, reinicio, cierre), itinerarios
inválidos, recuperación de partida (con el barco atracado, a mitad de viaje, guardado
corrupto o de otro mapa, almacenamiento bloqueado o lleno), el sonido (silencio
persistente, audio no disponible) y la geometría del mapa (muelles, escalado,
ubicación de los costos). La escena de Phaser no tiene pruebas automáticas
permanentes: requeriría un entorno de navegador simulado.

Las pruebas Java nuevas verifican el contrato HTTP del mapa, la respuesta Dijkstra,
errores de IDs, costos coincidentes para los 64 pares de ubicaciones, deduplicación,
costos inválidos, combustible insuficiente y rutas inconsistentes.
Las pruebas Java usan la carga inicial original con repositorios de prueba en memoria;
no modifican Neo4j y no duplican los algoritmos.

Prueba manual de la etapa 1.1: recargar la página con el barco atracado conserva
ubicación, combustible e islas; recargar a mitad de un viaje vuelve a la última
escala; «Sonido: no» persiste al recargar; en una ventana angosta (~360 px) los
nombres se abrevian y se leen.

Prueba manual: PR → FN → IP cuesta 17 UC y deja 13 UC. El regreso de 17 UC debe
quedar bloqueado hasta reabastecer. Una parada IP → FN consume solo 8 UC antes
de permitir elegir un nuevo destino. Reiniciar durante un viaje debe cancelar
la llegada pendiente y dejar el barco en PR con 30 UC.

## Despliegue futuro

El build de Vite es estático. Para publicarlo será necesario configurar un proxy
de producción `/api` hacia Spring Boot; el proxy de desarrollo no se incluye en `dist`.
Esta etapa no publica el juego ni modifica ramas remotas.
