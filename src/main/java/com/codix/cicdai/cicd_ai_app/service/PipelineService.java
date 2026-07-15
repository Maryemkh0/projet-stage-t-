package com.codix.cicdai.cicd_ai_app.service;

import com.codix.cicdai.cicd_ai_app.model.PipelineStatus;
import com.codix.cicdai.cicd_ai_app.model.PipelineStep;
import com.codix.cicdai.cicd_ai_app.model.StepExecution;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class PipelineService {

    private final AiAnalysisService aiAnalysisService;
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();

    // Stockage en mémoire de l'exécution du pipeline
    private final Map<PipelineStep, StepExecution> stepsMap = new ConcurrentHashMap<>();
    private PipelineStatus pipelineStatus = PipelineStatus.IDLE;
    private String currentRunningStepName = "";

    // Configurations dynamiques pour la démo
    private boolean mockSonarQube = true;
    private boolean forceCompilationError = false;
    private boolean forceTestError = false;
    private boolean forceSonarQubeError = false;
    private boolean forceDockerBuildError = false;
    private boolean forceDeployError = false;
    private boolean forceMonitoringError = false;

    // Chemin racine du projet
    private final String projectRootPath = "C:\\Users\\khemi\\projets\\cicd-ai-app";

    @Autowired
    public PipelineService(AiAnalysisService aiAnalysisService) {
        this.aiAnalysisService = aiAnalysisService;
        resetPipeline();
    }

    public synchronized void resetPipeline() {
        this.pipelineStatus = PipelineStatus.IDLE;
        this.currentRunningStepName = "";
        for (PipelineStep step : PipelineStep.values()) {
            stepsMap.put(step, new StepExecution(step));
        }
    }

    public synchronized Map<PipelineStep, StepExecution> getStepsStatus() {
        return new LinkedHashMap<>(stepsMap); // Préserver l'ordre de l'énumération
    }

    public synchronized PipelineStatus getPipelineStatus() {
        return pipelineStatus;
    }

    public synchronized String getCurrentRunningStepName() {
        return currentRunningStepName;
    }

    public synchronized void runPipeline() {
        if (this.pipelineStatus == PipelineStatus.RUNNING) {
            return; // Déjà en cours
        }

        resetPipeline();
        this.pipelineStatus = PipelineStatus.RUNNING;

        executorService.submit(this::executePipelineTasks);
    }

    private void executePipelineTasks() {
        try {
            // Étape 1 : Compilation
            if (!runStep(PipelineStep.COMPILATION, this::compileProject)) return;

            // Étape 2 : Tests
            if (!runStep(PipelineStep.TESTS, this::testProject)) return;

            // Étape 3 : SonarQube
            if (!runStep(PipelineStep.SONARQUBE, this::runSonarQube)) return;

            // Étape 4 : Docker Build
            if (!runStep(PipelineStep.DOCKER_BUILD, this::buildDockerImage)) return;

            // Étape 5 : Déploiement
            if (!runStep(PipelineStep.DEPLOY, this::deployApplication)) return;

            // Étape 6 : Surveillance
            if (!runStep(PipelineStep.MONITORING, this::monitorApplication)) return;

            synchronized (this) {
                this.pipelineStatus = PipelineStatus.SUCCESS;
                this.currentRunningStepName = "";
            }
        } catch (Exception e) {
            e.printStackTrace();
            synchronized (this) {
                this.pipelineStatus = PipelineStatus.FAILED;
            }
        }
    }

    private boolean runStep(PipelineStep step, StepAction action) {
        StepExecution execution = stepsMap.get(step);
        execution.setStatus(PipelineStatus.RUNNING);
        synchronized (this) {
            this.currentRunningStepName = step.getDisplayName();
        }

        long start = System.currentTimeMillis();
        boolean success = false;
        try {
            success = action.execute(execution);
        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            execution.setLogs(execution.getLogs() + "\nException fatale lors de l'étape : " + sw.toString());
        }
        long duration = System.currentTimeMillis() - start;
        execution.setDurationMs(duration);

        if (success) {
            execution.setStatus(PipelineStatus.SUCCESS);
            return true;
        } else {
            execution.setStatus(PipelineStatus.FAILED);
            // Déclencher l'IA pour analyser les erreurs D'ABORD (synchrone)
            execution.setErrorAnalysis(aiAnalysisService.analyzeError(step.getDisplayName(), execution.getLogs()));
            
            synchronized (this) {
                this.pipelineStatus = PipelineStatus.FAILED;
                this.currentRunningStepName = "";
            }
            return false;
        }
    }

    @FunctionalInterface
    private interface StepAction {
        boolean execute(StepExecution execution) throws Exception;
    }

    // ==========================================
    // ÉTAPE 1 : Compilation
    // ==========================================
    private boolean compileProject(StepExecution execution) throws Exception {
        Path tempClassPath = Paths.get(projectRootPath, "src", "main", "java", "com", "codix", "cicdai", "cicd_ai_app", "temp_demo_only", "BadClass.java");
        
        try {
            if (forceCompilationError) {
                // Créer le sous-dossier temp_demo_only
                Files.createDirectories(tempClassPath.getParent());
                // Injecter un fichier Java contenant des erreurs de compilation volontaires
                String badJavaCode = "package com.codix.cicdai.cicd_ai_app.temp_demo_only;\n" +
                                     "public class BadClass {\n" +
                                     "    public void dummy() {\n" +
                                     "        invalid_java_code_syntax_for_demo_compilation_error_to_be_analyzed_by_ai\n" +
                                     "    }\n" +
                                     "}\n";
                Files.writeString(tempClassPath, badJavaCode);
                execution.setLogs("[DÉMO] Injection d'un fichier Java comportant une erreur de syntaxe pour forcer l'échec.\n");
            }

            String[] cmd = {"cmd.exe", "/c", "mvnw.cmd compile"};
            return executeCommandLine(cmd, execution);

        } finally {
            // Nettoyage impératif après compilation pour ne pas corrompre le workspace
            if (Files.exists(tempClassPath)) {
                Files.delete(tempClassPath);
                Files.delete(tempClassPath.getParent());
            }
        }
    }

    // ==========================================
    // ÉTAPE 2 : Tests
    // ==========================================
    private boolean testProject(StepExecution execution) throws Exception {
        Path tempTestPath = Paths.get(projectRootPath, "src", "test", "java", "com", "codix", "cicdai", "cicd_ai_app", "temp_demo_only", "BadTest.java");
        
        try {
            if (forceTestError) {
                // Créer le sous-dossier temp_demo_only dans les tests
                Files.createDirectories(tempTestPath.getParent());
                // Injecter un test JUnit qui échoue systématiquement
                String badTestCode = "package com.codix.cicdai.cicd_ai_app.temp_demo_only;\n" +
                                     "import org.junit.jupiter.api.Test;\n" +
                                     "import static org.junit.jupiter.api.Assertions.fail;\n" +
                                     "public class BadTest {\n" +
                                     "    @Test\n" +
                                     "    void testFailureDemo() {\n" +
                                     "        fail(\"Échec provoqué pour la démonstration de l'analyse IA sur échec de tests unitaires.\");\n" +
                                     "    }\n" +
                                     "}\n";
                Files.writeString(tempTestPath, badTestCode);
                execution.setLogs("[DÉMO] Injection d'un test JUnit forçant l'échec.\n");
            }

            String[] cmd = {"cmd.exe", "/c", "mvnw.cmd test"};
            return executeCommandLine(cmd, execution);

        } finally {
            // Nettoyage impératif après exécution des tests
            if (Files.exists(tempTestPath)) {
                Files.delete(tempTestPath);
                Files.delete(tempTestPath.getParent());
            }
        }
    }

    // ==========================================
    // ÉTAPE 3 : SonarQube
    // ==========================================
    private boolean runSonarQube(StepExecution execution) throws Exception {
        if (forceSonarQubeError) {
            execution.setLogs("[DÉMO] Lancement du scanner SonarQube avec une URL invalide pour forcer une erreur de connexion.\n");
            String[] cmd = {"cmd.exe", "/c", "mvnw.cmd sonar:sonar -Dsonar.host.url=http://localhost:9999"};
            return executeCommandLine(cmd, execution);
        }

        if (mockSonarQube) {
            execution.setLogs("[SIMULATION] Simulation de l'analyse SonarQube activée.\n" +
                              "[INFO] User cache: C:\\Users\\khemi\\.sonar\\cache\n" +
                              "[INFO] SonarQube version: 10.6.0\n" +
                              "[INFO] Default Quality Gate is used.\n" +
                              "[INFO] ANALYSIS SUCCESSFUL, you can find the results at: http://localhost:9000/dashboard?id=com.codix.cicdai%3Acicd-ai-app\n" +
                              "[INFO] Note quality gate status: PASSED\n" +
                              "[SIMULATION] Analyse SonarQube terminée avec succès !");
            Thread.sleep(1500); // Rendre la simulation réaliste en termes de temps
            return true;
        }

        // Mode réel : essayer de lancer sonar:sonar
        String[] cmd = {"cmd.exe", "/c", "mvnw.cmd sonar:sonar"};
        return executeCommandLine(cmd, execution);
    }

    // ==========================================
    // ÉTAPE 4 : Docker Build
    // ==========================================
    private boolean buildDockerImage(StepExecution execution) throws Exception {
        Path badDockerfilePath = Paths.get(projectRootPath, "Dockerfile.bad");
        
        try {
            if (forceDockerBuildError) {
                // Créer un Dockerfile avec une erreur d'instruction
                String badDockerfileContent = "FROM alpine:latest\n" +
                                               "RUN invalid-command-for-demo-docker-build-error\n";
                Files.writeString(badDockerfilePath, badDockerfileContent);
                execution.setLogs("[DÉMO] Utilisation d'un Dockerfile défaillant pour forcer l'échec.\n");
                
                String[] cmd = {"docker", "build", "-f", "Dockerfile.bad", "-t", "cicd-ai-app:latest", "."};
                return executeCommandLine(cmd, execution);
            } else {
                String[] cmd = {"docker", "build", "-t", "cicd-ai-app:latest", "."};
                return executeCommandLine(cmd, execution);
            }
        } finally {
            if (Files.exists(badDockerfilePath)) {
                Files.delete(badDockerfilePath);
            }
        }
    }

    // ==========================================
    // ÉTAPE 5 : Déploiement
    // ==========================================
    private boolean deployApplication(StepExecution execution) throws Exception {
        if (forceDeployError) {
            execution.setLogs("[DÉMO] Provocation d'une erreur de déploiement (utilisation d'un paramètre Docker incorrect).\n");
            String[] cmd = {"docker", "run", "--invalid-flag-force-deploy-failure", "cicd-ai-app:latest"};
            return executeCommandLine(cmd, execution);
        }

        execution.setLogs("[INFO] Nettoyage de l'ancien conteneur s'il existe...\n");
        // Arrêter et supprimer le conteneur s'il tourne déjà (ignore les erreurs si le conteneur n'existe pas)
        executeCommandLineSilent(new String[]{"docker", "rm", "-f", "cicd-ai-app-container"});

        execution.setLogs("[INFO] Déploiement du conteneur cicd-ai-app-container sur le port 8081...\n");
        // Lancer le nouveau conteneur
        String[] cmd = {"docker", "run", "-d", "--name", "cicd-ai-app-container", "-p", "8081:8080", "cicd-ai-app:latest"};
        return executeCommandLine(cmd, execution);
    }

    // ==========================================
    // ÉTAPE 6 : Surveillance
    // ==========================================
    private boolean monitorApplication(StepExecution execution) throws Exception {
        if (forceMonitoringError) {
            execution.setLogs("[DÉMO] Arrêt immédiat du conteneur pour simuler un échec du healtcheck de surveillance...\n");
            executeCommandLineSilent(new String[]{"docker", "stop", "cicd-ai-app-container"});
        }

        execution.setLogs("[INFO] Début de la vérification de la santé de l'application...\n");
        execution.setLogs("Cible de surveillance : http://localhost:8081/actuator/health\n");

        int maxAttempts = 10;
        int delayMs = 2500; // Laisser le temps à Spring Boot de démarrer dans le conteneur
        
        for (int i = 1; i <= maxAttempts; i++) {
            execution.setLogs(execution.getLogs() + String.format("Tentative %d/%d...\n", i, maxAttempts));
            try {
                URL url = new URL("http://localhost:8081/actuator/health");
                HttpURLConnection con = (HttpURLConnection) url.openConnection();
                con.setRequestMethod("GET");
                con.setConnectTimeout(2000);
                con.setReadTimeout(2000);
                
                int status = con.getResponseCode();
                if (status == 200) {
                    execution.setLogs(execution.getLogs() + "🟢 Succès : Endpoint Actuator Health répond positivement (HTTP 200).\n");
                    
                    // Récupérer le contenu de l'Actuator
                    BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
                    String inputLine;
                    StringBuilder content = new StringBuilder();
                    while ((inputLine = in.readLine()) != null) {
                        content.append(inputLine);
                    }
                    in.close();
                    con.disconnect();
                    
                    execution.setLogs(execution.getLogs() + "Payload : " + content.toString() + "\n🟢 Surveillance validée ! L'application est opérationnelle.");
                    return true;
                } else {
                    execution.setLogs(execution.getLogs() + "⚠️ Réponse HTTP inattendue : " + status + "\n");
                }
            } catch (Exception e) {
                execution.setLogs(execution.getLogs() + "❌ Service inaccessible : " + e.getMessage() + "\n");
            }
            Thread.sleep(delayMs);
        }

        execution.setLogs(execution.getLogs() + "🔴 Échec : L'application n'est pas opérationnelle après " + maxAttempts + " tentatives.");
        return false;
    }

    // ==========================================
    // UTILS : Méthodes d'exécution système
    // ==========================================
    private boolean executeCommandLine(String[] cmd, StepExecution execution) {
        StringBuilder logsBuilder = new StringBuilder(execution.getLogs());
        logsBuilder.append("Exécution de la commande : ").append(String.join(" ", cmd)).append("\n");
        execution.setLogs(logsBuilder.toString());

        try {
            ProcessBuilder builder = new ProcessBuilder(cmd);
            builder.directory(new File(projectRootPath));
            builder.redirectErrorStream(true); // Rediriger stderr vers stdout

            Process process = builder.start();

            // Lire les flux
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    logsBuilder.append(line).append("\n");
                    // Mise à jour continue
                    execution.setLogs(logsBuilder.toString());
                }
            }

            int exitCode = process.waitFor();
            logsBuilder.append("\nCode de sortie de commande : ").append(exitCode).append("\n");
            execution.setLogs(logsBuilder.toString());

            return exitCode == 0;
        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            logsBuilder.append("\nException lors du lancement de la commande : ").append(sw.toString()).append("\n");
            execution.setLogs(logsBuilder.toString());
            return false;
        }
    }

    private void executeCommandLineSilent(String[] cmd) {
        try {
            ProcessBuilder builder = new ProcessBuilder(cmd);
            builder.directory(new File(projectRootPath));
            Process process = builder.start();
            process.waitFor();
        } catch (Exception e) {
            // Ignoré pour l'exécution silencieuse (utilisée pour le cleanup)
        }
    }

    // ==========================================
    // GETTERS & SETTERS CONFIGURATION DÉMO
    // ==========================================
    public boolean isMockSonarQube() {
        return mockSonarQube;
    }

    public void setMockSonarQube(boolean mockSonarQube) {
        this.mockSonarQube = mockSonarQube;
    }

    public boolean isForceCompilationError() {
        return forceCompilationError;
    }

    public void setForceCompilationError(boolean forceCompilationError) {
        this.forceCompilationError = forceCompilationError;
    }

    public boolean isForceTestError() {
        return forceTestError;
    }

    public void setForceTestError(boolean forceTestError) {
        this.forceTestError = forceTestError;
    }

    public boolean isForceSonarQubeError() {
        return forceSonarQubeError;
    }

    public void setForceSonarQubeError(boolean forceSonarQubeError) {
        this.forceSonarQubeError = forceSonarQubeError;
    }

    public boolean isForceDockerBuildError() {
        return forceDockerBuildError;
    }

    public void setForceDockerBuildError(boolean forceDockerBuildError) {
        this.forceDockerBuildError = forceDockerBuildError;
    }

    public boolean isForceDeployError() {
        return forceDeployError;
    }

    public void setForceDeployError(boolean forceDeployError) {
        this.forceDeployError = forceDeployError;
    }

    public boolean isForceMonitoringError() {
        return forceMonitoringError;
    }

    public void setForceMonitoringError(boolean forceMonitoringError) {
        this.forceMonitoringError = forceMonitoringError;
    }
}
