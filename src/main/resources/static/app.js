// --- ÉTAT GLOBAL ---
const state = {
    isRunning: false,
    timerInterval: null,
    secondsElapsed: 0,
    selectedErrors: [],
    steps: ['checkout', 'compile', 'test', 'sonar', 'docker', 'deploy'],
    currentStepIndex: 0,
    currentBuildId: 1042,
    lastFailedStep: null
};

// --- GESTION DE LA SÉLECTION DES SCÉNARIOS ---
const checkboxes = document.querySelectorAll('input[name="scenario"]');
const btnStart = document.getElementById('btn-start');
const selectionCount = document.getElementById('selection-count');

checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
        if(state.isRunning) return; // Empêcher la modification pendant l'exécution
        state.selectedErrors = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
        selectionCount.innerText = `${state.selectedErrors.length} erreur(s)`;
    });
});

// --- MOTEUR DU PIPELINE ---
function togglePipeline() {
    if (state.isRunning) return;
    
    // Incrémenter le build ID pour le nouveau build
    state.currentBuildId++;
    document.querySelector('.pipeline-info h2').innerText = `Déploiement #${state.currentBuildId}`;
    
    // Réinitialisation
    resetUI();
    state.isRunning = true;
    btnStart.innerText = "Pipeline en cours...";
    btnStart.disabled = true;
    startTimer();
    
    // MAJ Status Global
    const globalStatus = document.getElementById('global-status');
    globalStatus.className = 'status-badge running';
    document.getElementById('status-text').innerText = 'En cours';

    // Lancer la boucle d'étapes
    runNextStep();
}

function resetUI() {
    state.currentStepIndex = 0;
    state.secondsElapsed = 0;
    updateTimerDisplay();
    document.getElementById('main-progress').style.width = '0%';
    document.getElementById('ai-panel').classList.remove('show');
    document.getElementById('ai-result').style.display = 'none';
    document.getElementById('ai-loading').style.display = 'flex';
    
    state.steps.forEach((step, index) => {
        document.getElementById(`node-${step}`).className = 'node';
        if (index < state.steps.length - 1) {
            document.getElementById(`edge-${step}`).className = 'edge';
        }
    });
}

function runNextStep() {
    if (state.currentStepIndex >= state.steps.length) {
        finishPipeline(true);
        return;
    }

    const currentStepName = state.steps[state.currentStepIndex];
    const node = document.getElementById(`node-${currentStepName}`);
    
    // Activer le nœud actuel
    node.className = 'node active running';
    
    // Animer le lien (edge) vers le prochain nœud si ce n'est pas le dernier
    if (state.currentStepIndex < state.steps.length - 1) {
        document.getElementById(`edge-${currentStepName}`).className = 'edge running';
    }

    // Calcul de la progression
    const progressPercent = ((state.currentStepIndex) / (state.steps.length - 1)) * 100;
    document.getElementById('main-progress').style.width = `${progressPercent}%`;

    // Simuler le traitement (temps aléatoire entre 1s et 2s)
    const processingTime = 1000 + Math.random() * 1000;
    
    setTimeout(() => {
        // Vérifier si cette étape doit échouer selon la sélection de l'utilisateur
        if (state.selectedErrors.includes(currentStepName) || 
            (currentStepName === 'sonar' && (state.selectedErrors.includes('sonar_smell') || state.selectedErrors.includes('sonar_sec')))
        ) {
            node.className = 'node fail';
            if (state.currentStepIndex < state.steps.length - 1) {
                document.getElementById(`edge-${currentStepName}`).className = 'edge';
            }
            
            // Trouver l'erreur spécifique à remonter
            let failedStepToReport = currentStepName;
            if (currentStepName === 'sonar') {
                if (state.selectedErrors.includes('sonar_sec')) failedStepToReport = 'sonar_sec';
                else failedStepToReport = 'sonar_smell';
            }
            
            finishPipeline(false, failedStepToReport);
            return;
        }

        // Sinon, succès
        node.className = 'node success';
        if (state.currentStepIndex < state.steps.length - 1) {
            document.getElementById(`edge-${currentStepName}`).className = 'edge active';
        }
        
        state.currentStepIndex++;
        runNextStep();
    }, processingTime);
}

