"""
Outlier detection and removal router — supports IQR and Z-score methods.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.history import log_operation
from core.versioning import get_latest_version, load_version, save_version
from services.data_ops import get_dataframe_info, handle_outliers_iqr, handle_outliers_zscore

router = APIRouter()


class OutlierRequest(BaseModel):
    dataset_id: str
    column: str
    method: str = "iqr"       # iqr | zscore
    action: str = "remove"    # remove | cap
    threshold: float = Field(default=3.0, ge=0.5, le=10.0)


@router.post("/outliers")
def process_outliers(req: OutlierRequest):
    """Detect and handle outliers using IQR or Z-score method."""
    try:
        version = get_latest_version(req.dataset_id)
        if version == 0:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        df = load_version(req.dataset_id, version)
        original_len = len(df)

        if req.method == "iqr":
            df = handle_outliers_iqr(df, req.column, req.action)
        elif req.method == "zscore":
            df = handle_outliers_zscore(df, req.column, req.threshold, req.action)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown method: {req.method}")

        new_ver = version + 1
        meta = save_version(df, req.dataset_id, new_ver)
        log_operation(
            req.dataset_id,
            new_ver,
            f"outliers_{req.method}_{req.action}",
            req.model_dump(),
            {"rows": meta["rows"], "columns": meta["columns"]},
        )
        info = get_dataframe_info(df)
        return {
            "success": True,
            "version": new_ver,
            "rows_affected": original_len - len(df),
            **info,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
