"""
Feature encoding router — one-hot and label encoding.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.history import log_operation
from core.versioning import get_latest_version, load_version, save_version
from services.data_ops import encode_column, get_dataframe_info

router = APIRouter()


class EncodingRequest(BaseModel):
    dataset_id: str
    column: str
    method: str  # onehot | label


@router.post("/encoding")
def process_encoding(req: EncodingRequest):
    """Encode a categorical column using one-hot or label encoding."""
    try:
        version = get_latest_version(req.dataset_id)
        if version == 0:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        df = load_version(req.dataset_id, version)
        df = encode_column(df, req.column, req.method)
        new_ver = version + 1
        meta = save_version(df, req.dataset_id, new_ver)
        log_operation(
            req.dataset_id,
            new_ver,
            f"encoding_{req.method}",
            req.model_dump(),
            {"rows": meta["rows"], "columns": meta["columns"]},
        )
        info = get_dataframe_info(df)
        return {"success": True, "version": new_ver, **info}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
