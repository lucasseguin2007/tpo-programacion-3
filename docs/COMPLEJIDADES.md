# Hito 10 - Informe de complejidades

## Introducción

Este informe analiza la complejidad temporal y espacial de los algoritmos implementados en el proyecto Red de Islas Piratas.

El análisis considera las estructuras de datos utilizadas en las implementaciones Java del proyecto.

## Variables que se utilizan
-V: cantidad de vétices del grafo.
-E: cantidad de aristas del grafo.
-n: cantidad de elementos o ítems.
-W: capacidad de la mochila

## 1. Divide y Conquista

### QuickSort

**Recurrencia (caso promedio):**

T(n) = 2T(n/2) + O(n)

**Recurrencia (peor caso):**

T(n) = T(n-1) + O(n)

**Complejidad temporal:**
- Caso promedio: O(n log n).
- Peor caso: O(n²).

**Complejidad espacial:** O(n) en el peor caso, considerando la copia de entrada y la pila recursiva.

**Estructuras utilizadas:** ArrayList y pila de recursión.

**Justificación:** Se utiliza como pivote el último elemento de la lista. La partición recorre los elementos en tiempo lineal. Cuando las particiones están equilibradas, el algoritmo tiene complejidad O(n log n). Cuando el pivote queda siempre en un extremo, la complejidad aumenta a O(n²).

### MergeSort

**Recurrencia:**

T(n) = 2T(n/2) + O(n)

**Complejidad temporal:** O(n log n).

**Complejidad espacial:** O(n) de memoria auxiliar máxima simultánea.

**Estructuras utilizadas:** ArrayList, sublistas auxiliares y pila de recursión.

**Justificación:** Divide la lista en dos mitades recursivamente y posteriormente las combina mediante el método merge, que requiere O(n) operaciones. La profundidad de recursión es O(log n), por lo que el tiempo total es O(n log n).


## 2. Algoritmos sobre grafos

### DFS (Depth First Search)

**Recurrencia:** No se utiliza una recurrencia de división o sustracción. Se realiza un recorrido recursivo del grafo.

**Complejidad temporal:** O(V + E).

**Complejidad espacial:** O(V).

**Estructuras utilizadas:** Lista de adyacencia, HashSet, ArrayList y pila de recursión.

**Justificación:** Cada vértice se visita una sola vez gracias al HashSet de visitados. Además, se recorren las aristas de cada vértice mediante la lista de adyacencia. La pila recursiva puede alcanzar una profundidad de V vértices.

### BFS (Breadth First Search)

**Recurrencia:** No aplica, es un algoritmo iterativo.

**Complejidad temporal:** O(V + E).

**Complejidad espacial:** O(V).

**Estructuras utilizadas:** Lista de adyacencia, ArrayDeque, HashSet y ArrayList.

**Justificación:** Cada vértice se encola una única vez y cada arista se examina durante la exploración de los vecinos. El HashSet permite consultar los visitados en O(1) promedio y ArrayDeque implementa la cola FIFO.

### Dijkstra

**Recurrencia:** No aplica, es un algoritmo iterativo de técnica Greedy.

**Complejidad temporal:** O((V + E) log(V + E)).

**Complejidad espacial:** O(V + E).

**Estructuras utilizadas:** Lista de adyacencia, PriorityQueue, double[], int[] y boolean[].

**Justificación:** Se utiliza una cola de prioridad basada en heap binario para seleccionar el siguiente vértice de menor distancia. Cada vértice se procesa una sola vez y sus aristas se relajan. Como la implementación inserta nuevos estados en lugar de actualizar las prioridades existentes, la cola puede contener O(E) entradas.

### Prim

**Recurrencia:** No aplica, es un algoritmo iterativo de técnica Greedy.

**Complejidad temporal:** O(E log E), para un grafo conexo.

**Complejidad espacial:** O(V + E).

**Estructuras utilizadas:** Lista de adyacencia, PriorityQueue, boolean[] y ArrayList.

