package uade.prog3.tpo;

import org.junit.jupiter.api.Test;
import uade.prog3.tpo.algorithm.Ordenamiento;
import uade.prog3.tpo.algorithm.Seleccion;
import uade.prog3.tpo.model.Item;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SeleccionTest {

    private final Seleccion seleccion =
            new Seleccion(new Ordenamiento());

    private List<Item> crearItems() {
        return List.of(
                new Item("I1", "Item 1", 5, 10, "PR"),
                new Item("I2", "Item 2", 4, 40, "IT"),
                new Item("I3", "Item 3", 6, 30, "BN"),
                new Item("I4", "Item 4", 3, 50, "IC"),
                new Item("I5", "Item 5", 7, 55, "PD")
        );
    }

    @Test
    void greedyNoEncuentraElOptimo() {
        var resultado = seleccion.greedy(crearItems(), 10);

        assertEquals(90, resultado.valorTotal());
        assertEquals(7, resultado.pesoTotal());
        assertEquals(2, resultado.elegidos().size());
    }

    @Test
    void programacionDinamicaEncuentraElOptimo() {
        var resultado =
                seleccion.programacionDinamica(crearItems(), 10);

        assertEquals(105, resultado.valorTotal());
        assertEquals(10, resultado.pesoTotal());
        assertEquals(2, resultado.elegidos().size());

        var ids = resultado.elegidos().stream()
                .map(Item::getId)
                .toList();

        assertTrue(ids.contains("I4"));
        assertTrue(ids.contains("I5"));
    }

    @Test
    void dinamicaSuperaGreedy() {
        var items = crearItems();

        var greedy = seleccion.greedy(items, 10);
        var dinamica =
                seleccion.programacionDinamica(items, 10);

        assertTrue(dinamica.valorTotal() >
                greedy.valorTotal());
    }
}
