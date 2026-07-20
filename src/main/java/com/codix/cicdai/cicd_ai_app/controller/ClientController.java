package com.codix.cicdai.cicd_ai_app.controller;

import com.codix.cicdai.cicd_ai_app.model.Client;
import com.codix.cicdai.cicd_ai_app.service.ClientService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin // Allowed for dev purposes since the UI is served from the same app or local dev server
public class ClientController {
    private final ClientService service;

    public ClientController(ClientService service) { 
        this.service = service; 
    }

    @GetMapping
    public List<Client> list() { 
        return service.findAll(); 
    }

    @PostMapping
    public Client create(@RequestBody Client client) { 
        return service.create(client); 
    }

    @PutMapping("/{id}")
    public Client update(@PathVariable Long id, @RequestBody Client client) { 
        return service.update(id, client); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { 
        service.delete(id); 
    }

    @PostMapping("/{id}/run-test")
    public String runTest(@PathVariable Long id) { 
        return service.triggerPipeline(id); 
    }
}
