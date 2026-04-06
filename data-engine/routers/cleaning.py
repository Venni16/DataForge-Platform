from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.history import log_operation
from core.versioning import get_latest_version, load_version, save_version
from services.data_ops import get_dataframe_info

router = APIRouter()

class DropColumnRequest(BaseModel):
    dataset_id: str
    column: str

@router.post("/drop_column")
def drop_column(req: DropColumnRequest):
    """Drop an entire column from the dataset."""
    try:
        version = get_latest_version(req.dataset_id)
        if version == 0:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        df = load_version(req.dataset_id, version)
        
        if req.column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column {req.column} not found.")
            
        df = df.drop(columns=[req.column])
        
        new_ver = version + 1
        meta = save_version(df, req.dataset_id, new_ver)
        log_operation(
            req.dataset_id,
            new_ver,
            "drop_column",
            req.model_dump(),
            {"rows": meta["rows"], "columns": meta["columns"]},
        )
        info = get_dataframe_info(df)
        return {"success": True, "version": new_ver, **info}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
