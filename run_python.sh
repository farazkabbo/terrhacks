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
if source "$PROJECT_ROOT/.venv/bin/activate"; then
    echo -e "${GREEN}✅ Virtual environment activated successfully${NC}"
else
    echo -e "${RED}❌ Failed to activate virtual environment${NC}"
    exit 1
fi

# Check Python version
echo -e "${GREEN}✅ Python version: $(python --version)${NC}"
echo -e "${GREEN}✅ Python path: $(which python)${NC}"

# If no arguments provided, show help
if [ $# -eq 0 ]; then
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./run_python.sh <script_path>           # Run a specific Python script"
    echo "  ./run_python.sh fastapi                 # Start FastAPI server"
    echo "  ./run_python.sh gait                    # Run gait detection main.py"
    echo "  ./run_python.sh gait-video              # Run gait detection video.py"
    echo "  ./run_python.sh start-backend           # Start FastAPI server (alias)"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  ./run_python.sh Backend/main.py"
    echo "  ./run_python.sh Backend/Gait\ Detection/main.py"
    echo "  ./run_python.sh fastapi"
    echo "  ./run_python.sh gait"
    echo "  ./run_python.sh start-backend"
    exit 0
fi

# Handle special commands
case "$1" in
    "fastapi"|"start-backend")
        echo -e "${GREEN}🌐 Starting FastAPI server...${NC}"
        cd "$PROJECT_ROOT/Backend"
        if [ -f "main.py" ]; then
            uvicorn main:app --host 0.0.0.0 --port 8000 --reload
        else
            echo -e "${RED}❌ main.py not found in Backend directory${NC}"
            exit 1
        fi
        ;;
    "gait")
        echo -e "${GREEN}🚶 Running gait detection main.py...${NC}"
        GAIT_DIR="$PROJECT_ROOT/Backend/Gait Detection"
        if [ -d "$GAIT_DIR" ] && [ -f "$GAIT_DIR/main.py" ]; then
            cd "$GAIT_DIR"
            python main.py
        else
            echo -e "${RED}❌ Gait Detection/main.py not found${NC}"
            exit 1
        fi
        ;;
    "gait-video")
        echo -e "${GREEN}🎥 Running gait detection video.py...${NC}"
        GAIT_DIR="$PROJECT_ROOT/Backend/Gait Detection"
        if [ -d "$GAIT_DIR" ] && [ -f "$GAIT_DIR/video.py" ]; then
            cd "$GAIT_DIR"
            python video.py
        else
            echo -e "${RED}❌ Gait Detection/video.py not found${NC}"
            exit 1
        fi
        ;;
    *)
        # Run the specified Python script
        echo -e "${GREEN}🐍 Running: $1${NC}"
        if [[ "$1" == *"/"* ]]; then
            # If path contains directory, extract directory and filename
            SCRIPT_DIR=$(dirname "$1")
            SCRIPT_FILE=$(basename "$1")
            FULL_SCRIPT_PATH="$PROJECT_ROOT/$SCRIPT_DIR/$SCRIPT_FILE"
            if [ -f "$FULL_SCRIPT_PATH" ]; then
                cd "$PROJECT_ROOT/$SCRIPT_DIR"
                python "$SCRIPT_FILE"
            else
                echo -e "${RED}❌ Script not found: $FULL_SCRIPT_PATH${NC}"
                exit 1
            fi
        else
            # Simple filename, run from project root
            FULL_SCRIPT_PATH="$PROJECT_ROOT/$1"
            if [ -f "$FULL_SCRIPT_PATH" ]; then
                cd "$PROJECT_ROOT"
                python "$1"
            else
                echo -e "${RED}❌ Script not found: $FULL_SCRIPT_PATH${NC}"
                exit 1
            fi
        fi
        ;;
esac

echo -e "${GREEN}✅ Script completed.${NC}"
