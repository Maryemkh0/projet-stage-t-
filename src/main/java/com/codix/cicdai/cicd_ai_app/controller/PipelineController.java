package com.codix.cicdai.cicd_ai_app.controller;

import com.codix.cicdai.cicd_ai_app.model.PipelineStatus;
import com.codix.cicdai.cicd_ai_app.model.PipelineStep;
import com.codix.cicdai.cicd_ai_app.model.StepExecution;
import com.codix.cicdai.cicd_ai_app.service.PipelineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/pipeline")
@CrossOrigin(origins = "*") // Autoriser les appels cross-origin si nécessaire
public class PipelineController {

    private final PipelineService pipelineService;

    @Value("${gemini.api.key:}")
    private String geminiApiKeyFromProps;

    @Autowired
    public PipelineController(PipelineService pipelineService) {
        this.pipelineService = pipelineService;
    }

    @PostMapping("/run")
    public Map<String, Object> runPipeline() {
        pipelineService.runPipeline();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Pipeline démarré avec succès.");
        response.put("status", pipelineService.getPipelineStatus());
        return response;
    }

    @PostMapping("/reset")
    public Map<String, Object> resetPipeline() {
        pipelineService.resetPipeline();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Pipeline réinitialisé.");
        response.put("status", pipelineService.getPipelineStatus());
        return response;
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        Map<String, Object> response = new HashMap<>();
        response.put("pipelineStatus", pipelineService.getPipelineStatus());
        response.put("currentStep", pipelineService.getCurrentRunningStepName());
        response.put("steps", pipelineService.getStepsStatus());
        return response;
    }

    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        Map<String, Object> response = new HashMap<>();
        response.put("mockSonarQube", pipelineService.isMockSonarQube());
        response.put("forceCompilationError", pipelineService.isForceCompilationError());
        response.put("forceTestError", pipelineService.isForceTestError());
        response.put("forceSonarQubeError", pipelineService.isForceSonarQubeError());
        response.put("forceDockerBuildError", pipelineService.isForceDockerBuildError());
        response.put("forceDeployError", pipelineService.isForceDeployError());
        response.put("forceMonitoringError", pipelineService.isForceMonitoringError());
        
        // Indiquer si une clé API est déjà configurée (sans exposer la valeur complète pour la sécurité)
        String activeKey = System.getenv("GEMINI_API_KEY");
        if (activeKey == null || activeKey.trim().isEmpty()) {
            activeKey = geminiApiKeyFromProps;
        }
        boolean isApiKeyConfigured = activeKey != null && !activeKey.trim().isEmpty();
        response.put("apiKeyConfigured", isApiKeyConfigured);
        
        return response;
    }

    @PostMapping("/config")
    public Map<String, Object> updateConfig(@RequestBody Map<String, Object> config) {
        if (config.containsKey("mockSonarQube")) {
            pipelineService.setMockSonarQube((Boolean) config.get("mockSonarQube"));
        }
        if (config.containsKey("forceCompilationError")) {
            pipelineService.setForceCompilationError((Boolean) config.get("forceCompilationError"));
        }
        if (config.containsKey("forceTestError")) {
            pipelineService.setForceTestError((Boolean) config.get("forceTestError"));
        }
        if (config.containsKey("forceSonarQubeError")) {
            pipelineService.setForceSonarQubeError((Boolean) config.get("forceSonarQubeError"));
        }
        if (config.containsKey("forceDockerBuildError")) {
            pipelineService.setForceDockerBuildError((Boolean) config.get("forceDockerBuildError"));
        }
        if (config.containsKey("forceDeployError")) {
            pipelineService.setForceDeployError((Boolean) config.get("forceDeployError"));
        }
        if (config.containsKey("forceMonitoringError")) {
            pipelineService.setForceMonitoringError((Boolean) config.get("forceMonitoringError"));
        }

        if (config.containsKey("geminiApiKey")) {
            String apiKey = (String) config.get("geminiApiKey");
            if (apiKey != null && !apiKey.trim().isEmpty()) {
                // On met à jour la propriété système pour cette session
                System.setProperty("gemini.api.key", apiKey);
                
                // Optionnel : l'écrire dans le fichier .env local du projet pour persistance
                writeApiKeyToEnvFile(apiKey);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Configuration mise à jour avec succès.");
        return response;
    }

    private void writeApiKeyToEnvFile(String apiKey) {
        try {
            Path envPath = Paths.get("C:\\Users\\khemi\\projets\\cicd-ai-app", ".env");
            String line = "GEMINI_API_KEY=" + apiKey + "\n";
            Files.writeString(envPath, line);
        } catch (IOException e) {
            e.printStackTrace(); // Échec de persistance, l'écriture en mémoire System.setProperty suffit pour la session en cours
        }
    }
}
