package com.codix.cicdai.cicd_ai_app.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class AiAnalysisService {

    @Value("${gemini.api.key:}")
    private String geminiApiKeyFromProps;

    @Value("${gemini.model:gemini-pro}")
    private String geminiModel;

    private final RestTemplate restTemplate = new RestTemplate();

    public String analyzeError(String stepName, String logs) {
        String apiKey = getApiKey();
        
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return generateMockAnalysis(stepName, logs);
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1/models/" + geminiModel + ":generateContent?key=" + apiKey;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
        Thread.sleep(2000); // 2 s pause to avoid quota bursts

            // Construction du prompt de diagnostic en français
            String prompt = String.format(
                "Tu es un ingénieur DevOps expert et un assistant IA intégré à une plateforme CI/CD.\n" +
                "L'étape suivante du pipeline a échoué : **%s**.\n\n" +
                "Voici les logs de l'erreur :\n" +
                "```\n%s\n```\n\n" +
                "Rédige une analyse claire, professionnelle et structurée en français sous format Markdown :\n" +
                "1. **Type d'erreur** : Nommer brièvement l'erreur (ex: Erreur de compilation, échec de test unitaire, problème Docker, etc.).\n" +
                "2. **Explication** : Explique de manière simple mais précise pourquoi cette erreur s'est produite.\n" +
                "3. **Solutions Recommandées** : Propose 2 ou 3 actions concrètes étape par étape pour corriger le problème.\n\n" +
                "Garde ton explication concise, lisible et directement exploitable par un développeur.",
                stepName, truncateLogs(logs)
            );

            // Structure de requête Gemini API
            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> part = new HashMap<>();
            part.put("text", prompt);
            Map<String, Object> content = new HashMap<>();
            content.put("parts", List.of(part));
            requestBody.put("contents", List.of(content));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List candidates = (List) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map candidate = (Map) candidates.get(0);
                    Map responseContent = (Map) candidate.get("content");
                    if (responseContent != null) {
                        List parts = (List) responseContent.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map partObj = (Map) parts.get(0);
                            return (String) partObj.get("text");
                        }
                    }
                }
            }
            return "### ⚠️ Erreur lors de l'appel à l'API Gemini\n\nImpossible de récupérer l'analyse de l'IA. Veuillez vérifier vos journaux d'application.";
        } catch (Exception e) {
            e.printStackTrace();
            return "### ⚠️ Erreur lors de l'appel à l'API Gemini\n\nUne exception s'est produite : " + e.getMessage() + 
                   "\n\n*Note : L'analyse locale de secours s'est déclenchée en raison de l'erreur réseau.*\n\n" + 
                   generateMockAnalysis(stepName, logs);
        }
    }

    private String getApiKey() {
        // 1. En priorité, dans les variables d'environnement système
        String key = System.getenv("GEMINI_API_KEY");
        if (key != null && !key.trim().isEmpty()) {
            return key;
        }
        
        // 2. Ensuite, dans les propriétés système Java (défini par le contrôleur)
        key = System.getProperty("gemini.api.key");
        if (key != null && !key.trim().isEmpty()) {
            return key;
        }

        // 3. Ensuite, en lisant directement le fichier .env si présent
        try {
            java.nio.file.Path envPath = java.nio.file.Paths.get("C:\\Users\\khemi\\projets\\cicd-ai-app", ".env");
            if (java.nio.file.Files.exists(envPath)) {
                for (String line : java.nio.file.Files.readAllLines(envPath)) {
                    if (line.startsWith("GEMINI_API_KEY=")) {
                        String val = line.substring("GEMINI_API_KEY=".length()).trim();
                        if (!val.isEmpty()) {
                            return val;
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Ignoré
        }

        // 4. Sinon, dans les propriétés configurées au démarrage (application.properties)
        return geminiApiKeyFromProps;
    }

    private String truncateLogs(String logs) {
        if (logs == null) return "";
        if (logs.length() > 4000) {
            // Prendre les 2000 premiers et les 2000 derniers caractères pour cibler le début et l'erreur de fin
            return logs.substring(0, 2000) + "\n\n[... LOGS TRONQUÉS PAR L'IA POUR DES RAISONS DE TAILLE ...]\n\n" + logs.substring(logs.length() - 2000);
        }
        return logs;
    }

    /**
     * Analyse statique de secours si l'API n'est pas configurée ou injoignable.
     * Fournit une explication très professionnelle par regex pour faire fonctionner la démo sans clé.
     */
    private String generateMockAnalysis(String stepName, String logs) {
        StringBuilder analysis = new StringBuilder();
        analysis.append("### 🤖 Diagnostic IA Local (Mode Simulation)\n\n");
        analysis.append("> **Note** : Ce diagnostic est généré localement car aucune clé API Gemini n'a été configurée (ou l'API est injoignable).\n\n");

        if (logs == null || logs.isEmpty()) {
            analysis.append("**Type d'erreur** : Erreur inconnue (Logs vides).\n\n");
            analysis.append("**Explication** : L'étape a échoué sans générer de journaux d'exécution exploitables.\n\n");
            analysis.append("**Solutions recommandées** :\n1. Vérifiez que la commande de base peut s'exécuter sur le système.\n2. Augmentez la verbosité du pipeline.");
            return analysis.toString();
        }

        // Analyse par expression régulière de l'erreur
        if (stepName.equalsIgnoreCase("Compilation") || logs.contains("COMPILATION ERROR") || logs.contains("Compilation failure")) {
            analysis.append("#### 🔴 Type d'erreur : Erreur de Compilation Java (Syntaxe)\n\n");
            analysis.append("**Explication** : Le compilateur Java (`javac`) n'a pas pu compiler les fichiers source. ");
            
            if (logs.contains("BadClass.java")) {
                analysis.append("Le fichier `BadClass.java` contient une syntaxe invalide volontairement injectée pour la démonstration du pipeline.\n\n");
                analysis.append("**Solutions recommandées** :\n");
                analysis.append("1. **Supprimer le fichier temporaire** : Désactiver le bouton 'Forcer Erreur Compilation' sur le tableau de bord.\n");
                analysis.append("2. **Corriger la syntaxe** : Ouvrez le fichier concerné et corrigez les erreurs indiquées par le compilateur (ex: points-virgules manquants, parenthèses non fermées).");
            } else {
                analysis.append("Il y a une erreur de syntaxe ou un symbole non résolu dans votre code source.\n\n");
                analysis.append("**Solutions recommandées** :\n");
                analysis.append("1. Ouvrez votre IDE pour localiser rapidement les erreurs soulignées en rouge.\n");
                analysis.append("2. Assurez-vous d'avoir importé toutes les classes nécessaires dans vos fichiers source.");
            }
        } 
        else if (stepName.equalsIgnoreCase("Tests") || logs.contains("There are test failures") || logs.contains("FAILURE!") || logs.contains("junit")) {
            analysis.append("#### 🔴 Type d'erreur : Échec des Tests Unitaires (Assertion Error)\n\n");
            analysis.append("**Explication** : Les tests unitaires Maven se sont exécutés, mais une ou plusieurs assertions ont échoué. ");
            
            if (logs.contains("BadTest.java") || logs.contains("testFailureDemo")) {
                analysis.append("Le test de démonstration `BadTest.testFailureDemo()` a volontairement échoué suite à l'activation du simulateur d'erreur.\n\n");
                analysis.append("**Solutions recommandées** :\n");
                analysis.append("1. **Désactiver la simulation** : Décochez l'option 'Forcer Échec Tests' sur l'interface.\n");
                analysis.append("2. **Vérifier le test** : En situation réelle, examinez la ligne du test où `fail()` ou `assertEquals()` a échoué pour réaligner le code ou le test.");
            } else {
                analysis.append("Une assertion logique de votre application a renvoyé un résultat inattendu.\n\n");
                analysis.append("**Solutions recommandées** :\n");
                analysis.append("1. Lisez la trace de l'erreur dans la console ci-dessous pour identifier la méthode de test en échec.\n");
                analysis.append("2. Lancez le test unitaire localement depuis votre IDE pour le déboguer pas à pas.");
            }
        } 
        else if (stepName.equalsIgnoreCase("SonarQube") || logs.contains("sonar") || logs.contains("Connection refused") || logs.contains("Failed to execute goal org.sonarsource.scanner.maven")) {
            analysis.append("#### 🔴 Type d'erreur : Connexion SonarQube Refusée / Échec du Scanner\n\n");
            analysis.append("**Explication** : Le scanner Maven SonarQube a tenté de se connecter au serveur d'analyse de code, mais la connexion a été refusée ou le serveur est inaccessible.\n\n");
            analysis.append("**Solutions recommandées** :\n");
            analysis.append("1. **Lancer SonarQube localement** : Assurez-vous que le conteneur SonarQube fonctionne en exécutant :\n");
            analysis.append("   ```bash\n   docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community\n   ```\n");
            analysis.append("2. **Vérifier l'URL de SonarQube** : Vérifiez que l'URL configurée (par défaut `http://localhost:9000`) est correcte et accessible dans votre navigateur.\n");
            analysis.append("3. **Activer le mode simulé (Mock)** : Utilisez le bouton 'Simuler SonarQube' dans les options de la plateforme si vous ne souhaitez pas faire tourner un serveur lourd localement.");
        } 
        else if (stepName.equalsIgnoreCase("Docker Build") || logs.contains("docker build") || logs.contains("Dockerfile") || logs.contains("invalid-command-here")) {
            analysis.append("#### 🔴 Type d'erreur : Échec de la construction de l'image Docker\n\n");
            analysis.append("**Explication** : Le démon Docker n'a pas pu construire l'image. ");
            
            if (logs.contains("invalid-command-here")) {
                analysis.append("L'erreur provient d'une instruction invalide injectée dans un Dockerfile de démonstration.\n\n");
                analysis.append("**Solutions recommandées** :\n");
                analysis.append("1. **Désactiver la simulation** : Décochez 'Forcer Échec Docker Build'.\n");
                analysis.append("2. **Corriger le Dockerfile** : Vérifiez les instructions (FROM, RUN, COPY) du Dockerfile pour s'assurer qu'elles font référence à des images existantes et des commandes valides.");
            } else {
                analysis.append("Soit le service Docker n'est pas démarré sur votre machine, soit il y a une erreur de syntaxe dans le `Dockerfile`.\n\n");
                analysis.append("**Solutions recommandées** :\n");
                analysis.append("1. Vérifiez que l'application Docker Desktop (ou le démon Docker) est bien lancée et opérationnelle.\n");
                analysis.append("2. Exécutez `docker info` dans votre terminal pour valider l'état du service.");
            }
        } 
        else if (stepName.equalsIgnoreCase("Déploiement") || logs.contains("docker run") || logs.contains("docker rm") || logs.contains("port is already allocated")) {
            analysis.append("#### 🔴 Type d'erreur : Conflit de Port ou Erreur de Lancement Docker\n\n");
            analysis.append("**Explication** : L'application n'a pas pu être déployée car le conteneur Docker n'a pas pu démarrer, généralement à cause d'un conflit de port (le port `8081` est déjà utilisé par un autre service).\n\n");
            analysis.append("**Solutions recommandées** :\n");
            analysis.append("1. **Nettoyer les conteneurs existants** : Supprimez les conteneurs résiduels en exécutant :\n");
            analysis.append("   ```bash\n   docker rm -f cicd-ai-app-container\n   ```\n");
            analysis.append("2. **Vérifier l'utilisation du port 8081** : Fermez toute application locale utilisant le port 8081.");
        } 
        else if (stepName.equalsIgnoreCase("Surveillance") || logs.contains("Actuator") || logs.contains("healthcheck") || logs.contains("Connection refused")) {
            analysis.append("#### 🔴 Type d'erreur : Échec du Test de Surveillance (Monitoring Healthcheck)\n\n");
            analysis.append("**Explication** : Le pipeline a déployé le conteneur Docker, mais l'endpoint de surveillance `/actuator/health` n'a pas répondu ou a renvoyé un statut 'DOWN' / Échec.\n\n");
            analysis.append("**Solutions recommandées** :\n");
            analysis.append("1. **Vérifier les logs du conteneur déployé** : Affichez les logs de l'application démarrée pour voir si elle a crashé au démarrage :\n");
            analysis.append("   ```bash\n   docker logs cicd-ai-app-container\n   ```\n");
            analysis.append("2. **Actuator Manquant** : Assurez-vous que la dépendance `spring-boot-starter-actuator` est bien présente dans votre `pom.xml`.\n");
            analysis.append("3. **Problème de configuration de base de données** : Si l'application utilise une base de données, assurez-vous qu'elle est démarrée, sinon Actuator marquera la santé générale comme 'DOWN'.");
        } 
        else {
            analysis.append("#### 🔴 Échec à l'étape ").append(stepName).append("\n\n");
            analysis.append("**Explication** : Une erreur inattendue s'est produite durant cette étape.\n\n");
            analysis.append("**Solutions recommandées** :\n");
            analysis.append("1. Analysez les logs ci-dessous pour identifier l'origine du problème.\n");
            analysis.append("2. Assurez-vous que les dépendances externes requises par cette étape sont bien configurées.");
        }

        return analysis.toString();
    }
}
