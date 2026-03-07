Start the Chronicles of Blood and Glory application locally.

Project root: /Users/sami.ahl/code/personal/blood-and-glory
JAVA_HOME: /opt/homebrew/Cellar/openjdk@21/21.0.10/libexec/openjdk.jdk/Contents/Home

## Steps

1. Start MongoDB:
   Run `docker-compose up -d` from the project root.

2. Clear port 8080 if occupied:
   Run `lsof -ti :8080` — if any PID is returned, kill it with `kill <pid>`.
   Wait 1 second after killing.

3. Start the backend in the background:
   ```
   JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.10/libexec/openjdk.jdk/Contents/Home \
     /Users/sami.ahl/code/personal/blood-and-glory/backend/gradlew run \
     -p /Users/sami.ahl/code/personal/blood-and-glory/backend
   ```
   Run this as a background task.

4. Start the frontend in the background:
   ```
   npm --prefix /Users/sami.ahl/code/personal/blood-and-glory/frontend run dev
   ```
   Run this as a background task.

5. Wait 20 seconds, then tail the backend output to confirm
   "Application started" appears. Also tail the frontend output to find
   which port Vite is serving on (5173 or the next available).

6. Report:
   - MongoDB status
   - Backend status (started / error)
   - Frontend URL (exact port from Vite output)
   - Any errors encountered
