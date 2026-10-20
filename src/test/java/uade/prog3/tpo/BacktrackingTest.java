package uade.prog3.tpo;

import org.junit.jupiter.api.Test;
import uade.prog3.tpo.algorithm.Backtracking;
import uade.prog3.tpo.service.Grafo;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class BacktrackingTest {

    @Test
    void testRutasSimplesConPoda() {

        Grafo grafo = new Grafo(false);

        grafo.agregarArista("PR", "IT", 4);
        grafo.agregarArista("PR", "FN", 9);
        grafo.agregarArista("IT", "IP", 20);
        grafo.agregarArista("FN", "IP", 8);
        grafo.agregarArista("IT", "BN", 25);
        grafo.agregarArista("BN", "IC", 3);
        grafo.agregarArista("IC", "IP", 4);

        Backtracking backtracking = new Backtracking();

        Backtracking.ResultadoRutas resultado =
                backtracking.rutasSimples(grafo, "PR", "IP", 20, 3);

        assertEquals(1, resultado.rutas().size());

        assertEquals(
                List.of("PR", "FN", "IP"),
                resultado.rutas().get(0).vertices()
        );

        assertEquals(17.0,
                resultado.rutas().get(0).costoTotal());

        assertTrue(resultado.exploradosConPoda()
                < resultado.exploradosSinPoda());

        assertEquals(
                resultado.exploradosSinPoda()
                        - resultado.exploradosConPoda(),
                resultado.estadosEvitados()
        );
    }
}
