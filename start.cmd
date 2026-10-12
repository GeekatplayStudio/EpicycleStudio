@echo off
rem EpicycleStudio — Windows: start the development server
cd /d "%~dp0"
if not exist node_modules call npm install
start "EpicycleStudio" cmd /c "npx vite --port 5173 --strictPort"
