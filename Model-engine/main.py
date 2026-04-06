from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import model

app = FastAPI(
    title="DataForge Model Engine",
    description="Machine Learning service for model training, evaluation, and prediction.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(model.router, prefix="/model", tags=["Model"])

@app.get("/")
def root():
    return {"status": "ok", "service": "model-engine", "port": 8001}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
