package com.codix.cicdai.cicd_ai_app.model;

public enum PipelineStep {
    COMPILATION("Compilation", "Compilation du projet Maven"),
    TESTS("Tests", "Exécution des tests unitaires"),
    SONARQUBE("SonarQube", "Analyse de la qualité du code"),
    DOCKER_BUILD("Docker Build", "Création de l'image Docker"),
    DEPLOY("Déploiement", "Déploiement de l'application sur le serveur de test"),
    MONITORING("Surveillance", "Vérification de la santé de l'application");

    private final String displayName;
    private final String description;

    PipelineStep(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }
}
