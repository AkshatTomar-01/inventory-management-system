@echo off
echo Starting Inventory Management System...
cd /d "%~dp0"
docker compose up -d
echo.
echo App is running!
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/api/v1/docs
echo.
start http://localhost:3000
pause
