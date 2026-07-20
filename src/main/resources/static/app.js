// --- Logique du Pipeline ---
const steps = ['checkout', 'compile', 'test', 'sonar', 'docker', 'deploy'];

function resetPipeline() {
    steps.forEach(step => {
        const el = document.getElementById(`step-${step}`);
        if(el) {
            el.className = 'step-v';
            el.querySelector('.status-text').innerText = 'En attente';
        }
    });
}

function updateStep(stepName, status, message) {
    const el = document.getElementById(`step-${stepName}`);
    if(!el) return;

    el.className = `step-v ${status}`;
    const statusText = el.querySelector('.status-text');
    
    if (status === 'running') {
        statusText.innerText = 'En cours...';
    } else if (status === 'success') {
        statusText.innerText = 'Succès';
    } else if (status === 'fail') {
        statusText.innerText = message || 'Échec critique !';
    }
}

function startSimulation() {
    resetPipeline();
    closeAIModal();
    
    // Récupérer le type d'erreur cochée
    const selectedError = document.querySelector('input[name="errorType"]:checked').value;
    
    // Déterminer à quelle étape on s'arrête
    let failIndex = -1;
    if (selectedError === 'compile') failIndex = 1;
    if (selectedError === 'test') failIndex = 2;
    if (selectedError === 'sonar') failIndex = 3;
    if (selectedError === 'deploy') failIndex = 5;

    let currentStep = 0;
    
    const runNextStep = () => {
        if(currentStep >= steps.length) return;
        
        const stepName = steps[currentStep];
        updateStep(stepName, 'running');
        
        setTimeout(() => {
            if (currentStep === failIndex) {
                // L'erreur se produit ici
                updateStep(stepName, 'fail', 'Erreur détectée !');
                triggerAIAnalysis(selectedError);
                return; // Arrêt du pipeline
            }
            
            // L'étape réussit
            updateStep(stepName, 'success');
            currentStep++;
            runNextStep();
            
        }, 1200); // Durée d'animation pour chaque étape
    };
    
    runNextStep();
}

// --- Logique de l'Intelligence Artificielle ---

function triggerAIAnalysis(errorType) {
    const overlay = document.getElementById('ai-overlay');
    const content = document.getElementById('ai-body-content');
    
    content.innerHTML = `
        <div class="ai-loader" style="text-align:center; padding: 2rem;">
            <div style="font-size:1.2rem; color:var(--primary); margin-bottom: 1rem;">Extraction des logs CI/CD...</div>
            <p style="color:var(--text-muted);">Gemini recherche et analyse l'origine de l'échec.</p>
        </div>
    `;
    
    overlay.classList.add('show');
    
    setTimeout(() => {
        showAIDiagnostic(errorType);
    }, 2000);
}

function showAIDiagnostic(errorType) {
    const content = document.getElementById('ai-body-content');
    
    let logExtract = "";
    let explanation = "";
    let solution = "";
    
    if (errorType === 'compile') {
        logExtract = `[ERROR] /app/src/main/java/com/codix/cicdai/controller/ClientController.java:[42,50] ';' expected`;
        explanation = `L'étape de compilation a échoué en raison d'une erreur de syntaxe en Java. Le compilateur (javac) indique qu'un point-virgule (;) manque à la ligne 42 du fichier ClientController.java.`;
        solution = `Ouvrez le fichier concerné, allez à la ligne 42, et ajoutez le point-virgule à la fin de l'instruction.<br><br><span style="color:var(--success)">// Correction :</span><br>List&lt;Client&gt; clients = service.findAll();`;
    } 
    else if (errorType === 'test') {
        logExtract = `java.lang.NullPointerException: Cannot invoke "String.length()" because "client.name" is null\n  at com.codix.cicdai.service.ClientService.create(ClientService.java:34)`;
        explanation = `Le pipeline a échoué car une exception NullPointerException s'est produite lors de l'exécution des tests unitaires. Vous essayez d'appeler la méthode length() sur la variable client.name qui n'a pas été initialisée (elle est null).`;
        solution = `Ajoutez une vérification de nullité avant de traiter le nom du client dans la méthode create().<br><br><span style="color:var(--success)">// Correction :</span><br>if (client.getName() == null) { throw new IllegalArgumentException("Le nom est obligatoire"); }`;
    }
    else if (errorType === 'sonar') {
        logExtract = `[ERROR] Failed to execute goal org.sonarsource.scanner.maven:sonar-maven-plugin:3.9.1:sonar... \nQUALITY GATE STATUS: FAILED - 1 Blocker Vulnerability (Hardcoded Password)`;
        explanation = `Le Quality Gate de SonarQube a échoué. L'analyse statique du code a détecté une faille de sécurité majeure : un mot de passe a été écrit en clair (en dur) dans le code source de l'application.`;
        solution = `Supprimez le mot de passe écrit en clair dans le code. Utilisez plutôt des variables d'environnement pour injecter les identifiants sensibles.<br><br><span style="color:var(--success)">// Correction :</span><br>@Value("\${spring.datasource.password}")<br>private String dbPassword;`;
    }
    else if (errorType === 'deploy') {
        logExtract = `org.postgresql.util.PSQLException: Connection to localhost:5432 refused. Check that the hostname and port are correct and that the postmaster is accepting TCP/IP connections.`;
        explanation = `Le déploiement a échoué car l'application refuse de démarrer. Elle n'arrive pas à se connecter à la base de données PostgreSQL sur le port 5432.`;
        solution = `Vérifiez que le conteneur Docker PostgreSQL est bien démarré, et que l'URL de connexion JDBC dans le fichier application.properties pointe bien vers le nom du conteneur (ex: jdbc:postgresql://db:5432/clientsdb) et non 'localhost'.`;
    }

    content.innerHTML = `
        <div class="ai-section-title">📄 Log d'Erreur (Extrait Jenkins)</div>
        <div class="ai-code-block">${logExtract.replace(/\n/g, '<br>')}</div>
        
        <div class="ai-section-title">🤖 Diagnostic Gemini</div>
        <p>${explanation}</p>
        
        <div class="ai-section-title">🛠️ Solution Proposée</div>
        <div class="ai-code-block" style="border-left-color: var(--success); color: white;">
            ${solution}
        </div>
    `;
}

function closeAIModal() {
    const overlay = document.getElementById('ai-overlay');
    overlay.classList.remove('show');
}
