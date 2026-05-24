@echo off
echo ============================================
echo   PitWall - AI Race Engineer Overlay
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

:: Build frontend if dist doesn't exist or is outdated
echo [*] Building frontend...
call npx vite build
echo.

echo [*] Launching PitWall (backend starts automatically)...
npx electron .
