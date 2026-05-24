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

echo [1/2] Starting Python backend...
start "PitWall Backend" cmd /k "cd backend_python && python main.py"

echo [2/2] Starting Electron overlay...
timeout /t 2 /nobreak >nul
start "PitWall Overlay" cmd /k "npx electron ."

echo.
echo PitWall is running. Close both windows to stop.
