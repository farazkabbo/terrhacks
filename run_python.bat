@echo off
REM TerraHacks Python Runner Script (Windows)
REM This script activates the virtual environment and runs Python scripts

echo 🚀 TerraHacks Python Runner
echo ================================

REM Project root directory
set PROJECT_ROOT=%~dp0

REM Check if virtual environment exists
if not exist "%PROJECT_ROOT%.venv" (
    echo ❌ Virtual environment not found at %PROJECT_ROOT%.venv
    echo Please create a virtual environment first.
    pause
    exit /b 1
)

REM Change to project directory
cd /d "%PROJECT_ROOT%"

REM Activate virtual environment
echo ✅ Activating virtual environment...
call .venv\Scripts\activate.bat

REM Check Python version
echo ✅ Python version:
python --version

REM If no arguments provided, show help
if "%1"=="" (
    echo Usage:
    echo   run_python.bat ^<script_path^>           # Run a specific Python script
    echo   run_python.bat fastapi                 # Start FastAPI server
    echo   run_python.bat gait                    # Run gait detection main.py
    echo   run_python.bat gait-video              # Run gait detection video.py
    echo.
    echo Examples:
    echo   run_python.bat Backend\main.py
    echo   run_python.bat "Backend\Gait Detection\main.py"
    echo   run_python.bat fastapi
    echo   run_python.bat gait
    pause
    exit /b 0
)

REM Handle special commands
if "%1"=="fastapi" (
    echo 🌐 Starting FastAPI server...
    uvicorn Backend.main:app --host 0.0.0.0 --port 8000 --reload
    goto :end
)

if "%1"=="gait" (
    echo 🚶 Running gait detection main.py...
    cd "Backend\Gait Detection"
    python main.py
    goto :end
)

if "%1"=="gait-video" (
    echo 🎥 Running gait detection video.py...
    cd "Backend\Gait Detection"
    python video.py
    goto :end
)

REM Run the specified Python script
echo 🐍 Running: %1
python "%1"

:end
echo ✅ Script completed.
pause
