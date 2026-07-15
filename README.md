# 🚀 CODIX DevOps — Plateforme CI/CD Intelligente avec Analyse IA

> **Projet de stage CODIX** — Conception et développement d'une plateforme d'automatisation CI/CD avec assistance IA pour l'analyse des erreurs de déploiement.

---

## 🎯 Objectif du Projet

Créer une mini-application Java Spring Boot et construire une chaîne DevOps qui automatise l'intégralité du cycle de livraison logicielle, avec la **touche IA** : analyser les logs d'échec, expliquer les erreurs en langage simple et proposer des solutions concrètes.

---

## 🏗️ Architecture du Pipeline

```
[Compilation] → [Tests] → [SonarQube] → [Docker Build] → [Déploiement] → [Surveillance]
      ↓               ↓           ↓              ↓                ↓               ↓
                     IA intervient en cas d'échec à chaque étape
```

| Étape | Outil | Description |
|---|---|---|
| **Compilation** | Maven (`mvnw clean compile`) | Compilation du code source Java |
| **Tests** | JUnit 5 (`mvnw test`) | Exécution des tests unitaires |
| **Analyse qualité** | SonarQube / Mock | Vérification des standards de code |
| **Docker Build** | Docker (`docker build`) | Création de l'image de l'application |
| **Déploiement** | Docker (`docker run`) | Déploiement sur le port 8081 |
| **Surveillance** | Spring Actuator | Healthcheck `/actuator/health` |

---

## 🤖 La Touche IA : Analyse Intelligente des Erreurs

En cas d'échec à **n'importe quelle étape**, le système :

1. **Capture les logs** d'erreur complets
2. **Envoie à l'API Gemini** de Google un prompt structuré en français
3. **Affiche un diagnostic** structuré avec :
   - Le **type d'erreur** identifié
   - Une **explication** claire en langage naturel
   - Des **solutions concrètes** et actionnables

> Sans clé API Gemini, un **moteur de diagnostic local** basé sur des règles prend le relais automatiquement.

---

## 🛠️ Stack Technique

| Composant | Technologie |
|---|---|
| **Backend** | Java 17, Spring Boot 4.0, Spring Web MVC |
| **Surveillance** | Spring Boot Actuator |
| **Build** | Apache Maven (Maven Wrapper) |
| **Conteneurisation** | Docker (image `eclipse-temurin:17-jre-alpine`) |
| **Qualité code** | SonarQube (community) |
| **IA** | Google Gemini 1.5 Flash API |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla), marked.js |

---

## 🚀 Démarrage Rapide

### Prérequis
- Java 17+
- Docker Desktop (démarré)
- Maven (ou utiliser `mvnw`)

### Lancer l'application localement

```bash
# Cloner le dépôt
git clone https://github.com/<votre-username>/cicd-ai-app.git
cd cicd-ai-app

# Lancer avec Maven Wrapper
./mvnw spring-boot:run
```

L'application est accessible sur **http://localhost:8080**

### Configurer la clé API Gemini (optionnel)

Créer un fichier `.env` à la racine du projet :
```
GEMINI_API_KEY=AIzaSy...votre_clé
```

Ou configurer directement depuis l'interface web via le bouton **"Clé Gemini API"**.

> Obtenir une clé gratuite sur [Google AI Studio](https://aistudio.google.com/)

---

## 📁 Structure du Projet

```
cicd-ai-app/
├── src/
│   ├── main/
│   │   ├── java/com/codix/cicdai/cicd_ai_app/
│   │   │   ├── CicdAiAppApplication.java      # Point d'entrée Spring Boot
│   │   │   ├── controller/
│   │   │   │   └── PipelineController.java    # API REST (/api/pipeline/*)
│   │   │   ├── model/
│   │   │   │   ├── PipelineStatus.java        # Énumération des statuts
│   │   │   │   ├── PipelineStep.java          # Énumération des étapes
│   │   │   │   └── StepExecution.java         # Modèle d'exécution d'étape
│   │   │   └── service/
│   │   │       ├── PipelineService.java       # Logique d'exécution du pipeline
│   │   │       └── AiAnalysisService.java     # Intégration API Gemini
│   │   └── resources/
│   │       ├── application.properties         # Configuration Spring Boot
│   │       └── static/                        # Interface Web
│   │           ├── index.html                 # Dashboard principal
│   │           ├── style.css                  # Design system (dark/neon)
│   │           └── app.js                     # Logique frontend (polling, UI)
│   └── test/
│       └── java/...                           # Tests unitaires JUnit
├── Dockerfile                                 # Image Docker multi-étapes
├── .dockerignore
└── pom.xml                                    # Dépendances Maven
```

---

## 🌐 API REST

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/pipeline/run` | Démarre le pipeline |
| `POST` | `/api/pipeline/reset` | Réinitialise le pipeline |
| `GET` | `/api/pipeline/status` | Statut en temps réel |
| `GET` | `/api/pipeline/config` | Lire la configuration |
| `POST` | `/api/pipeline/config` | Mettre à jour la configuration |
| `GET` | `/actuator/health` | Santé de l'application |

---

## 🎮 Fonctionnalités du Dashboard

- **Console de Contrôle** : Lancer/Réinitialiser le pipeline
- **Simulateur d'Incidents** : Forcer des échecs à chaque étape pour tester l'IA
  - Échec Compilation (injection de code Java invalide)
  - Échec Tests (injection d'un test JUnit défaillant)
  - Échec SonarQube (connexion à un serveur inexistant)
  - Échec Docker Build (Dockerfile défaillant)
  - Échec Déploiement (flags Docker invalides)
  - Échec Surveillance (arrêt prématuré du conteneur)
- **Pipeline Flow** : Visualisation en temps réel de chaque étape
- **Console de Sortie** : Logs colorés avec filtrage par étape (clic)
- **Assistant Diagnostic IA** : Affichage structuré en Markdown

---

## 🏢 Valeur ajoutée pour CODIX

Les équipes de développement utilisent des pipelines CI/CD quotidiennement. Un outil qui :
- **Réduit le temps de diagnostic** des erreurs de 60%+
- **Explique les erreurs** en français simple aux développeurs juniors
- **Propose des solutions** actionnables immédiatement
- **Simule des incidents** pour la formation DevOps

peut transformer l'expérience développeur et accélérer les livraisons logicielles.

---

## 👩‍💻 Auteur

Projet réalisé dans le cadre d'un **stage DevOps chez CODIX** — 2026

---

*Développé avec ❤️ et ☕ — Stack: Java • Spring Boot • Docker • Google Gemini AI*
