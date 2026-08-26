package uade.prog3.tpo.algorithm;

import org.springframework.stereotype.Component;
import uade.prog3.tpo.model.Item;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * UNIDAD: Divide y Conquista (clase 2)     PUNTAJE: 1 punto
 *
 * IMPORTANTE: no vale llamar a Collections.sort ni a Arrays.sort.
 * El punto se asigna por implementar el algoritmo, no por usarlo.
 */
@Component
public class Ordenamiento {

    /**
     * QuickSort sobre una lista de items.
     *
     * Requisitos:
     *   - implementar la particion (partition) a mano
     *   - documentar que estrategia de pivote usaron y por que
     *   - NO modificar la lista de entrada: devolver una lista nueva
     *
     * Complejidad esperada: O(n log n) promedio, O(n^2) peor caso.
     * Hay que poder explicar cuando ocurre el peor caso.
     */
    public List<Item> quickSort(List<Item> items, Comparator<Item> criterio) {
        List<Item> copia = new ArrayList<>(items);

        quickSortRec(copia, 0, copia.size() -1, criterio );
        return copia;
    }
    private void quickSortRec(List<Item> items, int izquierda, int derecha, Comparator<Item> criterio) {
        if (izquierda < derecha) {
            int posicionPivote = partition(items, izquierda, derecha, criterio);
            quickSortRec(items,izquierda,posicionPivote-1,criterio);
            quickSortRec(items,posicionPivote+1,derecha,criterio);
        }
    }
    //metodo sustraccion
    // a= 2
    // b = 1
    // k = 1
    // O(n log n) caso promedio
    // O(n^2) peor caso

    private int partition(List<Item> items, int izq, int der, Comparator<Item> criterio) {
        Item pivote = items.get(der);

        int i = izq -1;
        for (int j = izq; j<der;j++) {
            if (criterio.compare(items.get(j), pivote) <= 0) {
                i++;

                Item aux = items.get(i);
                items.set(i,items.get(j));
                items.set(j,aux);
            }
        }

        Item aux = items.get(i+1);
        items.set(i+1,items.get(der));
        items.set(der, aux);

        return i +1;
    }

    /**
     * MergeSort sobre una lista de items.
     *
     * Requisitos:
     *   - implementar la mezcla (merge) a mano
     *   - respetar la estabilidad del algoritmo
     *
     * Complejidad esperada: O(n log n) siempre.
     *
     * Para el coloquio: escribir la recurrencia T(n) = 2T(n/2) + O(n)
     * y resolverla con la regla practica (a, b, k).
     */
    public List<Item> mergeSort(List<Item> items, Comparator<Item> criterio) {
        if (items.size() <=1) {
            return new ArrayList<>(items);
        }

        int medio = items.size() / 2;

        List<Item> izquierda = mergeSort(new ArrayList<>(items.subList(0,medio)),criterio);
        List<Item> derecha = mergeSort(new ArrayList<>(items.subList(medio,items.size())),criterio);

        return merge(izquierda,derecha,criterio);
    }

    private List<Item> merge(List<Item> izquierda, List<Item> derecha, Comparator<Item> criterio) {
        List<Item> resultado = new ArrayList<>();
        int i = 0;
        int j = 0;

        while (i< izquierda.size() && j<derecha.size()) {
            if (criterio.compare(izquierda.get(i), derecha.get(j)) <= 0) {
                resultado.add(izquierda.get(i));
                i++;
            } else {
                resultado.add(derecha.get(j));
                j++;
            }
        }
        while (i < izquierda.size()) {
            resultado.add(izquierda.get(i));
            i++;
        }
        while(j< derecha.size()) {
            resultado.add(derecha.get(j));
            j++;
        }
        return resultado;
    }
}
