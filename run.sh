#!/bin/bash
# CarePulse AI - One-Click Launch Script
# MINEARENA 1.0 - Team #1CodeRangers - Problem PS-03

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "          CAREPULSE AI - SYSTEM STARTUP                   "
echo "  Problem PS-03: Personalized Deterioration Monitor       "
echo "=========================================================="

# Check virtual environment
if [ ! -f "venv/bin/python3" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install fastapi uvicorn pydantic requests numpy websockets
fi

# Build frontend if dist doesn't exist
if [ ! -d "frontend/dist" ]; then
    echo "Building React frontend..."
    cd frontend && npm install && npm run build && cd ..
fi

echo ""
echo "🚀 Starting CarePulse AI Unified Server on http://localhost:8000"
echo "   - FHIR R4 Ingestion API: http://localhost:8000/fhir/Observation"
echo "   - Interactive Clinician Dashboard: http://localhost:8000"
echo "   - Live WebSocket Feed: ws://localhost:8000/ws/telemetry"
echo "   - Benchmark API: http://localhost:8000/api/benchmark"
echo ""
echo "Press Ctrl+C to stop."
echo "=========================================================="

./venv/bin/python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
