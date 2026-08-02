# syntax=docker/dockerfile:1.7

FROM eclipse-temurin:17-jre-alpine

ARG H2_VERSION=2.4.240

RUN addgroup -S h2 && \
    adduser -S -G h2 -h /data h2 && \
    mkdir -p /opt/h2 /data && \
    chown -R h2:h2 /data

ADD --checksum=sha256:29b70e427cc1c40cdc376283adbb0cc62853073797bb5fe5761f81fe73d57ce0 \
    https://repo.maven.apache.org/maven2/com/h2database/h2/${H2_VERSION}/h2-${H2_VERSION}.jar \
    /opt/h2/h2.jar

RUN chmod 0444 /opt/h2/h2.jar

USER h2
WORKDIR /data
EXPOSE 9092

HEALTHCHECK --interval=5s --timeout=5s --start-period=5s --retries=12 \
    CMD ["java", "-cp", "/opt/h2/h2.jar", "org.h2.tools.Shell", "-url", "jdbc:h2:tcp://127.0.0.1:9092/dicegame", "-user", "sa", "-password", "", "-sql", "SELECT 1"]

STOPSIGNAL SIGTERM

ENTRYPOINT ["java", "-cp", "/opt/h2/h2.jar", "org.h2.tools.Server", "-tcp", "-tcpAllowOthers", "-tcpPort", "9092", "-ifNotExists", "-baseDir", "/data", "-properties", "null"]
