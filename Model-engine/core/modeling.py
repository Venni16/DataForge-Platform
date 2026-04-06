import os
import json
import joblib
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone
import base64
import io

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_curve, auc,
    r2_score, mean_absolute_error, mean_squared_error
)
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

# Classifiers
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC, SVR
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import train_test_split

# Central datasets repository mapped from data-engine
DATASETS_DIR = Path(__file__).parent.parent.parent / "data-engine" / "datasets"

def get_model_dir(dataset_id: str) -> Path:
    p = DATASETS_DIR / dataset_id / "_models"
    p.mkdir(parents=True, exist_ok=True)
    return p

def _load_version(dataset_id: str, version_id: int = None) -> pd.DataFrame:
    dataset_dir = DATASETS_DIR / dataset_id
    if version_id is None:
        versions = [int(f.stem[1:]) for f in dataset_dir.glob("v*.csv") if f.stem[1:].isdigit()]
        if not versions:
            raise FileNotFoundError("No versions found.")
        version_id = max(versions)
    
    path = dataset_dir / f"v{version_id}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Version v{version_id} not found.")
    return pd.read_csv(path)

def get_algorithm_instance(task_type: str, algorithm: str, hyperparams: dict = None):
    hp = hyperparams or {}
    algo = algorithm.lower().replace(" ", "").replace("_", "")
    
    if task_type == "classification":
        if algo in ["logisticregression", "lr"]: return LogisticRegression(**hp)
        if algo in ["decisiontree", "dt"]: return DecisionTreeClassifier(**hp)
        if algo in ["randomforest", "rf"]: return RandomForestClassifier(**hp)
        if algo in ["knn", "kneighbors"]: return KNeighborsClassifier(**hp)
        if algo in ["svm", "svc"]: return SVC(probability=True, **hp)
        if algo in ["naivebayes", "nb"]: return GaussianNB(**hp)
    elif task_type == "regression":
        if algo in ["linearregression", "lr"]: return LinearRegression(**hp)
        if algo in ["decisiontreeregressor", "dt"]: return DecisionTreeRegressor(**hp)
        if algo in ["randomforestregressor", "rf"]: return RandomForestRegressor(**hp)
        if algo in ["svr", "svm"]: return SVR(**hp)
        
    raise ValueError(f"Unsupported algorithm '{algorithm}' for task '{task_type}'")

def build_preprocessing_pipeline(df_features: pd.DataFrame):
    """Build a robust pipeline that imputes and scales to prevent data leakage."""
    numeric_cols = df_features.select_dtypes(include=['int64', 'float64']).columns.tolist()
    categorical_cols = df_features.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
    
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='mean')),
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_cols),
            ('cat', categorical_transformer, categorical_cols)
        ]
    )
    return preprocessor

