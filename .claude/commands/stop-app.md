Stop the Chronicles of Blood and Glory application gracefully.

Project root: /Users/sami.ahl/code/personal/blood-and-glory

## Steps

1. Stop the backend:
   Run `lsof -ti :8080` — kill any returned PIDs with `kill <pid>`.
   Confirm port 8080 is free afterwards.

2. Stop the frontend:
   Check ports 5173 and 5174 for a Vite process:
   Run `lsof -ti :5173 :5174` — kill any returned PIDs with `kill <pid>`.

3. Stop MongoDB:
   Run `docker-compose stop` from the project root
   (/Users/sami.ahl/code/personal/blood-and-glory).

4. Confirm everything is down:
   - Verify port 8080 is free: `lsof -ti :8080` returns nothing
   - Verify ports 5173/5174 are free: `lsof -ti :5173 :5174` returns nothing
   - Check Docker container status: `docker-compose ps`

5. Report what was stopped and confirm all services are down.
