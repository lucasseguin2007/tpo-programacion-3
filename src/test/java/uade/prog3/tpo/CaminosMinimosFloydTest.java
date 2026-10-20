package uade.prog3.tpo;

import org.junit.jupiter.api.Test;
import uade.prog3.tpo.algorithm.CaminosMinimos;
import uade.prog3.tpo.service.Grafo;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CaminosMinimosFloydTest {

    private final CaminosMinimos algoritmo =
            new CaminosMinimos();

    @Test
    void encuentraCaminosMinimos() {

        Grafo grafo = new Grafo(true);

        grafo.agregarArista("A", "B", 4);
        grafo.agregarArista("A", "C", 9);
        grafo.agregarArista("B", "C", 3);
        grafo.agregarArista("C", "D", 2);

        Map<String, Double> resultado =
                algoritmo.floydWarshall(grafo);

        assertEquals(7.0, resultado.get("A->C"));
        assertEquals(9.0, resultado.get("A->D"));
        assertEquals(5.0, resultado.get("B->D"));
        assertEquals(0.0, resultado.get("A->A"));
        assertNull(resultado.get("D->A"));
    }

    @Test
    void detectaCiclosNegativos() {

        Grafo grafo = new Grafo(true);

        grafo.agregarArista("A", "B", 2);
        grafo.agregarArista("B", "C", -5);
        grafo.agregarArista("C", "A", 1);

        assertThrows(
                IllegalArgumentException.class,
                () -> algoritmo.floydWarshall(grafo)
        );
    }

    @Test
    void compararFloydContraDijkstra() {

        Grafo grafo = new Grafo(false);

        grafo.agregarArista("A", "B", 4);
        grafo.agregarArista("A", "C", 9);
        grafo.agregarArista("B", "C", 3);
        grafo.agregarArista("C", "D", 2);

        var resultado =
                algoritmo.compararFloydConDijkstra(grafo);

        assertEquals(4, resultado.vertices());
        assertEquals(64, resultado.evaluacionesFloyd());
        assertEquals(16, resultado.expansionesDijkstra());
        assertEquals(32, resultado.aristasExaminadasDijkstra());
        assertTrue(resultado.mismasDistancias());
    }

}
