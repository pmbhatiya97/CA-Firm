#!/bin/bash
# Specentra AMS — Start both servers (Linux/Mac)
set -e

echo "============================================================"
echo "  Specentra AMS — Stage 1 File Explorer"
echo "============================================================"

# Backend
echo "[Backend] Installing Python dependencies..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt -q
mkdir -p uploads

echo "[Backend] Starting FastAPI on http://localhost:8000 ..."
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Give backend a moment to start
sleep 2

# Frontend
echo "[Frontend] Installing Node dependencies..."
cd "$(dirname "$0")/frontend-build"
npm install -q

echo "[Frontend] Starting Vite on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "============================================================"
echo "  Both servers running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/api/docs"
echo ""
echo "  Login: admin@specentra.com / Admin@123"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "============================================================"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
