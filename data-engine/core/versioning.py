"""
Dataset versioning — saves/loads CSV snapshots keyed by dataset_id + version.
All snapshots are stored under datasets/<dataset_id>/v<N>.csv
"""
import os
import pandas as pd
from pathlib import Path

DATASETS_DIR = Path(__file__).parent.parent / "datasets"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)


def _dataset_dir(dataset_id: str) -> Path:
    path = DATASETS_DIR / dataset_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_version_path(dataset_id: str, version: int) -> Path:
    return _dataset_dir(dataset_id) / f"v{version}.csv"


def save_version(df: pd.DataFrame, dataset_id: str, version: int) -> dict:
    """Persist a DataFrame as a new version snapshot. Returns version metadata."""
    path = get_version_path(dataset_id, version)
    df.to_csv(path, index=False)
    return {
        "version": version,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "file_path": str(path),
    }


def load_version(dataset_id: str, version: int) -> pd.DataFrame:
    """Load a specific version snapshot as a DataFrame."""
    path = get_version_path(dataset_id, version)
    if not path.exists():
        raise FileNotFoundError(
            f"Version {version} not found for dataset '{dataset_id}'. "
            f"Please check the dataset_id and version number."
        )
    return pd.read_csv(path)


def get_latest_version(dataset_id: str) -> int:
    """Return the highest version number that exists for a dataset."""
    dataset_dir = DATASETS_DIR / dataset_id
    if not dataset_dir.exists():
        return 0
    versions = [
        int(f.stem[1:])
        for f in dataset_dir.glob("v*.csv")
        if f.stem[1:].isdigit()
    ]
    return max(versions) if versions else 0


def list_versions(dataset_id: str) -> list[int]:
    """Return sorted list of all existing version numbers for a dataset."""
    dataset_dir = DATASETS_DIR / dataset_id
    if not dataset_dir.exists():
        return []
    versions = [
        int(f.stem[1:])
        for f in dataset_dir.glob("v*.csv")
        if f.stem[1:].isdigit()
    ]
    return sorted(versions)
