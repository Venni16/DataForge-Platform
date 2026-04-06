import os
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from core.modeling import (
    train_and_save_model, 
    get_models, 
    generate_evaluation_plots, 
    predict_data,
    get_model_dir
)

router = APIRouter()

class TrainRequest(BaseModel):
    dataset_id: str
    version_id: Optional[int] = None
    target_column: str
    feature_columns: Optional[List[str]] = None
    task_type: str = "classification"  # classification or regression
    algorithm: str
    test_size: float = 0.2
    random_state: int = 42
    hyperparameters: Optional[Dict[str, Any]] = None

@router.post("/train")
def train_model(req: TrainRequest):
    try:
        res = train_and_save_model(req)
        return {"status": "success", "model": res}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
def list_models(dataset_id: str):
    try:
        return {"models": get_models(dataset_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{model_id}")
def get_model(dataset_id: str, model_id: str):
    # This requires dataset_id in the query because of our storage structure
    try:
        models = get_models(dataset_id)
        for m in models:
            if m["model_id"] == model_id: return m
        raise HTTPException(status_code=404, detail="Model not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{model_id}")
def delete_model(dataset_id: str, model_id: str):
    try:
        mdir = get_model_dir(dataset_id)
        pkl = mdir / f"{model_id}.pkl"
        json_f = mdir / f"{model_id}.json"
        if pkl.exists(): pkl.unlink()
        if json_f.exists(): json_f.unlink()
        return {"status": "deleted", "model_id": model_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class EvaluateRequest(BaseModel):
    dataset_id: str
    model_id: str

@router.post("/evaluate")
def evaluate_model(req: EvaluateRequest):
    try:
        plots = generate_evaluation_plots(req.dataset_id, req.model_id)
        return {"status": "success", "plots": plots}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PredictRequest(BaseModel):
    dataset_id: str
    model_id: str
    data: List[Dict[str, Any]]

@router.post("/predict")
def predict(req: PredictRequest):
    try:
        result = predict_data(req.dataset_id, req.model_id, req.data)
        return {"status": "success", "predictions": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
