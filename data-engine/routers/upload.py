"""
Upload router — receives a CSV/XLSX file, saves it as version 1, returns dataset info.
"""
import io
import uuid

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.history import log_operation
from core.versioning import save_version
from services.data_ops import get_dataframe_info

router = APIRouter()


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_id: str = Form(default=None),
):
    """
    Upload a CSV or XLSX dataset.
    Optionally supply a dataset_id; one is generated if omitted.
    Returns dataset metadata + first-10-row preview.
    """
    try:
        contents = await file.read()
        fname = file.filename or ""

        if fname.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents))
        elif fname.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            # Try CSV by default
            try:
                df = pd.read_csv(io.BytesIO(contents))
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file format. Please upload a CSV or Excel file.",
                )

        did = dataset_id or str(uuid.uuid4())
        meta = save_version(df, did, 1)
        log_operation(
            did, 1, "upload", {"filename": fname}, {"rows": meta["rows"], "columns": meta["columns"]}
        )
        info = get_dataframe_info(df)
        return {"dataset_id": did, "version": 1, **info}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
