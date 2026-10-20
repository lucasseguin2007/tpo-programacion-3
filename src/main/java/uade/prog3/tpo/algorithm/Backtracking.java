package uade.prog3.tpo.algorithm;

import org.springframework.stereotype.Component;
import uade.prog3.tpo.service.Grafo;

import java.util.ArrayList;
import java.util.List;

/**
 * UNIDAD: Backtracking (clases 9 y 10)      PUNTAJE: 1 punto
 *
 * El problema propuesto es enumerar caminos simples bajo restricciones.
 * Cada grupo puede reemplazarlo por otro de su dominio, siempre que:
 *   - construya la solucion de forma incremental
 *   - tenga un criterio de viabilidad que pode ramas
 *   - deshaga la ultima decision al retroceder
 */
@Component
public class Backtracking {
    private int nodosExplorados;

    /** Un camino simple encontrado, con su costo acumulado. */
    public record Ruta(List<String> vertices, double costoTotal) { }
    public record ResultadoRutas(
            List<Ruta> rutas,
            int exploradosConPoda,
            int exploradosSinPoda,
            int estadosEvitados
    ) {}

    /**
     * Enumerar TODOS los caminos simples de origen a destino que no superen
     * un costo maximo ni una cantidad maxima de saltos.
     *
     * Requisitos:
     *   - camino SIMPLE: no repetir vertices. Marcar y desmarcar el visitado
     *     es literalmente el retroceso del backtracking
     *   - podar en cuanto el costo parcial supere el maximo, sin esperar a
     *     completar el camino
     *   - devolver todas las rutas validas, no la primera
     *
     * Complejidad esperada: exponencial en el peor caso. Hay que poder
     * justificar por que, y explicar cuanto ayuda la poda en la practica.
     *
     * Sugerencia de verificacion: contar los nodos visitados con y sin poda
     * sobre el mismo grafo. Esa comparacion es material de coloquio.
     */
    public ResultadoRutas rutasSimples(Grafo grafo, String origenId,
                                  String destinoId, double costoMaximo,
                                  int saltosMaximos) {

        int origen = grafo.indiceDe(origenId);
        int destino = grafo.indiceDe(destinoId);

        // PRIMERA EJECUCIÓN: CON PODA
        List<Ruta> rutas = new ArrayList<>();
        boolean[] visitados = new boolean[grafo.cantidadVertices()];
        List<String> caminoActual = new ArrayList<>();

        nodosExplorados = 0;

        backtracking(grafo, origen, destino, costoMaximo,
                saltosMaximos, 0, 0, visitados, caminoActual, rutas, true);

        int exploradosConPoda = nodosExplorados;

        // SEGUNDA EJECUCIÓN: SIN PODA
        nodosExplorados = 0;

        List<Ruta> rutasSinPoda = new ArrayList<>();

        backtracking(grafo, origen, destino, costoMaximo,
                saltosMaximos, 0, 0,
                new boolean[grafo.cantidadVertices()],
                new ArrayList<>(), rutasSinPoda, false);

        int exploradosSinPoda = nodosExplorados;

        System.out.println("Explorados con poda: " + exploradosConPoda);
        System.out.println("Explorados sin poda: " + exploradosSinPoda);
        System.out.println("Estados evitados: " +
                (exploradosSinPoda - exploradosConPoda));

        return new ResultadoRutas(
                rutas,
                exploradosConPoda,
                exploradosSinPoda,
                exploradosSinPoda - exploradosConPoda
        );
    }

    private void backtracking(Grafo grafo, int actual, int destino,
                              double costoMaximo, int saltosMaximos,
                              double costoActual, int saltos,
                              boolean[] visitados,
                              List<String> caminoActual,
                              List<Ruta> rutas, boolean usarPoda) {
        nodosExplorados++;
        // PODA
        if (usarPoda && (costoActual > costoMaximo || saltos > saltosMaximos)) {
            return;
        }

        visitados[actual] = true;
        caminoActual.add(grafo.idDe(actual));

        // CASO BASE
        if (actual == destino) {
            if (costoActual <= costoMaximo && saltos <= saltosMaximos) {
                rutas.add(new Ruta(new ArrayList<>(caminoActual), costoActual));
            }
        } else {

            // EXPLORAR VECINOS
            for (Grafo.Arista arista : grafo.vecinos(actual)) {

                int siguiente = arista.destino();

                if (!visitados[siguiente]) {
                    backtracking(grafo, siguiente, destino,
                            costoMaximo, saltosMaximos,
                            costoActual + arista.costo(),
                            saltos + 1, visitados, caminoActual, rutas, usarPoda);
                }
            }
        }

        // RETROCESO
        caminoActual.remove(caminoActual.size() - 1);
        visitados[actual] = false;
    }


}
