"""
Rollback and history router — allows reverting to any prior version
and querying the full operation log.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from core.history import get_history, log_operation
from core.versioning import (
    get_latest_version,
    get_version_path,
    list_versions,
    load_version,
    save_version,
)
from services.data_ops import get_dataframe_info

router = APIRouter()


class RollbackRequest(BaseModel):
    dataset_id: str
    target_version: int


@router.post("/rollback")
def rollback(req: RollbackRequest):
    """
    Roll back to a previous version by loading that snapshot and saving it
    as a new version (preserving the full history chain).
    """
    try:
        available = list_versions(req.dataset_id)
        if not available:
            raise HTTPException(status_code=404, detail="Dataset not found.")
        if req.target_version not in available:
            raise HTTPException(
                status_code=400,
                detail=f"Version {req.target_version} does not exist. Available: {available}",
            )

        df = load_version(req.dataset_id, req.target_version)
        current = get_latest_version(req.dataset_id)
        new_ver = current + 1
        meta = save_version(df, req.dataset_id, new_ver)
        log_operation(
            req.dataset_id,
            new_ver,
            f"rollback_to_v{req.target_version}",
            {"target_version": req.target_version},
            {"rows": meta["rows"], "columns": meta["columns"]},
        )
        info = get_dataframe_info(df)
        return {
            "success": True,
            "version": new_ver,
            "rolled_back_to": req.target_version,
            **info,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{dataset_id}")
def get_dataset_history(dataset_id: str):
    """Return the full operation history for a dataset."""
    history = get_history(dataset_id)
    return {"dataset_id": dataset_id, "history": history}


@router.get("/version/{dataset_id}/{version}")
def get_version_preview(dataset_id: str, version: int):
    """Return a preview and info for a specific dataset version."""
    try:
        df = load_version(dataset_id, version)
        info = get_dataframe_info(df)
        return {"dataset_id": dataset_id, "version": version, **info}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/version/{dataset_id}/{version}/download")
def download_version(dataset_id: str, version: int):
    """Return the complete CSV file for a specific dataset version."""
    import os
    path = get_version_path(dataset_id, version)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    
    return FileResponse(
        path=path,
        media_type="text/csv",
        filename=f"dataset_{dataset_id}_v{version}.csv"
    )


@router.delete("/{dataset_id}/wipe")
async def wipe_dataset(dataset_id: str):
    """Physically deletes all physical snapshots and history for a dataset."""
    import shutil
    import os

    # 1. Delete history log (relative to project root)
    log_path = f"data/history/{dataset_id}.json"
    if os.path.exists(log_path):
        os.remove(log_path)

    # 2. Delete all versioned CSVs
    version_dir = f"data/versions/{dataset_id}"
    if os.path.exists(version_dir):
        shutil.rmtree(version_dir)

    return {"success": True, "dataset_id": dataset_id, "message": "Physical files wiped."}