**Justificación:** Prim comienza desde un vértice y agrega la arista de menor costo que conecta el árbol actual con un vértice no visitado. La cola de prioridad almacena las aristas candidatas, y cada inserción o extracción cuesta O(log E).

### Kruskal

**Recurrencia:** No aplica al algoritmo principal. El método find de Union-Find utiliza recursión con compresión de caminos.

**Complejidad temporal:** O(E log E), para un grafo conexo.

**Complejidad espacial:** O(V + E).

**Estructuras utilizadas:** Lista de aristas, ArrayList, arreglos padre[] y tamanio[] para Union-Find.

**Justificación:** Primero se ordenan las E aristas de menor a mayor costo. Luego, mediante Union-Find con compresión de caminos y unión por tamaño, se comprueba si agregar cada arista formaría un ciclo. El ordenamiento domina la complejidad temporal.


## 3. Algoritmos de selección

### Greedy (Mochila 0/1)

**Recurrencia:** El algoritmo principal es iterativo. Utiliza MergeSort, cuya recurrencia es T(n) = 2T(n/2) + O(n).

**Complejidad temporal:** O(n log n).

**Complejidad espacial:** O(n).

**Estructuras utilizadas:** ArrayList, Comparator y MergeSort propio.

**Justificación:** Los items se ordenan de manera descendente según su relación valor/peso utilizando MergeSort, que tiene complejidad O(n log n). Posteriormente, se recorren una sola vez para seleccionar aquellos que entran en la capacidad disponible, con costo O(n). El ordenamiento domina la complejidad total.

Al tratarse de objetos indivisibles, este algoritmo no garantiza encontrar la solución óptima.

### Programación Dinámica (Mochila 0/1)

**Recurrencia:** La implementación es iterativa (bottom-up), pero utiliza la siguiente relación:

dp[i][w] = dp[i-1][w] si el item i no entra.

dp[i][w] = max(dp[i-1][w], dp[i-1][w-peso[i]] + valor[i]) si entra.

**Complejidad temporal:** O(n * W).

**Complejidad espacial:** O(n * W).

**Estructuras utilizadas:** Matriz double[][] dp y ArrayList.

**Justificación:** Se construye una tabla de (n+1) filas y (W+1) columnas. Cada celda se calcula en tiempo constante a partir de resultados anteriores. La reconstrucción de los items seleccionados requiere O(n), sin modificar la complejidad dominante.

La complejidad es pseudopolinómica porque depende del valor numérico de la capacidad W.

## 4. Programación Dinámica sobre grafos

### Floyd-Warshall

**Recurrencia:** La implementación es iterativa. La relación de programación dinámica es:

D(k,i,j) = min(D(k-1,i,j), D(k-1,i,k) + D(k-1,k,j))

**Complejidad temporal:** O(V³).

**Complejidad espacial:** O(V²).

**Estructuras utilizadas:** Matriz double[][] y LinkedHashMap.

**Justificación:** El algoritmo utiliza tres bucles anidados que recorren los V vértices del grafo. Cada combinación de índices (k, i, j) realiza operaciones de tiempo constante. Por eso, su complejidad temporal es O(V³).

La matriz de distancias y el mapa de resultados almacenan información para V² pares de vértices.

## 5. Backtracking

### Búsqueda de rutas simples con poda

**Recurrencia:** El algoritmo realiza una llamada recursiva por cada vecino no visitado. La cantidad de llamadas depende del número de alternativas disponibles en cada nivel.

**Complejidad temporal:** O(V!) en el peor caso.

**Complejidad espacial:** O(V) auxiliar, sin contar las rutas almacenadas.

**Estructuras utilizadas:** Lista de adyacencia, boolean[] de visitados, ArrayList y pila recursiva.

**Justificación:** El algoritmo explora caminos simples entre dos vértices, sin repetir nodos. En un grafo completo puede generar una cantidad factorial de caminos.

Se aplican dos criterios de poda:
- Costo acumulado superior al máximo permitido.
- Cantidad de saltos superior al límite establecido.

La poda reduce los estados explorados en la práctica, pero no modifica el peor caso asintótico.

