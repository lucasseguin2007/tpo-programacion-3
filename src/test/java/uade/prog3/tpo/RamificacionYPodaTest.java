package uade.prog3.tpo;

import org.junit.jupiter.api.Test;
import uade.prog3.tpo.algorithm.RamificacionYPoda;
import uade.prog3.tpo.model.Item;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RamificacionYPodaTest {

    private final RamificacionYPoda algoritmo =
            new RamificacionYPoda();

    @Test
    void encuentraRepartoOptimo() {

        List<Item> items = List.of(
                new Item("A", "Carga A", 6, 10, "PR"),
                new Item("B", "Carga B", 4, 10, "IT"),
                new Item("C", "Carga C", 3, 10, "BN")
        );

        var resultado = algoritmo.repartir(items, 2);

        assertEquals(7.0, resultado.cargaMaxima());

        assertEquals(2, resultado.porContenedor().size());

        int cantidadItems = resultado.porContenedor()
                .values()
                .stream()
                .mapToInt(List::size)
                .sum();

        assertEquals(3, cantidadItems);
        assertTrue(resultado.nodosExplorados() > 0);
    }

    @Test
    void registraNodosPodados() {

        List<Item> items = List.of(
                new Item("A", "Carga A", 6, 10, "PR"),
                new Item("B", "Carga B", 4, 10, "IT"),
                new Item("C", "Carga C", 3, 10, "BN")
        );

        var resultado = algoritmo.repartir(items, 2);

        assertTrue(resultado.nodosPodados() > 0);
        assertTrue(resultado.nodosExplorados()
                >= resultado.nodosPodados());
    }

    @Test
    void rechazaCantidadContenedoresInvalida() {

        List<Item> items = List.of(
                new Item("A", "Carga A", 5, 10, "PR")
        );

        assertThrows(IllegalArgumentException.class,
                () -> algoritmo.repartir(items, 0));
    }
}
