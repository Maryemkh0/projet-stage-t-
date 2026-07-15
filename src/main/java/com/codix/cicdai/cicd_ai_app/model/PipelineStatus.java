package com.codix.cicdai.cicd_ai_app.model;

public enum PipelineStatus {
    IDLE,       // En attente
    RUNNING,    // En cours d'exécution
    SUCCESS,    // Exécuté avec succès
    FAILED      // Échec de l'étape
}
