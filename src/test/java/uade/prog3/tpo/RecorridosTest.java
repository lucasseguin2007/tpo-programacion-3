package uade.prog3.tpo;

import org.junit.jupiter.api.Test;
import uade.prog3.tpo.algorithm.Recorridos;
import uade.prog3.tpo.service.Grafo;

import java.util.List;
import java.util.Set;
import java.util.HashSet;

import static org.junit.jupiter.api.Assertions.*;

class RecorridosTest {

    private final Recorridos recorridos = new Recorridos();

    private Grafo crearGrafo() {
        Grafo g = new Grafo(false);

        g.agregarArista("PR", "IT", 4);
        g.agregarArista("PR", "BN", 7);
        g.agregarArista("PR", "FN", 9);
        g.agregarArista("IT", "BN", 3);
        g.agregarArista("IT", "IC", 6);
        g.agregarArista("IT", "PD", 8);
        g.agregarArista("BN", "IC", 5);
        g.agregarArista("BN", "FN", 6);
        g.agregarArista("IC", "PD", 4);
        g.agregarArista("IC", "IK", 7);
        g.agregarArista("PD", "IK", 3);
        g.agregarArista("PD", "IP", 9);
        g.agregarArista("IK", "IP", 5);
        g.agregarArista("FN", "IP", 8);

        return g;
    }

    @Test
    void dfsVisitaTodasLasIslas() {
        List<String> resultado =
                recorridos.dfs(crearGrafo(), "PR");

        assertEquals(8, resultado.size());
        assertEquals("PR", resultado.get(0));
        assertEquals(8, new HashSet<>(resultado).size());
    }

    @Test
    void bfsRecorrePorNiveles() {
        List<String> resultado =
                recorridos.bfs(crearGrafo(), "PR");

        assertEquals(List.of(
                "PR", "IT", "BN", "FN",
                "IC", "PD", "IP", "IK"
        ), resultado);
    }

    @Test
    void origenInexistenteLanzaExcepcion() {
        Grafo grafo = crearGrafo();

        assertThrows(IllegalArgumentException.class,
                () -> recorridos.dfs(grafo, "XX"));

        assertThrows(IllegalArgumentException.class,
                () -> recorridos.bfs(grafo, "XX"));
    }
}