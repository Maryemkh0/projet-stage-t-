package com.codix.cicdai.cicd_ai_app.service;

import com.codix.cicdai.cicd_ai_app.model.Client;
import com.codix.cicdai.cicd_ai_app.repository.ClientRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ClientService {
    private final ClientRepository repo;

    public ClientService(ClientRepository repo) { 
        this.repo = repo; 
    }

    public List<Client> findAll() { 
        return repo.findAll(); 
    }

    public Client create(Client c) { 
        return repo.save(c); 
    }

    public void delete(Long id) { 
        repo.deleteById(id); 
    }

    public Client update(Long id, Client data) {
        Client existing = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Client not found"));
        existing.setName(data.getName());
        existing.setEmail(data.getEmail());
        existing.setDescription(data.getDescription());
        existing.setUpdatedAt(java.time.LocalDateTime.now());
        return repo.save(existing);
    }

    // Placeholder - in a real system this would trigger the existing CI pipeline for the client
    public String triggerPipeline(Long clientId) {
        return "Pipeline triggered for client " + clientId;
    }
}
