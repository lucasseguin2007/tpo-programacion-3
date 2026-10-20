package uade.prog3.tpo;
import org.junit.jupiter.api.Test;
import uade.prog3.tpo.algorithm.ArbolRecubrimiento;
import uade.prog3.tpo.service.Grafo;

import static org.junit.jupiter.api.Assertions.*;

class ArbolRecubrimientoTest {

    private final ArbolRecubrimiento algoritmo =
            new ArbolRecubrimiento();

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
    void primEncuentraCostoMinimo() {
        ArbolRecubrimiento.Mst resultado =
                algoritmo.prim(crearGrafo(), "PR");

        assertEquals(30.0, resultado.costoTotal());
        assertEquals(7, resultado.aristas().size());
    }

    @Test
    void primRechazaGrafoDirigido() {
        Grafo g = new Grafo(true);
        g.agregarArista("A", "B", 5);

        assertThrows(IllegalArgumentException.class,
                () -> algoritmo.prim(g, "A"));
    }

    @Test
    void primRechazaGrafoDesconectado() {
        Grafo g = new Grafo(false);
        g.agregarArista("A", "B", 5);
        g.agregarVertice("C");

        assertThrows(IllegalArgumentException.class,
                () -> algoritmo.prim(g, "A"));
    }

    @Test
    void kruskalEncuentraCostoMinimo() {
        ArbolRecubrimiento.Mst resultado =
                algoritmo.kruskal(crearGrafo());

        assertEquals(30.0, resultado.costoTotal());
        assertEquals(7, resultado.aristas().size());
    }

    @Test
    void kruskalRechazaGrafoDirigido() {
        Grafo g = new Grafo(true);
        g.agregarArista("A", "B", 5);

        assertThrows(IllegalArgumentException.class,
                () -> algoritmo.kruskal(g));
    }

    @Test
    void kruskalRechazaGrafoDesconectado() {
        Grafo g = new Grafo(false);
        g.agregarArista("A", "B", 5);
        g.agregarVertice("C");

        assertThrows(IllegalArgumentException.class,
                () -> algoritmo.kruskal(g));
    }
}
