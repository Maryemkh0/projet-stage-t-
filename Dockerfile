# Image légère JRE uniquement — le JAR est copié depuis le build local
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copie du JAR pré-buildé localement
COPY target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]