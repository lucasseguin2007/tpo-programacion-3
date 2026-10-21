package uade.prog3.tpo.game.service;

import org.springframework.stereotype.Service;
import uade.prog3.tpo.game.dto.MapaDto;
import uade.prog3.tpo.repository.NodoRepository;
import java.util.*;

@Service
public class MapaService {
    private final NodoRepository repository;
    public MapaService(NodoRepository repository) { this.repository = repository; }

    public MapaDto cargar() {
        var nodos = repository.findAll();
        var ubicaciones = nodos.stream().map(n -> new MapaDto.Ubicacion(
                n.getId(), n.getNombre(), n.getTipo())).sorted(Comparator.comparing(MapaDto.Ubicacion::id)).toList();
        // La navegación es no dirigida, igual que el endpoint Dijkstra.
        // Para conexiones paralelas se conserva el costo mínimo.
        Map<List<String>, MapaDto.Ruta> rutas = new LinkedHashMap<>();
        for (var nodo : nodos) {
            for (var conexion : nodo.getConexiones()) {
                String a = nodo.getId(), b = conexion.getDestino().getId();
                if (a.compareTo(b) > 0) { String temp = a; a = b; b = temp; }
                double costo = conexion.getCosto();
                if (!Double.isFinite(costo) || costo < 0) {
                    throw new IllegalArgumentException("El mapa requiere costos finitos y no negativos");
                }
                var ruta = new MapaDto.Ruta(a, b, costo);
                rutas.merge(List.of(a, b), ruta, (x, y) -> x.costo() <= y.costo() ? x : y);
            }
        }
        return new MapaDto(ubicaciones, List.copyOf(rutas.values()));
    }
}
