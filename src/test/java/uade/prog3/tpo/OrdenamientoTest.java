package uade.prog3.tpo;

import org.junit.jupiter.api.Test;
import uade.prog3.tpo.algorithm.Ordenamiento;
import uade.prog3.tpo.model.Item;

import java.util.Comparator;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class OrdenamientoTest {
    @Test
    void quickSortOrdenaPorRatioDescendente() {
        Ordenamiento ordenamiento = new Ordenamiento();

        List<Item> items = List.of(
                new Item("I1","Item 1",5,10,"A"),
                new Item("I2","Item 2",4,40,"B"),
                new Item("I3","Item 3",6,30,"C"),
                new Item("I4","Item 4",3,50,"D"),
                new Item("I5","Item 5",7,55,"E")
        );
        Comparator<Item> criterio = Comparator.comparingDouble(Item::ratioValorPeso).reversed();

        List<Item> resultado = ordenamiento.quickSort(items,criterio);

        assertEquals("I1", items.get(0).getId());
        assertEquals("I2", items.get(1).getId());
        assertEquals("I3", items.get(2).getId());
        assertEquals("I4", items.get(3).getId());
        assertEquals("I5", items.get(4).getId());
    }

    @Test
    void mergeSortOrdenaPorRatioDescendente() {

        Ordenamiento ordenamiento = new Ordenamiento();

        List<Item> items = List.of(
                new Item("I1", "Item 1", 5, 10, "A"),
                new Item("I2", "Item 2", 4, 40, "B"),
                new Item("I3", "Item 3", 6, 30, "C"),
                new Item("I4", "Item 4", 3, 50, "D"),
                new Item("I5", "Item 5", 7, 55, "E")
        );

        Comparator<Item> criterio =
                Comparator.comparingDouble(Item::ratioValorPeso).reversed();

        List<Item> resultado =
                ordenamiento.mergeSort(items, criterio);

        assertEquals("I4", resultado.get(0).getId());
        assertEquals("I2", resultado.get(1).getId());
        assertEquals("I5", resultado.get(2).getId());
        assertEquals("I3", resultado.get(3).getId());
        assertEquals("I1", resultado.get(4).getId());

        // La lista original no debe modificarse
        assertEquals("I1", items.get(0).getId());
        assertEquals("I2", items.get(1).getId());
        assertEquals("I3", items.get(2).getId());
        assertEquals("I4", items.get(3).getId());
        assertEquals("I5", items.get(4).getId());
    }
}
