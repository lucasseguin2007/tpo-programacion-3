# Documentación de endpoints

> Plantilla. Cada grupo la completa con SUS endpoints, sus ejemplos reales
> y su análisis de complejidad. Un endpoint sin esta ficha no suma puntos.

---

### GET /api/grafo/dfs

Recorrido en profundidad desde un nodo.

**Parámetros:** `origen` (id del nodo de partida)

**Ejemplo:** `GET /api/grafo/dfs?origen=A`

**Respuesta:**
```json
["A", "B", "C", "D", "E", "F", "H", "G"]
```

**Complejidad:** O(V + E) — cada vértice se visita una vez y cada arista se
recorre una vez, con lista de adyacencia.

**Estructura usada:** recursión (pila de llamadas) + arreglo de visitados.

---

### GET /api/grafo/bfs

_(completar)_

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