function finishPipeline(success, failedStep = null) {
    state.isRunning = false;
    stopTimer();
    
    btnStart.innerText = "Relancer le pipeline";
    btnStart.disabled = false;
    
    const globalStatus = document.getElementById('global-status');
    
    // Déterminer le libellé des scénarios testés
    const scenarioNames = state.selectedErrors.map(err => {
        if(err === 'test') return 'Test Unitaire';
        if(err === 'sonar_smell') return 'Warning Sonar';
        if(err === 'docker') return 'Build Docker';
        if(err === 'sonar_sec') return 'Quality Gate';
        if(err === 'deploy') return 'Déploiement';
        return err;
    }).join(', ') || 'Aucune erreur';

    const historyBody = document.getElementById('build-history-body');
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let statusBadge = '';
    let actionBtn = '-';
    
    if (success) {
        globalStatus.className = 'status-badge success';
        document.getElementById('status-text').innerText = 'Réussi';
        document.getElementById('main-progress').style.width = '100%';
        
        statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2);">Succès</span>`;
    } else {
        globalStatus.className = 'status-badge fail';
        document.getElementById('status-text').innerText = 'Échec critique';
        state.lastFailedStep = failedStep;
        triggerAI(failedStep);
        
        statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2);">Échec</span>`;
        actionBtn = `<button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="showPastDiagnostic('${failedStep}')">Diag. IA</button>`;
    }
    
    // Insérer en haut du tableau d'historique
    const newRow = document.createElement('tr');
    newRow.id = `build-${state.currentBuildId}`;
    newRow.style.borderBottom = '1px solid rgba(255,255,255,0.02)';
    newRow.innerHTML = `
        <td style="padding: 0.75rem 0.5rem; font-family: monospace; font-size: 0.9rem;">#${state.currentBuildId}</td>
        <td style="padding: 0.75rem 0.5rem; font-size: 0.85rem; color: var(--text-muted);">${timeString}</td>
        <td style="padding: 0.75rem 0.5rem; font-size: 0.85rem;">${scenarioNames}</td>
        <td style="padding: 0.75rem 0.5rem;" class="build-status-cell">${statusBadge}</td>
        <td style="padding: 0.75rem 0.5rem;">${actionBtn}</td>
    `;
    historyBody.insertBefore(newRow, historyBody.firstChild);
}

// --- CHRONOMÈTRE ---
function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.secondsElapsed++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    clearInterval(state.timerInterval);
}

function updateTimerDisplay() {
    const m = Math.floor(state.secondsElapsed / 60).toString().padStart(2, '0');
    const s = (state.secondsElapsed % 60).toString().padStart(2, '0');
    document.getElementById('pipeline-timer').innerText = `${m}:${s}s`;
}

// --- DIAGNOSTIC IA ---
function triggerAI(stepName) {
    const aiPanel = document.getElementById('ai-panel');
    const aiLoading = document.getElementById('ai-loading');
    const aiResult = document.getElementById('ai-result');
    const badgeSeverity = document.getElementById('ai-severity');
    
    aiPanel.style.display = 'block';
    
    // Forcer le reflow pour que l'animation de transition fonctionne
    void aiPanel.offsetWidth;
    aiPanel.classList.add('show');
    
    // Simulation réseau Gemini
    setTimeout(() => {
        aiLoading.style.display = 'none';
        aiResult.style.display = 'flex';
        injectAIData(stepName, badgeSeverity);
    }, 2500);
}

function injectAIData(stepName, badge) {
    const data = getErrorDatabase(stepName);
    
    badge.className = `badge badge-${data.severityClass}`;
    badge.innerText = data.severityText;
    
    document.getElementById('ai-cause').innerHTML = data.cause;
    document.getElementById('ai-file').innerText = data.file;
    document.getElementById('ai-solution').innerHTML = data.solution;
}

