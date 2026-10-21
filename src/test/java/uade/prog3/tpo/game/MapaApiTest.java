package uade.prog3.tpo.game;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import uade.prog3.tpo.algorithm.*;
import uade.prog3.tpo.config.ManejadorDeErrores;
import uade.prog3.tpo.controller.GrafoController;
import uade.prog3.tpo.game.controller.MapaController;
import uade.prog3.tpo.game.service.MapaService;
import uade.prog3.tpo.model.Nodo;
import uade.prog3.tpo.model.Item;
import uade.prog3.tpo.repository.*;
import uade.prog3.tpo.seed.CargaInicial;
import uade.prog3.tpo.service.GrafoService;
import java.lang.reflect.Proxy;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class MapaApiTest {
    // Reutiliza CargaInicial: las pruebas no mantienen otra copia del archipiélago.
    private NodoRepository seed(List<Nodo> nodos) throws Exception {
        NodoRepository repository = repository(NodoRepository.class, nodos);
        new CargaInicial(repository, repository(ItemRepository.class, new ArrayList<Item>())).run();
        return repository;
    }
    @SuppressWarnings("unchecked")
    private <T, E> T repository(Class<T> type, List<E> data) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, (proxy, method, args) -> {
            return switch (method.getName()) {
                case "count" -> (long) data.size();
                case "findAll" -> data;
                case "saveAll" -> { ((Iterable<E>) args[0]).forEach(data::add); yield data; }
                case "toString" -> "RepositoryFixture";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        });
    }
    @Test void mapaYDijkstraCompartenElMismoMundo() throws Exception {
        var repository = seed(new ArrayList<>());
        var mapa = new MapaService(repository);
        var caminos = new CaminosMinimos();
        var grafo = new GrafoService(repository);
        var mvc = MockMvcBuilders.standaloneSetup(new MapaController(mapa),
                new GrafoController(grafo, new Recorridos(), caminos, new ArbolRecubrimiento(), new Backtracking()))
                .setControllerAdvice(new ManejadorDeErrores()).build();
        mvc.perform(get("/api/juego/mapa")).andExpect(status().isOk())
                .andExpect(jsonPath("$.ubicaciones.length()").value(8))
                .andExpect(jsonPath("$.rutas.length()").value(14));
        mvc.perform(get("/api/grafo/dijkstra").param("origen", "PR").param("destino", "IP"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.vertices[1]").value("FN"))
                .andExpect(jsonPath("$.costoTotal").value(17));
        mvc.perform(get("/api/grafo/dijkstra").param("origen", "XX").param("destino", "IP"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.estado").value("ERROR"));
        // Comprueba que cualquier tramo devuelto por Dijkstra tiene el mismo costo en el mapa.
        for (var a : mapa.cargar().ubicaciones()) for (var b : mapa.cargar().ubicaciones()) {
            var camino = caminos.dijkstra(grafo.cargar(false), a.id(), b.id());
            double total = 0;
            for (int i = 1; i < camino.vertices().size(); i++) {
                String from = camino.vertices().get(i - 1), to = camino.vertices().get(i);
                total += mapa.cargar().rutas().stream().filter(r ->
                        (r.origen().equals(from) && r.destino().equals(to)) ||
                        (r.origen().equals(to) && r.destino().equals(from))).findFirst().orElseThrow().costo();
            }
            assertEquals(camino.costoTotal(), total);
        }
    }
    @Test void deduplicaConexionesYConservaElMenorCosto() {
        var a = new Nodo("A", "A", "ISLA", 0); var b = new Nodo("B", "B", "ISLA", 0);
        a.conectar(b, 8); b.conectar(a, 4);
        var result = new MapaService(repository(NodoRepository.class, new ArrayList<>(List.of(a, b)))).cargar();
        assertEquals(1, result.rutas().size()); assertEquals(4, result.rutas().get(0).costo());
    }
    @Test void rechazaCostosInvalidos() {
        var a = new Nodo("A", "A", "ISLA", 0); a.conectar(a, Double.NaN);
        assertThrows(IllegalArgumentException.class, () -> new MapaService(repository(NodoRepository.class, new ArrayList<>(List.of(a)))).cargar());
    }
}
