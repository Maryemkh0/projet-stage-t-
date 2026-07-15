// Base URL pour l'API du pipeline
const API_BASE = '/api/pipeline';

// Éléments du DOM
const btnRunPipeline = document.getElementById('btn-run-pipeline');
const btnResetPipeline = document.getElementById('btn-reset-pipeline');
const btnConfigKey = document.getElementById('btn-config-key');
const configModal = document.getElementById('config-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelConfig = document.getElementById('btn-cancel-config');
const btnSaveConfig = document.getElementById('btn-save-config');
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const toggleVisibilityBtn = document.getElementById('toggle-visibility');
const apiStatusIndicator = document.getElementById('api-status-indicator');
const globalStatusBadge = document.getElementById('global-status');
const consoleLogsContainer = document.getElementById('console-logs');
const btnCopyLogs = document.getElementById('btn-copy-logs');
const aiAnalysisContent = document.getElementById('ai-analysis-content');
const aiPulse = document.getElementById('ai-pulse');
const aiPanel = document.getElementById('ai-panel');

// Interrupteurs de simulation
const switches = {
    forceCompilationError: document.getElementById('sim-compilation'),
    forceTestError: document.getElementById('sim-tests'),
    forceSonarQubeError: document.getElementById('sim-sonarqube'),
    forceDockerBuildError: document.getElementById('sim-docker'),
    forceDeployError: document.getElementById('sim-deploy'),
    forceMonitoringError: document.getElementById('sim-monitoring'),
    mockSonarQube: document.getElementById('config-sonar-mock')
};

// Cartes d'étapes du pipeline
const stepCards = document.querySelectorAll('.step-card');

// Variable globale pour stocker l'ID de l'intervalle de surveillance
let pollingInterval = null;
let isPolling = false;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    fetchConfig();
    fetchStatus();
});

// Enregistrer les écouteurs d'événements
function initEventListeners() {
    // Boutons du pipeline
    btnRunPipeline.addEventListener('click', runPipeline);
    btnResetPipeline.addEventListener('click', resetPipeline);

    // Boutons de la modale de clé API
    btnConfigKey.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelConfig.addEventListener('click', closeModal);
    btnSaveConfig.addEventListener('click', saveApiKey);

    // Visibilité de la clé API
    toggleVisibilityBtn.addEventListener('click', toggleApiKeyVisibility);

    // Copie des logs
    btnCopyLogs.addEventListener('click', copyLogsToClipboard);

    // Écouteurs de changement pour tous les switches de configuration
    Object.keys(switches).forEach(key => {
        switches[key].addEventListener('change', updateConfig);
    });

    // Écouteur pour cliquer sur une carte d'étape pour voir ses logs spécifiques (Amélioration UI)
    stepCards.forEach(card => {
        card.addEventListener('click', () => {
            const stepId = card.getAttribute('data-step');
            displayLogsForStep(stepId);
        });
    });
}

// Ouvrir la modale
function openModal() {
    configModal.classList.add('active');
    fetchConfig(); // Re-charger la config pour mettre à jour l'indicateur d'état de clé
}

// Fermer la modale
function closeModal() {
    configModal.classList.remove('active');
}

