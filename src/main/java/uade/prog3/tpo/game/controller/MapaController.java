package uade.prog3.tpo.game.controller;

import org.springframework.web.bind.annotation.*;
import uade.prog3.tpo.game.dto.MapaDto;
import uade.prog3.tpo.game.service.MapaService;

@RestController
@RequestMapping("/api/juego")
public class MapaController {
    private final MapaService service;
    public MapaController(MapaService service) { this.service = service; }
    @GetMapping("/mapa")
    public MapaDto mapa() { return service.cargar(); }
}
