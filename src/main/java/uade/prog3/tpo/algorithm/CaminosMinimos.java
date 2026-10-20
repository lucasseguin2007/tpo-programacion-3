package uade.prog3.tpo.algorithm;

import org.springframework.stereotype.Component;
import uade.prog3.tpo.service.Grafo;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.PriorityQueue;

/**
 * UNIDAD: Grafos II (clase 5) y PD sobre grafos (clase 8)
 * PUNTAJE: forma parte de los 3 puntos de "Dijkstra, Prim, Kruskal"
 *          y de 1 punto de programacion dinamica si implementan Floyd.
 */
@Component
public class CaminosMinimos {

    /** Resultado de una consulta de camino minimo. */
    public record Camino(List<String> vertices, double costoTotal) { }
    private record Estado(int nodo, double distancia) {}
    /**
     * Dijkstra: camino de costo minimo desde un origen hasta un destino.
     *
     * Requisitos:
     *   - usar cola de prioridad (PriorityQueue), no busqueda lineal del minimo
     *   - implementar la relajacion de aristas
     *   - mantener un arreglo de predecesores para poder RECONSTRUIR el camino,
     *     no solo devolver la distancia
     *   - validar que no haya aristas de costo negativo y fallar con un mensaje
     *     claro si las hay
     *
     * Complejidad esperada: O((V + E) log V) con heap binario.
     *
     * Para el coloquio: saber explicar por que Dijkstra es un algoritmo greedy
     * y por que los pesos negativos lo rompen.
     */
    public Camino dijkstra(Grafo grafo, String origenId, String destinoId) {
        int n = grafo.cantidadVertices();
        int origen = grafo.indiceDe(origenId);
        int destino = grafo.indiceDe(destinoId);

        // Validar que no existan costos negativos
        for (int i = 0; i < n; i++) {
            for (Grafo.Arista arista : grafo.vecinos(i)) {
                if (!Double.isFinite(arista.costo()) || arista.costo() < 0) {
                    throw new IllegalArgumentException(
                            "Dijkstra requiere costos finitos y no negativos"
                    );
                }
            }
        }

        double[] distancias = new double[n];
        int[] anteriores = new int[n];
        boolean[] visitados = new boolean[n];

        Arrays.fill(distancias, Double.POSITIVE_INFINITY);
        Arrays.fill(anteriores, -1);

        distancias[origen] = 0;

        PriorityQueue<Estado> cola = new PriorityQueue<>(
                (a, b) -> Double.compare(a.distancia(), b.distancia())
        );

        cola.add(new Estado(origen, 0));

        while (!cola.isEmpty()) {
            Estado estado = cola.poll();
            int actual = estado.nodo();

            if (visitados[actual]) {
                continue;
            }

            visitados[actual] = true;

            // Explorar los vecinos
            for (Grafo.Arista arista : grafo.vecinos(actual)) {
                int vecino = arista.destino();
                double costo = arista.costo();

                double nuevaDistancia = distancias[actual] + costo;

                if (!visitados[vecino] &&
                        nuevaDistancia < distancias[vecino]) {

                    distancias[vecino] = nuevaDistancia;
                    anteriores[vecino] = actual;

                    cola.add(new Estado(vecino, nuevaDistancia));
                }
            }
        }

        if (Double.isInfinite(distancias[destino])) {
            throw new IllegalArgumentException(
                    "No existe un camino entre los nodos indicados"
            );
        }

        // Reconstruir el camino desde el destino
        List<String> camino = new ArrayList<>();

        int actual = destino;

        while (actual != -1) {
            camino.add(grafo.idDe(actual));
            actual = anteriores[actual];
        }

        Collections.reverse(camino);

        return new Camino(camino, distancias[destino]);
    }

    /**
     * Floyd-Warshall: costo minimo entre TODOS los pares de vertices.
     *
     * Requisitos:
     *   - trabajar sobre la matriz de adyacencia (grafo.matrizDeAdyacencia())
     *   - el bucle del vertice intermedio k va SIEMPRE por fuera de los de i y j
     *   - detectar ciclos de costo negativo revisando la diagonal al terminar
     *
     * Complejidad esperada: O(V^3) en tiempo, O(V^2) en espacio.
     *
     * Devuelve un mapa "origen->destino" con el costo minimo de cada par.
     */
    public Map<String, Double> floydWarshall(Grafo grafo) {
        throw new PendienteDeImplementar("Floyd-Warshall");
    }

    /**
     * UCS (Uniform Cost Search): igual que Dijkstra pero con parada temprana
     * al expandir el destino.
     *
     * OPCIONAL. Solo suma si ya estan implementados Dijkstra y Floyd.
     * Si lo hacen, en el coloquio hay que poder mostrar la diferencia de
     * nodos expandidos respecto de Dijkstra sobre la misma consulta.
     */
    public Camino ucs(Grafo grafo, String origenId, String destinoId) {
        throw new PendienteDeImplementar("UCS");
    }
}
