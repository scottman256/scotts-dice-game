# syntax=docker/dockerfile:1.7

FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /workspace

COPY gradlew gradlew.bat build.gradle settings.gradle gradle.properties ./
COPY gradle ./gradle
RUN chmod +x gradlew

COPY src ./src
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon bootJar && \
    find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' -exec cp {} /workspace/app.jar \;

FROM eclipse-temurin:17-jre-alpine AS runtime

RUN addgroup -S dice && \
    adduser -S -G dice -h /app dice

WORKDIR /app

COPY --from=build --chown=dice:dice /workspace/app.jar ./app.jar

USER dice
EXPOSE 8080

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=10 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/api/public/status || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