// Afficher / Masquer la clé API
function toggleApiKeyVisibility() {
    const type = geminiApiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
    geminiApiKeyInput.setAttribute('type', type);
    const icon = toggleVisibilityBtn.querySelector('i');
    if (type === 'text') {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Copier les logs de la console
function copyLogsToClipboard() {
    const logsText = consoleLogsContainer.innerText;
    navigator.clipboard.writeText(logsText)
        .then(() => {
            const originalIcon = btnCopyLogs.innerHTML;
            btnCopyLogs.innerHTML = '<i class="fa-solid fa-check" style="color: var(--color-success)"></i>';
            setTimeout(() => {
                btnCopyLogs.innerHTML = originalIcon;
            }, 2000);
        })
        .catch(err => {
            console.error('Erreur lors de la copie des logs: ', err);
        });
}

// Charger la configuration depuis le backend
async function fetchConfig() {
    try {
        const response = await fetch(`${API_BASE}/config`);
        if (!response.ok) throw new Error('Erreur de chargement de la configuration');
        
        const config = await response.json();
        
        // Mettre à jour les switches
        Object.keys(switches).forEach(key => {
            if (config[key] !== undefined) {
                switches[key].checked = config[key];
            }
        });

        // Mettre à jour l'indicateur de clé API
        if (config.apiKeyConfigured) {
            apiStatusIndicator.classList.add('active');
            apiStatusIndicator.style.display = 'flex';
            btnConfigKey.innerHTML = '<i class="fa-solid fa-key" style="color: var(--color-success)"></i> Clé active';
        } else {
            apiStatusIndicator.classList.remove('active');
            apiStatusIndicator.style.display = 'none';
            btnConfigKey.innerHTML = '<i class="fa-solid fa-key"></i> Clé Gemini API';
        }
    } catch (error) {
        console.error('Erreur de configuration:', error);
    }
}

// Mettre à jour la configuration vers le backend
async function updateConfig() {
    const payload = {};
    Object.keys(switches).forEach(key => {
        payload[key] = switches[key].checked;
    });

    try {
        const response = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Erreur lors de la mise à jour de la configuration');
    } catch (error) {
        console.error('Erreur de mise à jour de la configuration:', error);
    }
}

// Enregistrer la clé API
async function saveApiKey() {
    const apiKey = geminiApiKeyInput.value.trim();
    if (!apiKey) {
        alert('Veuillez saisir une clé API valide.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geminiApiKey: apiKey })
        });

        if (response.ok) {
            geminiApiKeyInput.value = '';
            closeModal();
            fetchConfig();
        } else {
            alert("Erreur lors de l'enregistrement de la clé API.");
        }
    } catch (error) {
        console.error('Erreur de clé API:', error);
        alert("Erreur réseau lors de l'enregistrement de la clé API.");
    }
}

// Lancer le pipeline
async function runPipeline() {
    if (isPolling) return;

    try {
        btnRunPipeline.disabled = true;
        btnRunPipeline.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lancement...';

        const response = await fetch(`${API_BASE}/run`, { method: 'POST' });
        if (!response.ok) throw new Error('Erreur de démarrage');

        const data = await response.json();
        updateGlobalStatus(data.status);
        
        // Commencer le polling
        startPolling();
    } catch (error) {
        console.error('Erreur de lancement:', error);
        btnRunPipeline.disabled = false;
        btnRunPipeline.innerHTML = '<i class="fa-solid fa-play"></i> Lancer le Pipeline';
        alert('Impossible de démarrer le pipeline.');
    }
}

// Réinitialiser le pipeline
async function resetPipeline() {
    try {
        stopPolling();
        
        const response = await fetch(`${API_BASE}/reset`, { method: 'POST' });
        if (!response.ok) throw new Error('Erreur de réinitialisation');

        const data = await response.json();
        updateGlobalStatus(data.status);
        
        // Réinitialiser l'affichage
        consoleLogsContainer.innerHTML = '<div class="terminal-welcome">[CODIX DEVOPS CONSOLE] Pipeline réinitialisé. Prêt pour une nouvelle exécution.</div>';
        
        // Nettoyer l'assistant IA
        aiAnalysisContent.innerHTML = `
            <div class="ai-placeholder">
                <i class="fa-solid fa-robot"></i>
                <p>L'assistant IA de CODIX surveille l'exécution. En cas d'erreur, son diagnostic apparaîtra instantanément ici pour vous expliquer le problème et vous guider pas à pas dans sa résolution.</p>
            </div>
        `;
        aiPanel.classList.remove('error-focus');
        aiPulse.classList.remove('active');

        // Réinitialiser les cartes d'étapes
        stepCards.forEach(card => {
            card.className = 'step-card idle';
            const statusInd = card.querySelector('.status-indicator');
            const statusLbl = card.querySelector('.status-label');
            const duration = card.querySelector('.duration');
            
            statusInd.className = 'status-indicator idle';
            statusLbl.textContent = 'En attente';
            duration.textContent = '0s';
        });

        btnRunPipeline.disabled = false;
        btnRunPipeline.innerHTML = '<i class="fa-solid fa-play"></i> Lancer le Pipeline';

    } catch (error) {
        console.error('Erreur de réinitialisation:', error);
        alert('Impossible de réinitialiser le pipeline.');
    }
}

// Démarrer la surveillance dynamique (Polling)
function startPolling() {
    if (isPolling) return;
    isPolling = true;
    
    // Premier appel immédiat
    fetchStatus();
    
    pollingInterval = setInterval(fetchStatus, 1000);
}

// Arrêter la surveillance dynamique
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    isPolling = false;
}

