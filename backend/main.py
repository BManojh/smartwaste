import inspect

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.model import predict as predict_image
from backend.routing import BinPoint, compute_route

app = FastAPI(title="Smart Waste API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BinRequest(BaseModel):
    bin_id: str = Field(..., alias="id")
    x: float
    y: float
    fill: int


class RouteRequest(BaseModel):
    bins: list[BinRequest]
    threshold: int = 80


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict:
    image_bytes = await file.read()
    prediction = predict_image(image_bytes)
    if inspect.iscoroutine(prediction):
        prediction = await prediction
    return {
        "filename": file.filename,
        "category": prediction.category,
        "confidence": prediction.confidence,
        "mode": prediction.mode,
    }


@app.post("/route")
def route(request: RouteRequest) -> dict:
    bin_points = [
        BinPoint(bin_id=item.bin_id, x=item.x, y=item.y, fill=item.fill)
        for item in request.bins
    ]
    result = compute_route(bin_points, request.threshold)
    return {
        "selectedBins": [item.bin_id for item in result.selected_bins],
        "route": result.route,
        "totalDistance": result.total_distance,
        "threshold": request.threshold,
    }
