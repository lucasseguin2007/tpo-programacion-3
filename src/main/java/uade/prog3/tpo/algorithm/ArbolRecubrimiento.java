package uade.prog3.tpo.algorithm;

import org.springframework.stereotype.Component;
import uade.prog3.tpo.service.Grafo;

import java.util.List;
import java.util.ArrayList;
import java.util.PriorityQueue;
import java.util.Comparator;

/**
 * UNIDAD: Grafos II (clase 5)
 * PUNTAJE: forma parte de los 3 puntos de "Dijkstra, Prim, Kruskal"
 *
 * ATENCION: el arbol de recubrimiento minimo solo tiene sentido sobre un
 * grafo NO DIRIGIDO y CONEXO. Al cargar el grafo hay que pedirlo con
 * grafoService.cargar(false).
 */
@Component
public class ArbolRecubrimiento {

    /** Una arista del arbol resultante, con ids de negocio. */
    public record AristaMst(String origen, String destino, double costo) { }
    private record Candidata(int origen, int destino, double costo) {}

    /** Arbol de recubrimiento minimo completo. */
    public record Mst(List<AristaMst> aristas, double costoTotal) { }

    /**
     * Prim: hace crecer un unico arbol desde un vertice inicial, tomando en
     * cada paso la arista de menor costo que cruza de dentro hacia afuera.
     *
     * Requisitos:
     *   - arreglos key[], parent[] e inMST[], o bien una cola de prioridad
     *   - el resultado debe tener exactamente V-1 aristas si el grafo es conexo
     *   - si el grafo NO es conexo, fallar con un mensaje claro
     *
     * Complejidad esperada: O(V^2) con busqueda lineal, O(E log V) con heap.
     * Hay que decir cual de las dos implementaron y por que.
     */
    public Mst prim(Grafo grafo, String origenId) {
        if (grafo.esDirigido()) {
            throw new IllegalArgumentException(
                    "Prim requiere un grafo no dirigido"
            );
        }

        int n = grafo.cantidadVertices();
        int origen = grafo.indiceDe(origenId);

        boolean[] visitados = new boolean[n];
        List<AristaMst> resultado = new ArrayList<>();

        PriorityQueue<Candidata> cola = new PriorityQueue<>(
                (a, b) -> Double.compare(a.costo(), b.costo())
        );

        double costoTotal = 0;
        int cantidadVisitados = 1;
        visitados[origen] = true;

        // Agregar las aristas que salen del origen
        for (Grafo.Arista arista : grafo.vecinos(origen)) {
            cola.add(new Candidata(
                    origen, arista.destino(), arista.costo()
            ));
        }

        while (!cola.isEmpty() && cantidadVisitados < n) {

            Candidata actual = cola.poll();

            if (visitados[actual.destino()]) {
                continue;
            }

            // Incorporar el nuevo vertice al MST
            int nuevo = actual.destino();
            visitados[nuevo] = true;
            cantidadVisitados++;

            resultado.add(new AristaMst(
                    grafo.idDe(actual.origen()),
                    grafo.idDe(nuevo),
                    actual.costo()
            ));

            costoTotal += actual.costo();

            // Agregar nuevas conexiones candidatas
            for (Grafo.Arista arista : grafo.vecinos(nuevo)) {
                if (!visitados[arista.destino()]) {
                    cola.add(new Candidata(
                            nuevo, arista.destino(), arista.costo()
                    ));
                }
            }
        }

        if (cantidadVisitados != n) {
            throw new IllegalArgumentException(
                    "El grafo no es conexo"
            );
        }

        return new Mst(resultado, costoTotal);
    }

    /**
     * Kruskal: ordena TODAS las aristas por costo y las agrega salteando las
     * que formarian ciclo.
     *
     * Requisitos:
     *   - implementar Union-Find (find y union) a mano, sin librerias
     *   - la deteccion de ciclo es: find(u) == find(v)
     *   - terminar al llegar a V-1 aristas
     *
     * Complejidad esperada: O(E log E).
     *
     * Para el coloquio: saber justificar en que caso conviene Prim y en cual
     * Kruskal, en funcion de la densidad del grafo.
     */
    public Mst kruskal(Grafo grafo) {

        if (grafo.esDirigido()) {
            throw new IllegalArgumentException(
                    "Kruskal requiere un grafo no dirigido"
            );
        }

        int n = grafo.cantidadVertices();

        if (n == 0) {
            throw new IllegalArgumentException("El grafo está vacío");
        }

        // 1. Obtener todas las aristas sin duplicarlas
        List<Candidata> aristas = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            for (Grafo.Arista arista : grafo.vecinos(i)) {

                int destino = arista.destino();

                if (!Double.isFinite(arista.costo())) {
                    throw new IllegalArgumentException(
                            "Las aristas deben tener costos finitos"
                    );
                }

                // Cada arista no dirigida se guarda una sola vez
                if (i < destino) {
                    aristas.add(new Candidata(
                            i, destino, arista.costo()
                    ));
                }
            }
        }

        // 2. Ordenar las aristas por costo creciente
        aristas.sort(Comparator.comparingDouble(Candidata::costo));

        // 3. Inicializar Union-Find
        int[] padre = new int[n];
        int[] tamanio = new int[n];

        for (int i = 0; i < n; i++) {
            padre[i] = i;
            tamanio[i] = 1;
        }

        List<AristaMst> resultado = new ArrayList<>();
        double costoTotal = 0;

        // 4. Recorrer las aristas ordenadas
        for (Candidata arista : aristas) {

            int origen = arista.origen();
            int destino = arista.destino();

            // Solo agregarla si no forma un ciclo
            if (union(origen, destino, padre, tamanio)) {

                resultado.add(new AristaMst(
                        grafo.idDe(origen),
                        grafo.idDe(destino),
                        arista.costo()
                ));

                costoTotal += arista.costo();

                if (resultado.size() == n - 1) {
                    break;
                }
            }
        }

        // 5. Comprobar conectividad
        if (resultado.size() != n - 1) {
            throw new IllegalArgumentException(
                    "El grafo no es conexo"
            );
        }

        return new Mst(resultado, costoTotal);
    }


    private int find(int x, int[] padre) {

        if (padre[x] != x) {
            padre[x] = find(padre[x], padre);
        }

        return padre[x];
    }

    private boolean union(int x, int y, int[] padre, int[] tamanio) {

        int raizX = find(x, padre);
        int raizY = find(y, padre);

        // Ya pertenecen al mismo conjunto: formaría un ciclo
        if (raizX == raizY) {
            return false;
        }

        // Unir el conjunto más chico al más grande
        if (tamanio[raizX] < tamanio[raizY]) {
            padre[raizX] = raizY;
            tamanio[raizY] += tamanio[raizX];
        } else {
            padre[raizY] = raizX;
            tamanio[raizX] += tamanio[raizY];
        }

        return true;
    }

}
