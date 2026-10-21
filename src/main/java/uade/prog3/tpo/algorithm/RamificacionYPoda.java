package uade.prog3.tpo.algorithm;

import org.springframework.stereotype.Component;
import uade.prog3.tpo.model.Item;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.LinkedHashMap;

/**
 * UNIDAD: Branch and Bound (clase 12)       PUNTAJE: 1 punto
 *
 * Es backtracking mas una cota. La diferencia con la clase Backtracking
 * es el criterio de poda: alli se podaba por VIABILIDAD, aca se poda por
 * OPTIMALIDAD.
 */
@Component
public class RamificacionYPoda {

    /** Asignacion de items a contenedores o responsables. */
    public record Asignacion(
            Map<String, List<Item>> porContenedor,
            double cargaMaxima,
            int nodosExplorados,
            int nodosPodados
    ) { }

    /**
     * Repartir items entre k contenedores identicos minimizando la carga del
     * contenedor mas cargado (problema de makespan).
     *
     * Requisitos:
     *   - ramificar: cada item puede ir a cualquiera de los k contenedores
     *   - acotar: definir una cota INFERIOR del makespan alcanzable desde el
     *     nodo actual. Una cota valida y simple es
     *         max( carga maxima actual , suma de todos los pesos / k )
     *   - podar: si la cota es mayor o igual al mejor makespan ya encontrado,
     *     abandonar la rama
     *   - la cota tiene que ser OPTIMISTA. Si subestima el potencial de una
     *     rama se pierden soluciones validas y el resultado deja de ser optimo
     *
     * Complejidad esperada: exponencial, k^n en el peor caso, mucho menor con
     * buena poda.
     *
     * Sugerencia: reportar en la respuesta cuantos nodos se exploraron y
     * cuantos se podaron. Es la mejor evidencia de que la poda funciona.
     */
    public Asignacion repartir(List<Item> items, int cantidadContenedores) {

        if (cantidadContenedores <= 0) {
            throw new IllegalArgumentException(
                    "La cantidad de contenedores debe ser positiva");
        }

        if (items == null) {
            throw new IllegalArgumentException(
                    "La lista de items no puede ser nula");
        }

        double pesoTotal = 0;

        for (Item item : items) {
            if (item == null || !Double.isFinite(item.getPeso())
                    || item.getPeso() < 0) {
                throw new IllegalArgumentException(
                        "Los pesos deben ser finitos y no negativos");
            }

            pesoTotal += item.getPeso();
        }

        double[] cargas = new double[cantidadContenedores];

        List<List<Item>> distribucionActual = new ArrayList<>();
        List<List<Item>> mejorDistribucion = new ArrayList<>();

        for (int i = 0; i < cantidadContenedores; i++) {
            distribucionActual.add(new ArrayList<>());
            mejorDistribucion.add(new ArrayList<>());
        }

        double[] mejorCarga = {Double.POSITIVE_INFINITY};
        int[] nodosPodados = {0};
        int[] nodosExplorados = {0};

        buscar(items, 0, cargas, distribucionActual,
                mejorDistribucion, mejorCarga,
                pesoTotal, nodosPodados, nodosExplorados);

        Map<String, List<Item>> resultado = new LinkedHashMap<>();

        for (int i = 0; i < cantidadContenedores; i++) {
            resultado.put("Barco " + (i + 1),
                    mejorDistribucion.get(i));
        }

        System.out.println("Nodos podados: " + nodosPodados[0]);

        return new Asignacion(resultado, mejorCarga[0],nodosExplorados[0], nodosPodados[0] );
    }
    private void buscar(
            List<Item> items,
            int indice,
            double[] cargas,
            List<List<Item>> actual,
            List<List<Item>> mejor,
            double[] mejorCarga,
            double pesoTotal,
            int[] nodosPodados,
            int[] nodosExplorados) {

        nodosExplorados[0]++;
        double cargaMaximaActual = 0;


        for (double carga : cargas) {
            cargaMaximaActual = Math.max(cargaMaximaActual, carga);
        }

        double cota = Math.max(
                cargaMaximaActual,
                pesoTotal / cargas.length
        );

        // PODA POR COTA
        if (cota >= mejorCarga[0]) {
            nodosPodados[0]++;
            return;
        }

        // CASO BASE: todos los items asignados
        if (indice == items.size()) {
            mejorCarga[0] = cargaMaximaActual;

            for (int i = 0; i < actual.size(); i++) {
                mejor.get(i).clear();
                mejor.get(i).addAll(actual.get(i));
            }

            return;
        }

        // RAMIFICACION: probar cada barco
        Item item = items.get(indice);

        for (int i = 0; i < cargas.length; i++) {

            cargas[i] += item.getPeso();
            actual.get(i).add(item);

            buscar(items, indice + 1, cargas,
                    actual, mejor, mejorCarga,
                    pesoTotal, nodosPodados, nodosExplorados);

            // RETROCESO
            cargas[i] -= item.getPeso();
            actual.get(i).remove(actual.get(i).size() - 1);
        }
    }
}
