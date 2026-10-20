package uade.prog3.tpo.seed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import uade.prog3.tpo.model.Item;
import uade.prog3.tpo.model.Nodo;
import uade.prog3.tpo.repository.ItemRepository;
import uade.prog3.tpo.repository.NodoRepository;

import java.util.List;

/**
 * Carga un grafo chico de ejemplo para que la aplicacion sea probable
 * apenas se levanta, sin tener que cargar datos a mano.
 *
 * El dominio es DELIBERADAMENTE generico (nodos A..H). Cada grupo lo
 * reemplaza por el suyo y pone app.seed.enabled=false, o bien reescribe
 * esta clase con sus propios datos.
 *
 * El grafo elegido tiene, a proposito:
 *   - 8 vertices y 12 aristas: chico para verificar a mano, grande para
 *     que los algoritmos no den resultados triviales
 *   - todos los costos positivos, para que Dijkstra sea aplicable
 *   - es conexo, para que Prim y Kruskal tengan solucion
 *   - hay al menos un camino donde el mas corto NO es el directo, para
 *     que se note la relajacion de aristas
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class CargaInicial implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CargaInicial.class);

    private final NodoRepository nodoRepository;
    private final ItemRepository itemRepository;

    public CargaInicial(NodoRepository nodoRepository, ItemRepository itemRepository) {
        this.nodoRepository = nodoRepository;
        this.itemRepository = itemRepository;
    }

    @Override
    public void run(String... args) {
        if (nodoRepository.count() > 0) {
            log.info("La base ya tiene datos. No se ejecuta la carga inicial.");
            return;
        }

        Nodo pr = new Nodo("PR", "Puerto Real", "PUERTO", 0);
        Nodo it = new Nodo("IT", "Isla Tortuga", "ISLA", 0);
        Nodo bn = new Nodo("BN", "Bahía Negra", "BAHIA", 0);
        Nodo ic = new Nodo("IC", "Isla Calavera", "ISLA", 0);
        Nodo pd = new Nodo("PD", "Puerto Dorado", "PUERTO", 0);
        Nodo ik = new Nodo("IK", "Isla del Kraken", "ISLA", 0);
        Nodo fn = new Nodo("FN", "Fortaleza Naval", "FORTALEZA", 0);
        Nodo ip = new Nodo("IP", "Isla Perdida", "ISLA", 0);

        // El camino directo A->C cuesta 9, pero A->B->C cuesta 4+3=7.
        // Sirve para verificar que la relajacion de aristas este bien hecha.
        pr.conectar(it, 4);
        pr.conectar(bn, 7);
        pr.conectar(fn, 9);
        it.conectar(bn, 3);
        it.conectar(ic, 6);
        it.conectar(pd, 8);
        bn.conectar(ic, 5);
        bn.conectar(fn, 6);
        ic.conectar(pd, 4);
        ic.conectar(ik, 7);
        pd.conectar(ik, 3);
        pd.conectar(ip, 9);
        ik.conectar(ip, 5);
        fn.conectar(ip, 8);

        nodoRepository.saveAll(List.of(pr, it, bn, ic, pd, ik, fn, ip));

        // Items para los problemas de seleccion bajo restriccion.
        //
        // Calibrado a proposito: con capacidad 10, greedy por ratio valor/peso
        // elige {I4, I2} y obtiene 90, mientras que el optimo real es {I4, I5}
        // con 105. Es el contraejemplo que se necesita para comparar greedy
        // contra programacion dinamica.
        itemRepository.saveAll(List.of(
                new Item("I1", "Item 1", 5, 10, "PR"),
                new Item("I2", "Item 2", 4, 40, "IT"),
                new Item("I3", "Item 3", 6, 30, "BN"),
                new Item("I4", "Item 4", 3, 50, "IC"),
                new Item("I5", "Item 5", 7, 55, "PD")
        ));

        log.info("Carga inicial completada: 8 ubicaciones, 12 rutas, 5 items.");
        log.info("Para desactivarla: app.seed.enabled=false");
    }
}
