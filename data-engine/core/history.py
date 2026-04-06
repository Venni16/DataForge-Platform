"""
Operation history logger — appends transformation records to a per-dataset JSON log.
"""
import json
from pathlib import Path
from datetime import datetime, timezone

DATASETS_DIR = Path(__file__).parent.parent / "datasets"


def _history_file(dataset_id: str) -> Path:
    path = DATASETS_DIR / dataset_id
    path.mkdir(parents=True, exist_ok=True)
    return path / "history.json"


def log_operation(
    dataset_id: str,
    version: int,
    operation: str,
    parameters: dict,
    shape: dict,
) -> None:
    """Append a new operation record to the dataset's history log."""
    hf = _history_file(dataset_id)
    history: list = []
    if hf.exists():
        with open(hf, "r", encoding="utf-8") as f:
            history = json.load(f)

    history.append(
        {
            "id": len(history) + 1,
            "version": version,
            "operation": operation,
            "parameters": parameters,
            "shape": shape,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    with open(hf, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, default=str)


def get_history(dataset_id: str) -> list:
    """Return the full operation history for a dataset."""
    hf = _history_file(dataset_id)
    if not hf.exists():
        return []
    with open(hf, "r", encoding="utf-8") as f:
        return json.load(f)
