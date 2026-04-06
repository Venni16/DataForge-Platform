"""
Core pandas/sklearn data operations used by all routers.
Each function accepts a DataFrame and returns a transformed copy — never mutates in place.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, MinMaxScaler, StandardScaler


# ── Dataset Info ──────────────────────────────────────────────────────────────

def get_dataframe_info(df: pd.DataFrame) -> dict:
    """Return shape, dtypes, missing counts, and describe stats for a DataFrame."""
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    return {
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "columns": list(df.columns),
        "dtypes": {col: str(df[col].dtype) for col in df.columns},
        "missing": {col: int(df[col].isna().sum()) for col in df.columns},
        "missing_pct": {
            col: round(df[col].isna().mean() * 100, 2) for col in df.columns
        },
        "numeric_columns": numeric_cols,
        "categorical_columns": df.select_dtypes(exclude="number").columns.tolist(),
        "describe": (
            df[numeric_cols].describe().fillna("").to_dict() if numeric_cols else {}
        ),
        "preview": df.head(10).fillna("").to_dict(orient="records"),
    }


# ── Missing Values ─────────────────────────────────────────────────────────────

def handle_missing(
    df: pd.DataFrame,
    column: str,
    method: str,
    value: str | None = None,
) -> pd.DataFrame:
    """
    Fill or drop missing values in a column.
    method: mean | median | mode | custom | drop_rows | drop_column
    """
    df = df.copy()
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in dataset.")

    if method == "mean":
        df[column] = df[column].fillna(df[column].mean())
    elif method == "median":
        df[column] = df[column].fillna(df[column].median())
    elif method == "mode":
        mode_val = df[column].mode()
        if not mode_val.empty:
            df[column] = df[column].fillna(mode_val.iloc[0])
    elif method == "custom":
        if value is None:
            raise ValueError("Custom fill requires a 'value' parameter.")
        # Try numeric cast
        try:
            df[column] = df[column].fillna(float(value))
        except (ValueError, TypeError):
            df[column] = df[column].fillna(value)
    elif method == "drop_rows":
        df = df.dropna(subset=[column]).reset_index(drop=True)
    elif method == "drop_column":
        df = df.drop(columns=[column])
    else:
        raise ValueError(f"Unknown missing method: '{method}'")

    return df


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop_duplicates().reset_index(drop=True)


# ── Outlier Handling ───────────────────────────────────────────────────────────

def handle_outliers_iqr(
    df: pd.DataFrame, column: str, action: str = "remove"
) -> pd.DataFrame:
    """IQR-based outlier handling. action: remove | cap"""
    df = df.copy()
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found.")
    q1 = df[column].quantile(0.25)
    q3 = df[column].quantile(0.75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr

    if action == "remove":
        df = df[(df[column] >= lower) & (df[column] <= upper)].reset_index(drop=True)
    else:  # cap
        df[column] = df[column].clip(lower, upper)
    return df


def handle_outliers_zscore(
    df: pd.DataFrame, column: str, threshold: float = 3.0, action: str = "remove"
) -> pd.DataFrame:
    """Z-score outlier handling. action: remove | cap"""
    df = df.copy()
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found.")
    col_mean = df[column].mean()
    col_std = df[column].std()
    if col_std == 0:
        return df  # no variance, nothing to do
    z_scores = np.abs((df[column] - col_mean) / col_std)

    if action == "remove":
        df = df[z_scores < threshold].reset_index(drop=True)
    else:  # cap
        df[column] = df[column].clip(
            col_mean - threshold * col_std, col_mean + threshold * col_std
        )
    return df


# ── Feature Engineering ────────────────────────────────────────────────────────

def encode_column(df: pd.DataFrame, column: str, method: str) -> pd.DataFrame:
    """Encode a categorical column. method: onehot | label"""
    df = df.copy()
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found.")

    if method == "onehot":
        dummies = pd.get_dummies(df[column], prefix=column, dtype=int)
        df = pd.concat([df.drop(columns=[column]), dummies], axis=1)
    elif method == "label":
        le = LabelEncoder()
        df[column] = le.fit_transform(df[column].astype(str))
    else:
        raise ValueError(f"Unknown encoding method: '{method}'")
    return df


def scale_columns(df: pd.DataFrame, columns: list[str], method: str) -> pd.DataFrame:
    """Scale numeric columns. method: minmax | standard"""
    df = df.copy()
    missing = [c for c in columns if c not in df.columns]
    if missing:
        raise ValueError(f"Columns not found: {missing}")

    scaler = MinMaxScaler() if method == "minmax" else StandardScaler()
    df[columns] = scaler.fit_transform(df[columns])
    return df