// Récupérer le statut du pipeline et mettre à jour l'UI
let lastLogLength = 0;
let activeLogsStep = null; // Étape sélectionnée par l'utilisateur pour afficher les logs

async function fetchStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        if (!response.ok) throw new Error('Erreur de récupération du statut');

        const data = await response.json();
        const pipelineStatus = data.pipelineStatus;
        const steps = data.steps;

        // 1. Mettre à jour le badge global
        updateGlobalStatus(pipelineStatus);

        // 2. Mettre à jour chaque carte d'étape
        let allLogs = '';
        let currentRunningStep = null;
        let failedStep = null;

        Object.keys(steps).forEach(stepKey => {
            const stepData = steps[stepKey];
            const card = document.querySelector(`.step-card[data-step="${stepKey}"]`);
            
            if (card) {
                // Mettre à jour la classe css et l'affichage de l'état
                const status = stepData.status.toLowerCase();
                card.className = `step-card ${status}`;
                
                const statusInd = card.querySelector('.status-indicator');
                const statusLbl = card.querySelector('.status-label');
                const durationSpan = card.querySelector('.duration');

                statusInd.className = `status-indicator ${status}`;
                
                // Formater le label d'état
                let statusText = 'En attente';
                if (status === 'running') {
                    statusText = 'En cours';
                    currentRunningStep = stepKey;
                } else if (status === 'success') {
                    statusText = 'Succès';
                } else if (status === 'failed') {
                    statusText = 'Échec';
                    failedStep = stepKey;
                }
                statusLbl.textContent = statusText;

                // Formater la durée
                const durationSec = (stepData.durationMs / 1000).toFixed(1);
                durationSpan.textContent = `${durationSec}s`;

                // Cumuler les logs pour l'affichage console global
                if (stepData.logs) {
                    allLogs += `--- [Étape : ${stepData.step}] ---\n${stepData.logs}\n\n`;
                }
            }
        });

        // 3. Mettre à jour la console de sortie (si l'utilisateur n'a pas verrouillé sur une étape spécifique)
        if (!activeLogsStep) {
            updateLogsConsole(allLogs);
        } else {
            // Afficher uniquement les logs de l'étape sélectionnée
            const selectedStepData = steps[activeLogsStep];
            if (selectedStepData) {
                updateLogsConsole(`--- [FOCALISÉ : ${selectedStepData.step}] ---\n${selectedStepData.logs || 'Aucun log disponible pour cette étape.'}`);
            }
        }

        // 4. Gestion de la fin de l'exécution
        if (pipelineStatus === 'SUCCESS') {
            stopPolling();
            btnRunPipeline.disabled = false;
            btnRunPipeline.innerHTML = '<i class="fa-solid fa-play"></i> Relancer';
            
            // Affichage IA de succès
            aiAnalysisContent.innerHTML = `
                <div class="ai-success-banner" style="text-align: center; padding: 20px;">
                    <i class="fa-solid fa-circle-check" style="font-size: 32px; color: var(--color-success); margin-bottom: 12px;"></i>
                    <h3>Pipeline Validé à 100% !</h3>
                    <p>Toutes les étapes du pipeline DevOps ont été complétées avec succès.</p>
                    <div style="text-align: left; margin-top: 16px; font-size: 12px; border-left: 2px solid var(--color-success); padding-left: 10px; color: var(--text-secondary);">
                        <strong>Indicateurs clés :</strong><br>
                        - Tests passés avec succès<br>
                        - Analyse SonarQube : Quality Gate PASSED<br>
                        - Image Docker créée et déployée<br>
                        - Surveillance Actuator Health : 🟢 UP
                    </div>
                </div>
            `;
            aiPulse.classList.remove('active');
            aiPanel.classList.remove('error-focus');
        } 
        else if (pipelineStatus === 'FAILED') {
            stopPolling();
            btnRunPipeline.disabled = false;
            btnRunPipeline.innerHTML = '<i class="fa-solid fa-play"></i> Relancer';
            aiPulse.classList.remove('active');

            // Trouver l'étape qui a échoué pour récupérer son analyse IA
            if (failedStep) {
                const failedStepData = steps[failedStep];
                if (failedStepData && failedStepData.errorAnalysis) {
                    displayAiAnalysis(failedStepData.errorAnalysis);
                } else {
                    aiAnalysisContent.innerHTML = `
                        <div class="ai-placeholder">
                            <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-danger)"></i>
                            <p>L'étape <strong>${failedStep}</strong> a échoué. En cours de chargement de l'analyse...</p>
                        </div>
                    `;
                }
            }
        } else if (pipelineStatus === 'RUNNING') {
            aiPulse.classList.add('active');
            aiAnalysisContent.innerHTML = `
                <div class="ai-placeholder">
                    <i class="fa-solid fa-spinner fa-spin" style="color: var(--color-accent)"></i>
                    <p>Analyse de l'exécution en cours... L'assistant IA intervient immédiatement si une erreur se produit.</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Erreur lors de la récupération du statut:', error);
    }
}

// Mettre à jour l'affichage de la console de logs
function updateLogsConsole(logsText) {
    if (!logsText) return;
    
    // Éviter de ré-écrire si le texte est identique
    if (consoleLogsContainer.getAttribute('data-raw-logs') === logsText) return;
    
    consoleLogsContainer.setAttribute('data-raw-logs', logsText);
    
    // Convertir les logs en lignes avec spans pour coloration syntaxique de base
    const lines = logsText.split('\n');
    const formattedLines = lines.map(line => {
        let className = 'terminal-line';
        if (line.includes('ERROR') || line.includes('❌') || line.includes('🔴') || line.includes('Exception') || line.includes('Failed') || line.includes('failure')) {
            className += ' text-danger';
        } else if (line.includes('SUCCESS') || line.includes('🟢') || line.includes('Succès') || line.includes('PASSED') || line.includes('validée')) {
            className += ' text-success';
        } else if (line.includes('WARNING') || line.includes('⚠️') || line.includes('warning') || line.includes('ATTENTION')) {
            className += ' text-warning';
        } else if (line.startsWith('--- [') || line.includes('Exécution de la commande')) {
            className += ' text-accent';
        }
        return `<div class="${className}">${escapeHtml(line)}</div>`;
    }).join('');

    consoleLogsContainer.innerHTML = formattedLines;
    
    // Auto-scroll en bas de la console
    consoleLogsContainer.scrollTop = consoleLogsContainer.scrollHeight;
}

// Permettre à l'utilisateur de cliquer sur une étape pour voir ses logs spécifiques
function displayLogsForStep(stepId) {
    // Si on clique sur la même étape déjà focalisée, on réinitialise sur les logs globaux
    if (activeLogsStep === stepId) {
        activeLogsStep = null;
        document.querySelectorAll('.step-card').forEach(c => c.classList.remove('focused'));
        fetchStatus(); // Re-calculer les logs complets
    } else {
        activeLogsStep = stepId;
        document.querySelectorAll('.step-card').forEach(c => {
            if (c.getAttribute('data-step') === stepId) {
                c.classList.add('focused');
            } else {
                c.classList.remove('focused');
            }
        });
        fetchStatus(); // Filtrer les logs sur l'étape
    }
}

// Mettre à jour le badge d'état global
function updateGlobalStatus(status) {
    globalStatusBadge.className = `status-badge ${status.toLowerCase()}`;
    const statusTextEl = globalStatusBadge.querySelector('.status-text');
    
    let text = 'En attente';
    if (status === 'RUNNING') text = 'En cours';
    else if (status === 'SUCCESS') text = 'Succès';
    else if (status === 'FAILED') text = 'Échec';
    
    statusTextEl.textContent = text;
}

// Afficher l'analyse IA de l'erreur
function displayAiAnalysis(markdownText) {
    aiPanel.classList.add('error-focus');

    let htmlContent;
    if (typeof marked !== 'undefined') {
        // Utiliser la librairie marked.js pour un rendu Markdown propre
        marked.setOptions({ breaks: true, gfm: true });
        htmlContent = marked.parse(markdownText);
    } else {
        // Fallback si marked.js n'est pas disponible
        htmlContent = parseMarkdownToHtml(markdownText);
    }
    aiAnalysisContent.innerHTML = `<div class="ai-diagnosis-rendered">${htmlContent}</div>`;
}

// Formateur de base pour le Markdown de Gemini
function parseMarkdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // 1. Échapper les chevrons HTML pour éviter les injections de script, sauf ceux qu'on va générer
    html = escapeHtml(html);

    // 2. Formater les blocs de code: ```bash ... ```
    // On capture le langage optionnel et le contenu
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
        return `<pre class="code-block-ai"><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // 3. Formater le code en ligne: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="code-inline-ai">$1</code>');

    // 4. Formater les titres ### ou #### ou ##
    html = html.replace(/^#### (.*?)$/gm, '<h4 class="title-h4">$1</h4>');
    html = html.replace(/^### (.*?)$/gm, '<h3 class="title-h3">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 class="title-h2">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 class="title-h1">$1</h1>');

    // 5. Formater le gras **texte**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 6. Formater l'italique *texte*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 7. Formater les citations de bloc: > texte
    html = html.replace(/^&gt;\s?(.*?)$/gm, '<blockquote>$1</blockquote>');

    // 8. Formater les listes à puces - ou *
    // Nous remplaçons d'abord les lignes de liste
    html = html.replace(/^\s*[\-\*]\s+(.*?)$/gm, '<li>$1</li>');

    // 9. Remplacer les retours à la ligne restants par des <br>
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        // Si c'est une balise bloc HTML qu'on vient de générer, on ne rajoute pas de br
        if (trimmed.startsWith('<h') || 
            trimmed.startsWith('<pre') || 
            trimmed.startsWith('</pre') || 
            trimmed.startsWith('<code') || 
            trimmed.startsWith('</code') || 
            trimmed.startsWith('<li') || 
            trimmed.startsWith('<blockquote') ||
            trimmed.startsWith('<blockquote>') ||
            trimmed.startsWith('</blockquote') ||
            trimmed.startsWith('<ul') ||
            trimmed.startsWith('</ul')) {
            return line;
        }
        return line + '<br>';
    });
    
    html = processedLines.join('\n');

    // Nettoyer les balises de listes consécutives <li> en les entourant de <ul>
    html = html.replace(/(<li>.*?<\/li>)+/gs, function(match) {
        return `<ul class="ai-list">${match}</ul>`;
    });

    return html;
}

// Outil utilitaire pour échapper le HTML
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
