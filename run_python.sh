#!/bin/bash

# TerraHacks Python Runner Script
# This script activates the virtual environment and runs Python scripts

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="/Users/ammarfaisal/Desktop/Programming/terrhacks"

echo -e "${BLUE}🚀 TerraHacks Python Runner${NC}"
echo -e "${BLUE}================================${NC}"

# Check if virtual environment exists
if [ ! -d "$PROJECT_ROOT/.venv" ]; then
    echo -e "${RED}❌ Virtual environment not found at $PROJECT_ROOT/.venv${NC}"
    echo "Please create a virtual environment first."
    exit 1
fi

# Change to project directory
cd "$PROJECT_ROOT"

# Activate virtual environment
echo -e "${GREEN}✅ Activating virtual environment...${NC}"
source .venv/bin/activate

# Check Python version
echo -e "${GREEN}✅ Python version: $(python --version)${NC}"

# If no arguments provided, show help
if [ $# -eq 0 ]; then
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./run_python.sh <script_path>           # Run a specific Python script"
    echo "  ./run_python.sh fastapi                 # Start FastAPI server"
    echo "  ./run_python.sh gait                    # Run gait detection main.py"
    echo "  ./run_python.sh gait-video              # Run gait detection video.py"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  ./run_python.sh Backend/main.py"
    echo "  ./run_python.sh Backend/Gait\ Detection/main.py"
    echo "  ./run_python.sh fastapi"
    echo "  ./run_python.sh gait"
    exit 0
fi

# Handle special commands
case "$1" in
    "fastapi")
        echo -e "${GREEN}🌐 Starting FastAPI server...${NC}"
        uvicorn Backend.main:app --host 0.0.0.0 --port 8000 --reload
        ;;
    "gait")
        echo -e "${GREEN}🚶 Running gait detection main.py...${NC}"
        cd "Backend/Gait Detection"
        python main.py
        ;;
    "gait-video")
        echo -e "${GREEN}🎥 Running gait detection video.py...${NC}"
        cd "Backend/Gait Detection"
        python video.py
        ;;
    *)
        # Run the specified Python script
        echo -e "${GREEN}🐍 Running: $1${NC}"
        python "$1"
        ;;
esac

echo -e "${GREEN}✅ Script completed.${NC}"
