# 🏴‍☠️ Red de Islas Piratas — Programación III

Trabajo Práctico Obligatorio — UADE, segundo cuatrimestre de 2026.

## Videojuego web (rama feature/pirate-game)

La primera etapa jugable incorpora React, TypeScript y Phaser 3 en `frontend/`:
mapa pixel art, navegación con Dijkstra Java, combustible, escalas y bitácora.
Ver [cómo iniciar y jugar](docs/JUEGO.md). El backend y sus algoritmos se conservan.

## Integrantes

| Integrante | GitHub |
|---|---|
| Lucas Seguin | [lucasseguin2007](https://github.com/lucasseguin2007) |
| Santiago Testino | [santiagotestinof](https://github.com/santiagotestinof) |
| Santiago Villanti | [villantisantiago](https://github.com/villantisantiago) |

## 1. Descripción del proyecto

Red de Islas Piratas es un sistema desarrollado en Java con Spring Boot y Neo4j que representa un archipiélago formado por islas, puertos y fortalezas conectados mediante rutas marítimas.
El objetivo es aplicar diferentes técnicas de diseño y análisis de algoritmos para resolver problemas de navegación, optimización de rutas, exploración y distribución de cargamentos.
Los algoritmos se implementan en Java y trabajan sobre un grafo cargado en memoria desde Neo4j.

## 2. Dominio y representación del grafo
**Nodos:** representan ubicaciones marítimas, como islas, puertos y fortalezas.
**Aristas:** representan rutas marítimas directas y bidireccionales entre ubicaciones.
**Peso:** representa el combustible necesario para navegar entre dos ubicaciones.
**Unidad:** UC (Unidades de Combustible).

El grafo principal es no dirigido, ponderado y conexo.
### Ubicaciones
| ID | Ubicación |
|---|---|
| PR | Puerto Real |
| IT | Isla Tortuga |
| BN | Bahía Negra |
| IC | Isla Calavera |
| PD | Puerto Dorado |
| IK | Isla del Kraken |
| FN | Fortaleza Naval |
| IP | Isla Perdida |

### Conexiones marítimas
| Origen | Destino | Costo |
|---|---|---|
| PR | IT | 4 UC |
| PR | BN | 7 UC |
| PR | FN | 9 UC |
| IT | BN | 3 UC |
| IT | IC | 6 UC |
| IT | PD | 8 UC |
| BN | IC | 5 UC |
| BN | FN | 6 UC |
| IC | PD | 4 UC |
| IC | IK | 7 UC |
| PD | IK | 3 UC |
| PD | IP | 9 UC |
| IK | IP | 5 UC |
| FN | IP | 8 UC |
La red contiene 8 nodos y 14 conexiones bidireccionales.

## 3. Algoritmos implementados
| Técnica | Algoritmo | Aplicación |
|---|---|---|
| Divide y Conquista | QuickSort | Ordenamiento de cargamentos |
| Divide y Conquista | MergeSort | Ordenamiento de cargamentos |
| Recorridos | DFS | Exploración en profundidad |
| Recorridos | BFS | Exploración por niveles |
| Greedy | Dijkstra | Ruta marítima de menor costo |
| Greedy | Prim | Árbol de recubrimiento mínimo |
| Greedy | Kruskal | Árbol de recubrimiento mínimo |
| Greedy | Selección por valor/peso | Selección de cargamentos |
| Programación Dinámica | Mochila 0/1 | Selección óptima de cargamentos |
| Programación Dinámica | Floyd-Warshall | Caminos mínimos entre todos los pares |
| Backtracking | Rutas simples con poda | Exploración con restricciones |
| Branch & Bound | Reparto de cargamentos | Minimización de carga máxima |
Se incluye además un endpoint de comparación entre Floyd-Warshall y múltiples ejecuciones de Dijkstra.

## 4. Tecnologías utilizadas
- Java 17
- Spring Boot
- Neo4j
- Spring Data Neo4j
- Maven
- JUnit 5
- Git y GitHub

### Organización del proyecto
- `model/`: entidades Nodo, Conexion e Item.
- `repository/`: acceso a Neo4j.
- `service/`: carga y representación del grafo en memoria.
- `algorithm/`: implementación de los algoritmos.
- `controller/`: endpoints REST.
- `seed/`: carga inicial de ubicaciones, conexiones y cargamentos.
- `src/test/`: pruebas unitarias.
- `docs/`: documentación de endpoints y complejidades.

## 5. Instalación y ejecución
### Requisitos
- Java 17
- Neo4j funcionando
- Acceso a Maven mediante Maven Wrapper
### Configuración
La aplicación utiliza variables de entorno para conectarse a Neo4j:
- `NEO4J_URI`: dirección del servidor.
- `NEO4J_USER`: usuario.
- `NEO4J_PASSWORD`: contraseña.
Se proporciona el archivo `.env.example` como referencia. Las credenciales reales no deben almacenarse en el repositorio.
Una vez configurada la conexión, iniciar la aplicación:
```bash
./mvnw spring-boot:run
```
En Windows:
```powershell
.\mvnw.cmd spring-boot:run
```
La API estará disponible en `http://localhost:8080`.
Para verificar el grafo:
```http
GET http://localhost:8080/api/grafo/resumen?dirigido=false
```
Si la base está vacía y la carga inicial está habilitada, se incorporan las 8 ubicaciones, las 14 rutas y los 5 cargamentos.
## 6. Endpoints principales
### Grafos
| Método | Endpoint |
|---|---|
| GET | `/api/grafo/resumen?dirigido=false` |
| GET | `/api/grafo/dfs?origen=PR` |
| GET | `/api/grafo/bfs?origen=PR` |
| GET | `/api/grafo/dijkstra?origen=PR&destino=IP` |
| GET | `/api/grafo/prim?origen=PR` |
| GET | `/api/grafo/kruskal` |
| GET | `/api/grafo/floyd` |
| GET | `/api/grafo/comparacion` |
| GET | `/api/grafo/rutas?origen=PR&destino=IP&costoMaximo=20&saltosMaximos=3` |

### Selección y optimización
| Método | Endpoint |
|---|---|
| GET | `/api/seleccion/quicksort?criterio=ratio` |
| GET | `/api/seleccion/mergesort?criterio=ratio` |
| GET | `/api/seleccion/greedy?capacidad=10` |
| GET | `/api/seleccion/dinamica?capacidad=10` |
| GET | `/api/seleccion/repartir?contenedores=2` |
La documentación detallada de entradas, salidas, complejidades y verificaciones se encuentra en [docs/ENDPOINTS.md](docs/ENDPOINTS.md).
El endpoint opcional UCS está presente, pero permanece pendiente de implementación y no forma parte de los algoritmos declarados como completos.

## 7. Verificaciones de los algoritmos
**Dijkstra:** la ruta PR → FN → IP consume 17 UC.
**Prim y Kruskal:** ambos obtienen un árbol de recubrimiento mínimo de costo 30 UC.
**Greedy vs. Mochila 0/1:** con capacidad 10, Greedy obtiene valor 90 y Programación Dinámica obtiene 105, demostrando que la elección voraz no garantiza el óptimo para objetos indivisibles.
**Floyd-Warshall:** obtiene los costos mínimos entre los 64 pares de ubicaciones.
**Backtracking:** permite buscar rutas simples bajo límites de costo y saltos y comparar las exploraciones con y sin poda.
**Branch & Bound:** para los cinco cargamentos distribuidos entre dos barcos, obtiene una carga máxima óptima de 13 unidades. En la ejecución de referencia se exploraron 49 estados y se podaron 21.

## 8. Tests
El proyecto incluye pruebas unitarias de los algoritmos utilizando JUnit 5.
Para ejecutar los tests:
```powershell
.\mvnw.cmd test
```
La entrega final requiere que todas las pruebas terminen sin errores.

## 9. Documentación
- [Documentación de endpoints](docs/ENDPOINTS.md)
- [Informe de complejidades](docs/COMPLEJIDADES.md)

## 10. Uso de inteligencia artificial
Durante el desarrollo del TPO se utilizó **ChatGPT de OpenAI** como herramienta de asistencia para:
- Comprender algoritmos y técnicas de diseño.
- Analizar complejidades temporales y espaciales.
- Revisar implementaciones Java.
- Proponer y revisar pruebas unitarias.
- Diagnosticar errores.
- Preparar y organizar la documentación técnica.
Las soluciones fueron integradas en el proyecto y verificadas mediante pruebas y ejecuciones de la aplicación.
El uso de herramientas de inteligencia artificial se declara de acuerdo con los requisitos de la materia Programación III.

## 11. Entrega final
La entrega se realiza mediante el repositorio de GitHub y el tag `entrega-final`, que identifica la versión presentada para su evaluación.
