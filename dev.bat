@echo off
echo ============================================
echo   AI Tuner - DEV MODE (Hot Reload)
echo ============================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [!] Node modules not found. Running npm install...
    call npm install
    echo.
)

:: Check if Python deps are likely installed
pip show websockets >nul 2>&1
if errorlevel 1 (
    echo [!] Installing Python dependencies...
    pip install -r backend_python\requirements.txt
    echo.
)

echo [*] Starting Vite dev server + Electron (hot reload enabled)...
echo     UI changes will reflect instantly without restart.
echo.

:: Start Vite dev server in background, then launch Electron
start "" /B npx vite --host 2>nul
timeout /t 3 /nobreak >nul
set VITE_DEV_SERVER=1
npx electron .
