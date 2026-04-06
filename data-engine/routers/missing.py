"""
Missing values router — handles null imputation and column/row drops.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.history import log_operation
from core.versioning import get_latest_version, load_version, save_version
from services.data_ops import get_dataframe_info, handle_missing, remove_duplicates

router = APIRouter()


class MissingRequest(BaseModel):
    dataset_id: str
    column: str
    method: str  # mean | median | mode | knn | iterative | custom | drop_rows | drop_column
    value: Optional[str] = None


class BatchItem(BaseModel):
    column: str
    method: str
    value: Optional[str] = None


class BatchMissingRequest(BaseModel):
    dataset_id: str
    operations: list[BatchItem]


class DuplicateRequest(BaseModel):
    dataset_id: str


@router.post("/missing")
def process_missing(req: MissingRequest):
    """Apply a missing-value strategy to a single column."""
    try:
        version = get_latest_version(req.dataset_id)
        if version == 0:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        df = load_version(req.dataset_id, version)
        df = handle_missing(df, req.column, req.method, req.value)
        new_ver = version + 1
        meta = save_version(df, req.dataset_id, new_ver)
        log_operation(
            req.dataset_id,
            new_ver,
            "handle_missing",
            req.model_dump(),
            {"rows": meta["rows"], "columns": meta["columns"]},
        )
        info = get_dataframe_info(df)
        return {"success": True, "version": new_ver, **info}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/missing/batch")
def process_missing_batch(req: BatchMissingRequest):
    """Apply multiple missing-value strategies in one operation."""
    try:
        version = get_latest_version(req.dataset_id)
        if version == 0:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        df = load_version(req.dataset_id, version)
        # Convert Pydantic list of objects to list of dicts for the service
        ops = [item.model_dump() for item in req.operations]
        
        from services.data_ops import handle_missing_batch
        df = handle_missing_batch(df, ops)
        
        new_ver = version + 1
        meta = save_version(df, req.dataset_id, new_ver)
        log_operation(
            req.dataset_id,
            new_ver,
            "handle_missing_batch",
            req.model_dump(),
            {"rows": meta["rows"], "columns": meta["columns"]},
        )
        info = get_dataframe_info(df)
        return {"success": True, "version": new_ver, **info}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/duplicates")
def process_duplicates(req: DuplicateRequest):
    """Remove duplicate rows from the current dataset version."""
    try:
        version = get_latest_version(req.dataset_id)
        if version == 0:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        df = load_version(req.dataset_id, version)
        original_len = len(df)
        df = remove_duplicates(df)
        removed = original_len - len(df)
        new_ver = version + 1
        meta = save_version(df, req.dataset_id, new_ver)
        log_operation(
            req.dataset_id,
            new_ver,
            "remove_duplicates",
            {"rows_removed": removed},
            {"rows": meta["rows"], "columns": meta["columns"]},
        )
        info = get_dataframe_info(df)
        return {"success": True, "version": new_ver, "rows_removed": removed, **info}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
