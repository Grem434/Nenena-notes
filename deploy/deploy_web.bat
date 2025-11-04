@echo off
echo === Compilando frontend local ===
cd ..\apps\web
npm run build

echo === Construyendo y levantando contenedores ===
cd ..\deploy
docker compose --env-file env\.env.dev -f compose.yml build web
docker compose --env-file env\.env.dev -f compose.yml up -d nginx

echo === ¡Nenena Notes desplegada correctamente! ===
pause
