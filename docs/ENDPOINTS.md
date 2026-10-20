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

_(completar)_

---

### GET /api/grafo/prim

_(completar)_

---

### GET /api/grafo/kruskal

_(completar)_

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
