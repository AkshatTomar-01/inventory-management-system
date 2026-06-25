@echo off
echo Stopping Inventory Management System...
cd /d "%~dp0"
docker compose down
echo Stopped.
pause
