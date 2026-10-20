package uade.prog3.tpo;

import org.junit.jupiter.api.Test;
import uade.prog3.tpo.algorithm.CaminosMinimos;
import uade.prog3.tpo.service.Grafo;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CaminosMinimosTest {

    private final CaminosMinimos algoritmo = new CaminosMinimos();

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
    void dijkstraEncuentraCaminoMinimo() {
        CaminosMinimos.Camino resultado =
                algoritmo.dijkstra(crearGrafo(), "PR", "IP");

        assertEquals(17.0, resultado.costoTotal());
        assertEquals(
                List.of("PR", "FN", "IP"),
                resultado.vertices()
        );
    }

    @Test
    void dijkstraOrigenIgualDestino() {
        CaminosMinimos.Camino resultado =
                algoritmo.dijkstra(crearGrafo(), "PR", "PR");

        assertEquals(0.0, resultado.costoTotal());
        assertEquals(List.of("PR"), resultado.vertices());
    }

    @Test
    void dijkstraRechazaPesosNegativos() {
        Grafo g = new Grafo(true);
        g.agregarArista("A", "B", -5);

        assertThrows(
                IllegalArgumentException.class,
                () -> algoritmo.dijkstra(g, "A", "B")
        );
    }
}
