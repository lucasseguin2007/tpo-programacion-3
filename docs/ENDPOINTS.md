# Documentación de endpoints

> Plantilla. Cada grupo la completa con SUS endpoints, sus ejemplos reales
> y su análisis de complejidad. Un endpoint sin esta ficha no suma puntos.

---

### GET /api/grafo/dfs

**Endpoint:** GET /api/grafo/dfs?origen=PR

**Descripción:** Recorre la red de islas piratas en profundidad desde una ubicación inicial.

**Entrada:** ID del nodo origen.

**Salida de ejemplo:**
["PR","IT","IC","BN","FN","IP","PD","IK"]

**Técnica:** DFS recursivo, utilizando la pila de llamadas.

**Complejidad temporal:** O(V + E).

**Complejidad espacial:** O(V).

**Justificación:** Cada vértice se visita una vez y se examinan sus aristas mediante una lista de adyacencia.

---

### GET /api/grafo/bfs

**Endpoint:** GET /api/grafo/bfs?origen=PR

**Descripción:** Recorre la red de islas piratas por niveles desde una ubicación inicial.

**Entrada:** ID del nodo origen.

**Salida de ejemplo:**
["PR","IT","BN","FN","IC","PD","IP","IK"]

**Técnica:** BFS iterativo, utilizando una cola FIFO.

**Complejidad temporal:** O(V + E).

**Complejidad espacial:** O(V).

**Justificación:** Cada vértice se encola una sola vez y se examinan sus aristas mediante una lista de adyacencia.

---

### GET /api/grafo/dijkstra
**Descripción:** Calcula la ruta marítima de menor consumo de combustible entre dos ubicaciones de la Red de Islas Piratas.

**Endpoint:** GET /api/grafo/dijkstra?origen=PR&destino=IP

**Parámetros:**
- origen: ID de la ubicación inicial.
- destino: ID de la ubicación final.

**Salida de ejemplo:**
{"vertices":["PR","FN","IP"],"costoTotal":17.0}

**Técnica:** Greedy (Dijkstra).

**Estructuras utilizadas:** PriorityQueue, arreglos de distancias, predecesores y visitados.

**Complejidad temporal:** O((V + E) log V).

**Complejidad espacial:** O(V + E), considerando la cola de prioridad con entradas duplicadas.

**Justificación:** Cada vértice se procesa una vez y cada arista se examina durante la relajación. La cola de prioridad permite seleccionar los siguientes estados con costo logarítmico.

**Verificación manual:** PR → FN → IP = 9 + 8 = 17 UC.

---

### GET /api/grafo/prim
**Descripción:** Calcula el árbol de recubrimiento mínimo de la Red de Islas Piratas utilizando el algoritmo de Prim.

**Endpoint:** GET /api/grafo/prim?origen=PR

**Parámetro:** origen, identificador de la isla inicial.

**Técnica:** Greedy.

**Estructuras utilizadas:** PriorityQueue, arreglo de
visitados y lista de aristas del resultado.

**Complejidad temporal:** O(E log V), para un grafo
simple y conexo utilizando una cola de prioridad.

**Complejidad espacial:** O(V + E).

**Verificación manual:**
- PR - IT: 4 UC
- IT - BN: 3 UC
- BN - IC: 5 UC
- IC - PD: 4 UC
- PD - IK: 3 UC
- IK - IP: 5 UC
- BN - FN: 6 UC

**Resultado:** 7 aristas, costo total = 30 UC.

El árbol conecta los 8 vértices sin formar ciclos.

---

### GET /api/grafo/kruskal
**Descripción:** Calcula el árbol de recubrimiento mínimo
de la Red de Islas Piratas mediante Kruskal.

**Endpoint:** GET /api/grafo/kruskal

**Parámetros:** No requiere parámetros.

**Técnica:** Greedy.

**Estructuras utilizadas:** Lista de aristas ordenadas,
arreglos padre[] y tamanio[] para Union-Find.

**Complejidad temporal:** O(E log E) en grafos conexos.

**Complejidad espacial:** O(V + E).

**Justificación:** Se ordenan las E aristas por costo
creciente. Union-Find utiliza compresión de caminos
y unión por tamaño para detectar ciclos eficientemente.

**Verificación manual:**
- IT - BN: 3 UC
- PD - IK: 3 UC
- PR - IT: 4 UC
- IC - PD: 4 UC
- BN - IC: 5 UC
- IK - IP: 5 UC
- BN - FN: 6 UC

**Resultado:**
7 aristas seleccionadas.
Costo total mínimo = 30 UC.

**Comparación:** Prim y Kruskal obtienen el mismo
costo mínimo sobre nuestro grafo: 30 UC.

---

### GET /api/seleccion/greedy

_(completar — incluir un caso donde greedy NO dé el óptimo)_

---

### GET /api/seleccion/dinamica

_(completar — incluir la tabla dp del ejemplo)_

---

### GET /api/grafo/rutas

_(completar — incluir cantidad de nodos explorados con y sin poda)_

---

### GET /api/seleccion/repartir

_(completar — incluir cuál es la cota y por qué es optimista)_

### GET /api/seleccion/quicksort
Ordena los items utilizando QuickSort propio.

**Parámetros:** `criterio` — admite `valor`, `peso` o `ratio`.
Por defecto usa `ratio`.

**Ejemplo:** `GET /api/seleccion/quicksort?criterio=ratio`

**Respuesta esperada sobre los datos semilla:**
`I4, I2, I5, I3, I1`

**Complejidad:** O(n log n) promedio y O(n²) en el peor caso.
El peor caso ocurre cuando el pivote deja particiones muy desbalanceadas,
por ejemplo si termina siempre en un extremo.

**Estructura usada:** lista + partición manual con pivote.

### GET /api/seleccion/mergesort

Ordena los items utilizando MergeSort propio.

**Parámetros:** `criterio` — admite `valor`, `peso` o `ratio`.
Por defecto usa `ratio`.

**Ejemplo:** `GET /api/seleccion/mergesort?criterio=ratio`

**Respuesta esperada sobre los datos semilla:**
`I4, I2, I5, I3, I1`

**Complejidad:** O(n log n) en todos los casos.

**Recurrencia:** T(n) = 2T(n/2) + O(n)

**Estructura usada:** listas auxiliares y mezcla manual.