La implementación ejecuta el recorrido dos veces, una con poda y otra sin poda, para comparar los nodos explorados. Esto multiplica el costo por una constante, sin cambiar su orden asintótico.

**Espacio para resultados:** Como se almacenan las rutas encontradas, la memoria total puede alcanzar O(V * V!) en el peor caso.


---



## 6. Ramificación y Poda (Branch & Bound)

### Reparto óptimo de cargamentos

**Objetivo:** Distribuir n cargamentos entre k barcos minimizando la carga máxima.

**Recurrencia:**

T(n) = k * T(n-1) + O(k)

Cada cargamento puede asignarse a cualquiera de los k barcos.

**Complejidad temporal:** O(k^n * (k+n)) en el peor caso.

**Complejidad espacial:** O(k+n).

**Estructuras utilizadas:** ArrayList, LinkedHashMap, double[] y pila de recursión.

**Justificación:** En cada nivel del árbol de búsqueda se prueba asignar un cargamento a cada uno de los k barcos. Sin poda, existen k^n asignaciones posibles.

La implementación calcula una cota inferior:

C = max(cargaMaximaActual, pesoTotal/k)

Esta cota es optimista porque ninguna distribución puede alcanzar una carga máxima inferior al promedio de los pesos ni a la carga máxima ya asignada.

Si la cota es mayor o igual que la mejor solución encontrada, se poda la rama.

**Verificación sobre el proyecto:**

- Cantidad de cargamentos: 5.
- Cantidad de barcos: 2.
- Peso total: 25.
- Carga máxima óptima: 13.
- Nodos explorados: 49.
- Nodos podados: 21.

**Resultado:** El algoritmo encuentra una distribución óptima y evita explorar ramas que no pueden mejorar la solución.


## 7. Tabla resumen de complejidades
| Algoritmo | Recurrencia | Tiempo | Espacio | Estructura de datos |
|---|---|---|---|---|
| QuickSort | T(n)=T(k)+T(n-k-1)+O(n) | O(n log n) promedio; O(n²) peor | O(n) | ArrayList, pila recursiva |
| MergeSort | T(n)=2T(n/2)+O(n) | O(n log n) | O(n) | ArrayList, listas auxiliares |
| DFS | Recursión sobre vecinos | O(V+E) | O(V) | HashSet, lista de adyacencia |
| BFS | No aplica | O(V+E) | O(V) | ArrayDeque, HashSet |
| Dijkstra | No aplica | O((V+E) log(V+E)) | O(V+E) | PriorityQueue, arreglos |
| Prim | No aplica | O(E log E) | O(V+E) | PriorityQueue, boolean[] |
| Kruskal | No aplica | O(E log E) | O(V+E) | ArrayList, Union-Find |
| Greedy | MergeSort: T(n)=2T(n/2)+O(n) | O(n log n) | O(n) | ArrayList, MergeSort |
| Mochila 0/1 | Relación dp[i][w] | O(n·W) | O(n·W) | double[][] |
| Floyd-Warshall | Relación D(k,i,j) | O(V³) | O(V²) | double[][], LinkedHashMap |
| Backtracking | Recursión sobre vecinos | O(V!) | O(V) auxiliar | boolean[], ArrayList |
| Branch & Bound | T(n)=kT(n-1)+O(k) | O(k^n·(k+n)) | O(k+n) | ArrayList, double[], recursión |
### Consideraciones
- Las complejidades corresponden a las implementaciones utilizadas en el proyecto.
- Se considera acceso promedio O(1) para las operaciones de HashMap y HashSet.
- El espacio indicado es auxiliar, salvo cuando se aclara lo contrario.
- El grafo se representa mediante listas de adyacencia.
- Las complejidades de grafos consideran V vértices y E aristas.
- El análisis no incluye los costos de consultas a Neo4j, ya que los algoritmos trabajan sobre el grafo cargado en memoria.
- En Backtracking, almacenar todas las rutas encontradas puede requerir espacio factorial adicional.
