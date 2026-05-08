FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY . .
RUN gradle installDist --no-daemon

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/build/install/chronicles .
EXPOSE 8080
CMD ["bin/chronicles"]