def train_and_save_model(req):
    df = _load_version(req.dataset_id, req.version_id)
    
    if req.target_column not in df.columns:
        raise ValueError(f"Target column '{req.target_column}' not found.")
        
    features = req.feature_columns if req.feature_columns else [c for c in df.columns if c != req.target_column]
    
    X = df[features]
    y = df[req.target_column]
    
    # Train test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.random_state
    )
    
    # Build complete pipeline
    preprocessor = build_preprocessing_pipeline(X)
    model = get_algorithm_instance(req.task_type, req.algorithm, req.hyperparameters)
    
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier' if req.task_type == 'classification' else 'regressor', model)
    ])
    
    # Fit everything on training data to explicitly prevent data leakage
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    y_pred = pipeline.predict(X_test)
    metrics = {}
    
    if req.task_type == "classification":
        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred, average='weighted', zero_division=0),
            "recall": recall_score(y_test, y_pred, average='weighted', zero_division=0),
            "f1_score": f1_score(y_test, y_pred, average='weighted', zero_division=0)
        }
    else:
        metrics = {
            "r2_score": r2_score(y_test, y_pred),
            "mae": mean_absolute_error(y_test, y_pred),
            "mse": mean_squared_error(y_test, y_pred)
        }
        
    # Save Model
    model_id = f"{req.algorithm.replace(' ', '_').lower()}_{int(datetime.now(timezone.utc).timestamp())}"
    mdir = get_model_dir(req.dataset_id)
    
    # Serialize Pipeline (including Scalers & Encoders)
    joblib.dump(pipeline, mdir / f"{model_id}.pkl")
    
    # Save Metadata
    meta = {
        "model_id": model_id,
        "dataset_id": req.dataset_id,
        "version_id": req.version_id,
        "task_type": req.task_type,
        "algorithm": req.algorithm,
        "target_column": req.target_column,
        "feature_columns": features,
        "hyperparameters": req.hyperparameters or {},
        "metrics": metrics,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    with open(mdir / f"{model_id}.json", "w") as f:
        json.dump(meta, f, indent=2)
        
    return meta

def get_models(dataset_id: str):
    mdir = get_model_dir(dataset_id)
    models = []
    for f in mdir.glob("*.json"):
        try:
            with open(f, "r") as file:
                models.append(json.load(file))
        except Exception:
            pass
    return sorted(models, key=lambda x: x.get("timestamp", ""), reverse=True)

def load_model_and_meta(dataset_id: str, model_id: str):
    mdir = get_model_dir(dataset_id)
    meta_path = mdir / f"{model_id}.json"
    pkl_path = mdir / f"{model_id}.pkl"
    
    if not pkl_path.exists() or not meta_path.exists():
        raise FileNotFoundError("Model files not found.")
        
    with open(meta_path, "r") as f:
        meta = json.load(f)
        
    pipeline = joblib.load(pkl_path)
    return pipeline, meta

def generate_evaluation_plots(dataset_id: str, model_id: str):
    pipeline, meta = load_model_and_meta(dataset_id, model_id)
    df = _load_version(dataset_id, meta.get("version_id"))
    
    X = df[meta["feature_columns"]]
    y_true = df[meta["target_column"]]
    y_pred = pipeline.predict(X)
    
    plots = {}
    
    # Generate Heatmap / ROC or Residuals based on task type
    if meta["task_type"] == "classification":
        # Confusion Matrix
        cm = confusion_matrix(y_true, y_pred)
        fig, ax = plt.subplots(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax)
        ax.set_title("Confusion Matrix Heatmap")
        ax.set_ylabel("True Label")
        ax.set_xlabel("Predicted Label")
        
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches='tight')
        buf.seek(0)
        plots["confusion_matrix"] = base64.b64encode(buf.read()).decode("utf-8")
        plt.close(fig)
        
    else:
        # Residual Plot
        fig, ax = plt.subplots(figsize=(6, 5))
        residuals = y_true - y_pred
        sns.scatterplot(x=y_pred, y=residuals, alpha=0.6, ax=ax)
        ax.axhline(0, color='red', linestyle='--')
        ax.set_title("Residual Plot")
        ax.set_xlabel("Predicted Values")
        ax.set_ylabel("Residuals")
        
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches='tight')
        buf.seek(0)
        plots["residual_plot"] = base64.b64encode(buf.read()).decode("utf-8")
        plt.close(fig)
        
    return plots

def predict_data(dataset_id: str, model_id: str, data: list):
    pipeline, meta = load_model_and_meta(dataset_id, model_id)
    df_input = pd.DataFrame(data)
    
    # Add dummy target column if extremely strict preprocessing pipeline fails without it
    # No, ColumnTransformer only applies to specified columns, target is ignored if not in features
    
    predictions = pipeline.predict(df_input[meta["feature_columns"]])
    
    results = []
    if meta["task_type"] == "classification" and hasattr(pipeline, "predict_proba"):
        try:
            probs = pipeline.predict_proba(df_input[meta["feature_columns"]])
            for i, p in enumerate(predictions):
                results.append({"prediction": p, "probability": probs[i].max()})
            return results
        except Exception:
            pass
            
    for p in predictions:
        results.append({"prediction": float(p) if pd.api.types.is_numeric_dtype(type(p)) else p})
        
    return results

