"""
Feature scaling router — MinMax and Standard scaling.
"""
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.history import log_operation
from core.versioning import get_latest_version, load_version, save_version
from services.data_ops import get_dataframe_info, scale_columns

router = APIRouter()


class ScalingRequest(BaseModel):
    dataset_id: str
    columns: List[str]
    method: str  # minmax | standard


@router.post("/scaling")
def process_scaling(req: ScalingRequest):
    """Scale one or more numeric columns with MinMax or StandardScaler."""
    try:
        version = get_latest_version(req.dataset_id)
        if version == 0:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        df = load_version(req.dataset_id, version)
        df = scale_columns(df, req.columns, req.method)
        new_ver = version + 1
        meta = save_version(df, req.dataset_id, new_ver)
        log_operation(
            req.dataset_id,
            new_ver,
            f"scaling_{req.method}",
            req.model_dump(),
            {"rows": meta["rows"], "columns": meta["columns"]},
        )
        info = get_dataframe_info(df)
        return {"success": True, "version": new_ver, **info}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