function getErrorDatabase(step) {
    const db = {
        test: {
            severityClass: 'success', severityText: 'Faible',
            file: 'DateUtilsTest.java',
            cause: `Le test unitaire secondaire (formatage de date) a échoué car le format attendu était <code>dd/MM/yyyy</code> mais la fonction a retourné <code>yyyy-MM-dd</code>.`,
            solution: `// Corriger l'assertion de test<br><span style="color:#6b7280;">- assertEquals("2026-07-20", formattedDate);</span><br><span style="color:var(--success);">+ assertEquals("20/07/2026", formattedDate);</span>`
        },
        sonar_smell: {
            severityClass: 'success', severityText: 'Faible',
            file: 'ClientService.java',
            cause: `L'analyse SonarQube a détecté un <strong>Code Smell</strong> : la variable <code>temporaryList</code> est déclarée à la ligne 84 mais n'est jamais utilisée dans la suite de la fonction.`,
            solution: `// Supprimer la variable inutilisée<br><span style="color:#6b7280;">- List&lt;Client&gt; temporaryList = new ArrayList&lt;&gt;();</span><br><span style="color:var(--success);">// Nettoyé</span>`
        },
        docker: {
            severityClass: 'warning', severityText: 'Moyenne',
            file: 'Dockerfile',
            cause: `Le build Docker a échoué à cause d'une erreur de configuration. L'instruction <code>COPY target/app.jar app.jar</code> a échoué car le fichier <code>target/app.jar</code> est introuvable.`,
            solution: `// Modifier le chemin source pour qu'il corresponde au nom réel généré par Maven<br><span style="color:#6b7280;">- COPY target/app.jar app.jar</span><br><span style="color:var(--success);">+ COPY target/cicd-ai-app-0.0.1-SNAPSHOT.jar app.jar</span>`
        },
        sonar_sec: {
            severityClass: 'danger', severityText: 'Critique',
            file: 'application.properties',
            cause: `Le Quality Gate a bloqué le pipeline. Une vulnérabilité de type <strong>Hardcoded Password</strong> a été détectée. Un identifiant de production est inscrit en clair.`,
            solution: `// Utiliser des variables d'environnement<br><span style="color:#6b7280;">- spring.datasource.password=SuperSecretProd2026!</span><br><span style="color:var(--success);">+ spring.datasource.password=\${DB_PASSWORD}</span>`
        },
        deploy: {
            severityClass: 'danger', severityText: 'Critique',
            file: 'application.properties',
            cause: `Le déploiement est totalement bloqué car l'application refuse de démarrer. Impossible de se connecter à la base de données <code>PostgreSQL</code> (Connection refused).`,
            solution: `// Modifier l'URL JDBC pour utiliser le nom du réseau Docker<br><span style="color:#6b7280;">- spring.datasource.url=jdbc:postgresql://localhost:5432/db</span><br><span style="color:var(--success);">+ spring.datasource.url=jdbc:postgresql://postgres_db:5432/db</span>`
        }
    };
    return db[step];
}

function resolveError() {
    // 1. Fermer le panneau IA
    const aiPanel = document.getElementById('ai-panel');
    aiPanel.classList.remove('show');
    setTimeout(() => { aiPanel.style.display = 'none'; }, 500);

    // 2. Mettre à jour le badge de statut global
    const globalStatus = document.getElementById('global-status');
    globalStatus.className = 'status-badge success';
    document.getElementById('status-text').innerText = 'Résolu ✅';

    // 3. Remettre le pipeline en état "Prêt" (neutre)
    state.steps.forEach((step, index) => {
        document.getElementById(`node-${step}`).className = 'node';
        if (index < state.steps.length - 1) {
            document.getElementById(`edge-${step}`).className = 'edge';
        }
    });
    document.getElementById('main-progress').style.width = '0%';
    document.getElementById('pipeline-timer').innerText = '00:00s';
    
    // Rétablir le bouton start
    btnStart.innerText = "Lancer le pipeline";
    btnStart.disabled = false;

    // 4. Mettre à jour le statut du build correspondant dans l'historique
    const buildRow = document.getElementById(`build-${state.currentBuildId}`);
    if (buildRow) {
        const statusCell = buildRow.querySelector('.build-status-cell');
        if (statusCell) {
            statusCell.innerHTML = `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2);">Résolu ✅</span>`;
        }
    }
}

function showPastDiagnostic(stepName) {
    const aiPanel = document.getElementById('ai-panel');
    const aiLoading = document.getElementById('ai-loading');
    const aiResult = document.getElementById('ai-result');
    const badgeSeverity = document.getElementById('ai-severity');
    
    aiPanel.style.display = 'block';
    void aiPanel.offsetWidth;
    aiPanel.classList.add('show');
    
    // Afficher directement sans délai pour la consultation
    aiLoading.style.display = 'none';
    aiResult.style.display = 'flex';
    injectAIData(stepName, badgeSeverity);
}

function copySolution() {
    alert("Solution copiée dans le presse-papier !");
}
