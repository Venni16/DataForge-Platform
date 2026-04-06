"""
Visualization router — generates chart images and returns them as base64 PNG strings.
Supports: histogram, scatter, box, heatmap, pairplot.
"""
import base64
import io
from typing import List, Optional

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend — must be set before pyplot import
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.versioning import get_latest_version, load_version

router = APIRouter()

# Dark terminal-esque chart theme
CHART_STYLE = {
    "figure.facecolor": "#0d0e11",
    "axes.facecolor": "#13151a",
    "axes.edgecolor": "#2a2d35",
    "axes.labelcolor": "#c9cdd8",
    "xtick.color": "#8b8fa8",
    "ytick.color": "#8b8fa8",
    "text.color": "#c9cdd8",
    "grid.color": "#1e2028",
    "grid.linestyle": "--",
}


class VisualizeRequest(BaseModel):
    dataset_id: str
    chart_type: str           # histogram | scatter | box | heatmap | pairplot
    column: Optional[str] = None
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    columns: Optional[List[str]] = None
    interactive: bool = False


def _fig_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=120)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return b64


@router.post("/visualize")
def visualize(req: VisualizeRequest):
    """Generate a chart for the current dataset version."""
    try:
        version = get_latest_version(req.dataset_id)
        if version == 0:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        df = load_version(req.dataset_id, version)
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        chart_type = req.chart_type.lower()

        # Handle Interactive (Plotly)
        if req.interactive and chart_type != "pairplot":
            # DataForge Dark Theme Template
            dark_template = "plotly_dark"
            
            if chart_type == "histogram":
                col = req.column or (numeric_cols[0] if numeric_cols else None)
                if col is None: raise HTTPException(status_code=400, detail="No numeric columns.")
                fig = px.histogram(df, x=col, template=dark_template, color_discrete_sequence=["#f59e0b"], marginal="box")
                fig.update_layout(title=f"Interactive Histogram — {col}")
            
            elif chart_type == "scatter":
                x_col = req.x_column or (numeric_cols[0] if len(numeric_cols) > 0 else None)
                y_col = req.y_column or (numeric_cols[1] if len(numeric_cols) > 1 else None)
                if not x_col or not y_col: raise HTTPException(status_code=400, detail="Need 2 numeric columns.")
                fig = px.scatter(df, x=x_col, y=y_col, template=dark_template, color_discrete_sequence=["#3b82f6"], opacity=0.6)
                fig.update_layout(title=f"Interactive Scatter — {x_col} vs {y_col}")

            elif chart_type == "box":
                col = req.column or (numeric_cols[0] if numeric_cols else None)
                if col is None: raise HTTPException(status_code=400, detail="No numeric columns.")
                fig = px.box(df, y=col, template=dark_template, color_discrete_sequence=["#06b6d4"])
                fig.update_layout(title=f"Interactive Box Plot — {col}")

            elif chart_type == "heatmap":
                if len(numeric_cols) < 2: raise HTTPException(status_code=400, detail="Need 2 numeric columns.")
                corr = df[numeric_cols].corr()
                fig = px.imshow(corr, text_auto=".2f", template=dark_template, aspect="auto", color_continuous_scale="RdYlBu_r")
                fig.update_layout(title="Interactive Correlation Heatmap")
            
            else:
                raise HTTPException(status_code=400, detail=f"Interactive mode not supported for {chart_type}")

            return {"chart_type": chart_type, "interactive": True, "plot_data": json.loads(fig.to_json())}

        # Handle Static (Matplotlib/Seaborn)
        with plt.rc_context(CHART_STYLE):
            if chart_type == "histogram":
                col = req.column or (numeric_cols[0] if numeric_cols else None)
                if col is None:
                    raise HTTPException(status_code=400, detail="No numeric columns available.")
                fig, ax = plt.subplots(figsize=(10, 6))
                sns.histplot(df[col].dropna(), ax=ax, kde=True, color="#f59e0b", alpha=0.8)
                ax.set_title(f"Histogram — {col}", fontsize=14, pad=12)
                ax.set_xlabel(col)

            elif chart_type == "scatter":
                if not req.x_column or not req.y_column:
                    if len(numeric_cols) < 2:
                        raise HTTPException(status_code=400, detail="Need at least 2 numeric columns for scatter.")
                    x_col, y_col = numeric_cols[0], numeric_cols[1]
                else:
                    x_col, y_col = req.x_column, req.y_column
                fig, ax = plt.subplots(figsize=(10, 6))
                sns.scatterplot(data=df, x=x_col, y=y_col, ax=ax, color="#3b82f6", alpha=0.7, s=40)
                ax.set_title(f"Scatter — {x_col} vs {y_col}", fontsize=14, pad=12)

            elif chart_type == "box":
                col = req.column or (numeric_cols[0] if numeric_cols else None)
                if col is None:
                    raise HTTPException(status_code=400, detail="No numeric columns available.")
                fig, ax = plt.subplots(figsize=(8, 7))
                sns.boxplot(y=df[col].dropna(), ax=ax, color="#06b6d4", width=0.5)
                ax.set_title(f"Box Plot — {col}", fontsize=14, pad=12)

            elif chart_type == "heatmap":
                if len(numeric_cols) < 2:
                    raise HTTPException(status_code=400, detail="Need at least 2 numeric columns for heatmap.")
                fig, ax = plt.subplots(figsize=(max(8, len(numeric_cols)), max(6, len(numeric_cols) - 1)))
                corr = df[numeric_cols].corr()
                sns.heatmap(
                    corr, annot=True, fmt=".2f", ax=ax,
                    cmap="RdYlBu_r", center=0,
                    annot_kws={"size": 9}, linewidths=0.5,
                )
                ax.set_title("Correlation Heatmap", fontsize=14, pad=12)

            elif chart_type == "pairplot":
                cols = req.columns or numeric_cols[:5]
                if len(cols) < 2:
                    raise HTTPException(status_code=400, detail="Need at least 2 columns for pairplot.")
                subset = df[cols].dropna()
                pair_grid = sns.pairplot(
                    subset, plot_kws={"alpha": 0.5, "color": "#f59e0b", "s": 20},
                    diag_kws={"color": "#3b82f6"},
                )
                pair_grid.figure.patch.set_facecolor("#0d0e11")
                return {"chart_type": chart_type, "interactive": False, "image": _fig_to_base64(pair_grid.figure)}

            else:
                raise HTTPException(status_code=400, detail=f"Unknown chart type: '{chart_type}'")

            fig.tight_layout()
            return {"chart_type": chart_type, "interactive": False, "image": _fig_to_base64(fig)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
