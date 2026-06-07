@echo off
TITLE Specentra AMS — Frontend Dev Server
color 0B

echo ============================================================
echo   Specentra AMS — Frontend (React + Vite)
echo   Stage 1 - File Explorer
echo ============================================================
echo.

cd /d "%~dp0frontend-build"

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 18+ from nodejs.org
    pause
    exit /b 1
)

:: Install dependencies
echo [1/2] Installing frontend dependencies...
call npm install -q

echo [2/2] Starting Vite dev server on http://localhost:5173
echo.
echo  Make sure the backend is also running on http://localhost:8000
echo.
echo  Press Ctrl+C to stop the server.
echo ============================================================

call npm run dev

pause
