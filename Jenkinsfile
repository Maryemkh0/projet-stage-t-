pipeline {
    agent any
    
    tools {
        maven 'Maven 3.8.8' // Assurez-vous que cet outil est configuré dans Jenkins sous Global Tool Configuration
        jdk 'JDK 17' // Idem, configuré dans Jenkins
    }
    
    environment {
        SONAR_HOST_URL = 'http://sonarqube:9000' // Adresse du serveur SonarQube dans docker-compose
        APP_PORT = '8081'
    }

    stages {
        stage('Checkout') {
            steps {
                // Checkout du code source
                echo 'Checking out source code...'
                // git 'https://github.com/votre-repo/cicd-ai-app.git'
            }
        }
        
        stage('Build & Unit Tests') {
            steps {
                echo 'Building and running tests...'
                sh './mvnw clean test'
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube static code analysis...'
                // Remplacez par le token généré dans SonarQube
                sh './mvnw sonar:sonar -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.login=admin -Dsonar.password=admin' 
            }
        }
        
        stage('Docker Build') {
            steps {
                echo 'Building Docker image...'
                sh 'docker build -t cicd-ai-app:latest .'
            }
        }
        
        stage('Deploy to Staging') {
            steps {
                echo 'Deploying to staging environment...'
                // Simulation du redémarrage du conteneur "app" dans le docker-compose
                sh 'docker compose restart app'
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed! Triggering AI Analysis...'
            // Appel du script IA en lui passant le lien du log Jenkins
            // Dans un vrai environnement, on passerait le paramètre ${BUILD_URL}/consoleText
            sh 'python3 ai/ai-analyzer.py "${BUILD_URL}"'
        }
    }
}
