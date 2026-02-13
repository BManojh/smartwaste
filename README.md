# Smart Waste Web App

This repo contains a simple web app for AI-driven waste classification and a smart collection demo with a clean API.

## Structure
- backend/: FastAPI server with image prediction and routing endpoints
- frontend/: React + Vite web UI

## Quick Start

### Backend
1) Create a virtual environment and install deps:
   - pip install -r backend/requirements.txt
2) Run the API:
   - uvicorn main:app --reload --app-dir backend

The API will run at http://localhost:8000

### Frontend
1) Install deps:
   - npm install
2) Start dev server:
   - npm run dev

The web app will run at http://localhost:5173

## Notes
- The backend attempts to load a TensorFlow model at `backend/models/waste_classifier.keras`.
- If the model file is missing, it falls back to demo predictions so the app still runs.

## Training
1) Prepare the dataset from the YOLO-style folder:
   - python backend/prepare_dataset.py
2) Run training:
   - python backend/train.py
