@echo off
echo ============================================
echo   PitWall - Windows Installer Build
echo ============================================
echo.

:: Check prerequisites
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [1/4] Installing dependencies...
    call npm install
) else (
    echo [1/4] Dependencies already installed.
)

:: Build the Vite frontend
echo [2/4] Building React frontend...
call npx vite build
if errorlevel 1 (
    echo [ERROR] Vite build failed!
    pause
    exit /b 1
)

:: Bundle Python backend with PyInstaller
echo [3/4] Bundling Python backend...
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo        Installing PyInstaller...
    pip install pyinstaller
)

pyinstaller --noconfirm --onedir --console ^
    --name "pitwall-backend" ^
    --distpath "dist\python" ^
    --workpath "build\pyinstaller" ^
    --specpath "build" ^
    --add-data "backend_python\config.json;." ^
    --add-data "backend_python\car_memory.json;." ^
    backend_python\main.py

if errorlevel 1 (
    echo [ERROR] PyInstaller build failed!
    pause
    exit /b 1
)

:: Build Electron installer with electron-builder
echo [4/4] Building Electron installer...
call npx electron-builder --win nsis
if errorlevel 1 (
    echo [ERROR] Electron builder failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Build Complete!
echo   Installer: dist\pitwall-overlay Setup*.exe
echo   Python:    dist\python\pitwall-backend\
echo ============================================
pause
