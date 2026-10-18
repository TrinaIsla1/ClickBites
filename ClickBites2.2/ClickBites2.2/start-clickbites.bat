@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
start "ClickBites API" cmd /k "npm run server"
start "ClickBites Web" cmd /k "npm run dev"
echo ClickBites is starting...
