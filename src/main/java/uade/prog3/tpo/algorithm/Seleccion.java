package uade.prog3.tpo.algorithm;

import org.springframework.stereotype.Component;
import uade.prog3.tpo.model.Item;

import java.util.List;
import java.util.ArrayList;
import java.util.Comparator;

/**
 * UNIDAD: Greedy (clase 3) y Programacion Dinamica (clase 6)
 * PUNTAJE: 1 punto greedy + 1 punto programacion dinamica
 *
 * Los dos metodos resuelven EL MISMO problema con tecnicas distintas.
 * Esa comparacion es justamente lo que se evalua: no alcanza con que
 * funcionen, hay que poder mostrar un caso donde greedy NO da el optimo.
 */
@Component
public class Seleccion {

    /** Resultado de una seleccion de items bajo restriccion de capacidad. */
    public record Resultado(List<Item> elegidos, double valorTotal, double pesoTotal, String tecnica) { }

    private final Ordenamiento ordenamiento;

    public Seleccion(Ordenamiento ordenamiento) {
        this.ordenamiento = ordenamiento;
    }
    /**
     * GREEDY: seleccionar items maximizando el valor total sin superar la capacidad,
     * ordenando por ratio valor/peso descendente y tomando mientras entren.
     *
     * Requisitos:
     *   - declarar EXPLICITAMENTE cual es la funcion objetivo
     *   - usar el ratio valor/peso como criterio, no el valor a secas
     *   - documentar la complejidad, que esta dominada por el ordenamiento
     *
     * Complejidad esperada: O(n log n).
     *
     * OJO: sobre items indivisibles (mochila 0/1) este algoritmo NO garantiza
     * el optimo. Eso no es un error a corregir: es el punto de la comparacion.
     * En el coloquio hay que traer un juego de datos donde greedy pierda.
     */
    public Resultado greedy(List<Item> items, double capacidad) {
        if (capacidad < 0) {
            throw new IllegalArgumentException(
                    "La capacidad no puede ser negativa");
        }

        List<Item> ordenados = ordenamiento.mergeSort(
                items,
                Comparator.comparingDouble(
                        Item::ratioValorPeso).reversed()
        );

        List<Item> elegidos = new ArrayList<>();
        double pesoTotal = 0;
        double valorTotal = 0;

        for (Item item : ordenados) {

            if (pesoTotal + item.getPeso() <= capacidad) {
                elegidos.add(item);
                pesoTotal += item.getPeso();
                valorTotal += item.getValor();
            }
        }

        return new Resultado(
                elegidos, valorTotal, pesoTotal, "Greedy");
    }

    /**
     * PROGRAMACION DINAMICA: mochila 0/1 con tabla dp.
     *
     * Requisitos:
     *   - construir la tabla dp[i][j] de forma iterativa (bottom-up)
     *   - RECUPERAR EL CAMINO: devolver que items componen la solucion optima,
     *     no solo el valor maximo. Eso se hace recorriendo la tabla hacia atras
     *   - los pesos deben ser enteros o discretizarse para indexar la tabla
     *
     * Complejidad esperada: O(n * W) en tiempo y en espacio.
     *
     * Para el coloquio: explicar por que O(n*W) es pseudopolinomica.
     */
    public Resultado programacionDinamica(List<Item> items, int capacidad) {
        if (capacidad < 0) {
            throw new IllegalArgumentException(
                    "La capacidad no puede ser negativa");
        }

        int n = items.size();

        double[][] dp = new double[n + 1][capacidad + 1];

        // Construccion de la tabla
        for (int i = 1; i <= n; i++) {

            Item item = items.get(i - 1);
            double peso = item.getPeso();

            if (peso < 0 || peso != Math.floor(peso)) {
                throw new IllegalArgumentException(
                        "La mochila 0/1 requiere pesos enteros no negativos");
            }

            if (item.getValor() < 0) {
                throw new IllegalArgumentException(
                        "El valor de los items no puede ser negativo");
            }

            for (int j = 0; j <= capacidad; j++) {

                dp[i][j] = dp[i - 1][j];

                if (peso <= j) {
                    int restante = j - (int) peso;

                    double conItem =
                            dp[i - 1][restante] + item.getValor();

                    dp[i][j] = Math.max(
                            dp[i][j], conItem);
                }
            }
        }

        // Recuperacion de los items elegidos
        List<Item> elegidos = new ArrayList<>();
        int capacidadRestante = capacidad;
        double pesoTotal = 0;

        for (int i = n; i > 0; i--) {

            if (dp[i][capacidadRestante] >
                    dp[i - 1][capacidadRestante]) {

                Item item = items.get(i - 1);
                elegidos.add(item);

                pesoTotal += item.getPeso();
                capacidadRestante -= (int) item.getPeso();
            }
        }

        return new Resultado(
                elegidos,
                dp[n][capacidad],
                pesoTotal,
                "Programacion Dinamica"
        );
    }
}
