package uade.prog3.tpo.game.dto;

import java.util.List;

public record MapaDto(List<Ubicacion> ubicaciones, List<Ruta> rutas) {
    public record Ubicacion(String id, String nombre, String tipo) {}
    public record Ruta(String origen, String destino, double costo) {}
}
