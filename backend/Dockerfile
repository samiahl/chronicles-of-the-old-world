# Stage 1: Build
FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY . .
RUN gradle installDist --no-daemon

# Download Application Insights Java agent during build so the run image stays lean
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/* \
    && wget -q -O applicationinsights-agent.jar \
       "https://github.com/microsoft/ApplicationInsights-Java/releases/download/3.5.4/applicationinsights-agent-3.5.4.jar"

# Stage 2: Run
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/build/install/chronicles .
COPY --from=build /app/applicationinsights-agent.jar lib/applicationinsights-agent.jar

# Agent activates automatically when APPLICATIONINSIGHTS_CONNECTION_STRING is set.
# If the env var is absent (local dev) it logs one warning and does nothing.
ENV JAVA_TOOL_OPTIONS="-javaagent:/app/lib/applicationinsights-agent.jar"

EXPOSE 8080
CMD ["bin/chronicles"]
