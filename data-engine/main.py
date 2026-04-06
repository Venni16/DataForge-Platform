from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, missing, outliers, encoding, scaling, visualize, rollback

app = FastAPI(
    title="DataPrep Pro — Data Engine",
    description="ML data preprocessing and visualization microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, tags=["Upload"])
app.include_router(missing.router, prefix="/process", tags=["Processing"])
app.include_router(outliers.router, prefix="/process", tags=["Processing"])
app.include_router(encoding.router, prefix="/process", tags=["Processing"])
app.include_router(scaling.router, prefix="/process", tags=["Processing"])
app.include_router(visualize.router, tags=["Visualization"])
app.include_router(rollback.router, tags=["History & Rollback"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "data-engine", "version": "1.0.0"}
