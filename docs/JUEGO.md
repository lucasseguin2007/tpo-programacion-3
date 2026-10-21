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
  travesía en curso. Cancela animaciones y descarta respuestas pendientes.
- La bitácora registra salidas, llegadas y reabastecimientos.

La partida es local y se reinicia al recargar la página. No hay guardado, combate,
cargamentos, niebla de exploración ni control libre con WASD en esta etapa.
Las ocho ubicaciones están visibles desde el inicio; el contador indica visitas.

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
- `frontend/src/state`: reglas de consumo y validación de itinerarios.
- `frontend/src/App.tsx`: sesión y coordinación entre React y Phaser.

React es dueño del estado de sesión. Phaser dibuja y anima; informa la llegada
para que React avance al siguiente tramo. No se actualiza React por cuadro.
Los sprites y las islas se dibujan con código propio; no requieren imágenes de terceros.
Las fuentes de Google Fonts tienen alternativas locales si no hay conexión.

## Verificación

```powershell
.\mvnw.cmd test
cd frontend
npm test
npm run build
```

Las pruebas nuevas verifican el contrato HTTP del mapa, la respuesta Dijkstra,
errores de IDs, costos coincidentes para los 64 pares de ubicaciones, deduplicación,
costos inválidos, combustible insuficiente y rutas inconsistentes.
Las pruebas Java usan la carga inicial original con repositorios de prueba en memoria;
no modifican Neo4j y no duplican los algoritmos.

Prueba manual: PR → FN → IP cuesta 17 UC y deja 13 UC. El regreso de 17 UC debe
quedar bloqueado hasta reabastecer. Una parada IP → FN consume solo 8 UC antes
de permitir elegir un nuevo destino. Reiniciar durante un viaje debe cancelar
la llegada pendiente y dejar el barco en PR con 30 UC.

## Despliegue futuro

El build de Vite es estático. Para publicarlo será necesario configurar un proxy
de producción `/api` hacia Spring Boot; el proxy de desarrollo no se incluye en `dist`.
Esta etapa no publica el juego ni modifica ramas remotas.
