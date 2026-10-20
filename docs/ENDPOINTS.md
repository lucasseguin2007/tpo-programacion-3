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
**Endpoint:** GET /api/seleccion/greedy?capacidad=10

**Descripción:** Selecciona cargamentos para el barco
utilizando un algoritmo greedy con mochila 0/1.

**Criterio:** Ratio valor/peso descendente.

**Técnica:** Greedy.

**Estructuras:** Listas y MergeSort propio.

**Complejidad temporal:** O(n log n).

**Complejidad espacial:** O(n).

**Verificación:** Con capacidad 10, selecciona I4 e I2.

- Peso total: 7
- Valor total: 90

No alcanza el óptimo de 105, demostrando que greedy no garantiza la solución óptima en mochila 0/1.

---

### GET /api/seleccion/dinamica
**Endpoint:** GET /api/seleccion/dinamica?capacidad=10

**Descripción:** Resuelve el problema de selección de
cargamentos mediante mochila 0/1 con programación dinámica.

**Técnica:** Programación Dinámica bottom-up.

**Estructuras:** Matriz dp[n+1][W+1] y lista
de items seleccionados.

**Complejidad temporal:** O(n * W).

**Complejidad espacial:** O(n * W).

**Justificación:** Se calculan n * W subproblemas.
Cada celda se resuelve en tiempo constante, consultando
los valores ya calculados de la fila anterior.

**Recuperación:** Se recorre la tabla desde dp[n][W]
hasta la primera fila, identificando los items elegidos.

**Verificación:** Con capacidad 10, selecciona I4 e I5.

- Peso total: 10
- Valor total: 105

**Comparación:** Programación Dinámica supera a Greedy
por 15 unidades de valor.

La complejidad O(n * W) es pseudopolinómica porque depende
del valor numérico de W y no de su cantidad de bits.


**Tabla Dp:**
Item	0	1	2	3	4	5	6	7	8	9	10
Ninguno	0	0	0	0	0	0	0	0	0	0	0
I1	    0	0	0	0	0	10	10	10	10	10	10
I2	    0	0	0	0	40	40	40	40	40	50	50
I3	    0	0	0	0	40	40	40	40	40	50	50
I4	    0	0	0	50	50	50	50	50	90	90	90
I5	    0	0	0	50	50	50	55	55	90	90	105
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

### GET /api/grafo/floyd

**Endpoint:** GET /api/grafo/floyd

**Descripción:** Calcula los caminos de menor costo entre todos los pares de ubicaciones de la Red de Islas Piratas, utilizando el algoritmo Floyd-Warshall.

**Parámetros:** No requiere parámetros.

**Técnica:** Programación Dinámica.

**Tipo de grafo:** No dirigido y ponderado.

**Estructuras utilizadas:** Matriz de adyacencia, matriz de distancias y Map para almacenar los resultados.

**Complejidad temporal:** O(V³).

**Complejidad espacial:** O(V²).

**Justificación:** Floyd-Warshall utiliza tres bucles anidados que recorren los V vértices. Para cada vértice intermedio k, evalúa si pasar por él permite reducir el costo entre el origen i y el destino j.

Cada evaluación se realiza en tiempo constante. Por lo tanto, la complejidad temporal es O(V³).

La complejidad espacial es O(V²), debido a la matriz de distancias y al mapa de resultados.

**Detección de ciclos negativos:** Al finalizar, el algoritmo comprueba los valores de la diagonal principal. Si alguna posición dist[i][i] es negativa, se detecta un ciclo de costo negativo y se lanza una excepción.

**Salida de ejemplo (extracto):**

{
"PR->PR": 0.0,
"PR->IT": 4.0,
"PR->BN": 7.0,
"PR->IC": 10.0,
"PR->PD": 12.0,
"PR->IK": 15.0,
"PR->FN": 9.0,
"PR->IP": 17.0
}

**Verificación manual:**

PR → IC: PR → IT → IC = 4 + 6 = 10 UC.

PR → PD: PR → IT → PD = 4 + 8 = 12 UC.

PR → IP: PR → FN → IP = 9 + 8 = 17 UC.

BN → IP: BN → FN → IP = 6 + 8 = 14 UC.

PD → IK: conexión directa de 3 UC.

**Resultado:** Se obtienen los costos mínimos entre los 8 vértices, generando 64 pares origen-destino.

**Comparación con Dijkstra:** Pendiente de incorporar las métricas de ejecución de Dijkstra desde cada vértice y las evaluaciones realizadas por Floyd-Warshall.

---

### GET /api/grafo/comparacion

**Endpoint:** GET /api/grafo/comparacion

**Descripción:** Compara Floyd-Warshall con Dijkstra ejecutado una vez desde cada vértice del grafo.

**Parámetros:** No requiere parámetros.

**Técnicas:** Programación Dinámica (Floyd-Warshall) y Greedy (Dijkstra).

**Complejidad temporal:**

**Floyd-Warshall:** O(V³).

**Dijkstra V veces:** O(V(V+E) log V).

**Comparación total:** O(V³ + V(V+E) log V).

**Complejidad espacial:** O(V² + V + E), incluyendo la matriz de Floyd y las estructuras auxiliares utilizadas por Dijkstra.

**Métricas registradas:**

**Evaluaciones Floyd:** cantidad de combinaciones (k,i,j).

**Expansiones Dijkstra:** cantidad de vértices procesados por primera vez, sumada para todos los orígenes.

**Aristas examinadas Dijkstra:** cantidad total de entradas de adyacencia procesadas.

**Mismas distancias:** indica si ambos algoritmos calcularon los mismos costos mínimos.

**Resultados esperados sobre la Red de Islas Piratas:**

Vértices
8
Evaluaciones Floyd
512
Expansiones Dijkstra
64
Aristas examinadas Dijkstra
224
Coincidencia de distancias
true
**Conclusión:** Ambos algoritmos calculan los mismos costos mínimos para todos los pares de vértices. Floyd-Warshall utiliza una matriz y un procedimiento de programación dinámica, mientras que Dijkstra utiliza una cola de prioridad y una estrategia greedy. Las métricas cuentan operaciones de distinta naturaleza y no representan directamente tiempos de ejecución.

---

