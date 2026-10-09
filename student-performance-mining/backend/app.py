"""
Flask REST API - Student Performance Analytics.

Run:  python backend/app.py      (serves http://localhost:5000)

Workflow:  upload/load -> /api/preprocess -> /api/train -> /api/confusion-matrix,
           /api/decision-tree, /api/model-comparison -> /api/predict
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # so "import config" works anywhere

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory


from flask_cors import CORS
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from config import DEFAULT_DATASET, ID_COL, MAX_UPLOAD_MB, RANDOM_STATE, TARGET, UPLOAD_DIR, VALID_RANGES
from models import ml
from preprocessing import cleaning
from services import analytics, tables
from services.state import state

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
CORS(app)


# ------------------------------------------------------------------ helpers
class ApiError(Exception):
    def __init__(self, message, status=400, details=None):
        self.message, self.status, self.details = message, status, details


def to_py(obj):
    """Make numpy / pandas values JSON-safe (NaN -> null)."""
    if isinstance(obj, dict):
        return {str(k): to_py(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_py(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        return None if not np.isfinite(obj) else float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj


def ok(data, status=200):
    return jsonify(to_py(data)), status


def require_data():
    if not state.loaded:
        raise ApiError("No dataset is loaded. Upload a CSV first.", 409)
    return state.working


def get_trained(key=None):
    if not state.models:
        raise ApiError("No model has been trained yet. Open Model Training and train a model first.", 404)
    key = key or ("decision_tree" if "decision_tree" in state.models else next(iter(state.models)))
    if key not in state.models:
        raise ApiError(f"Model '{key}' has not been trained yet.", 404)
    return key, state.models[key]


@app.get("/")
def frontend_index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/<path:path>")
def frontend_files(path):
    # Let React Router handle client-side routes, while serving built assets normally.
    target = os.path.join(app.static_folder, path)
    if os.path.isfile(target):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


@app.errorhandler(ApiError)
def handle_api_error(e):
    return jsonify({"error": e.message, "details": e.details}), e.status


@app.errorhandler(cleaning.DataError)
@app.errorhandler(ml.MLError)
def handle_value_error(e):
    return jsonify({"error": str(e)}), 400


@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": f"File too large. Maximum size is {MAX_UPLOAD_MB} MB."}), 413


@app.errorhandler(Exception)
def unexpected(e):
    app.logger.exception(e)
    return jsonify({"error": "Unexpected server error.", "details": str(e)}), 500


def load_default():
    state.load(cleaning.load_csv(DEFAULT_DATASET), DEFAULT_DATASET.name, "default")


def feature_schema(df):
    """Describes the input form for the prediction page."""
    numeric, categorical = cleaning.feature_columns(df)
    fields = []
    for c in numeric:
        lo, hi = VALID_RANGES.get(c, (float(df[c].min()), float(df[c].max())))
        series = df[c].where(df[c].between(lo, hi))
        step = 0.5 if c == "Study_Hours" else 1
        fields.append({"name": c, "kind": "numeric", "min": lo, "max": hi, "step": step,
                       "median": round(float(series.median()), 1), "mean": round(float(series.mean()), 1)})
    for c in categorical:
        opts = sorted(str(v) for v in df[c].dropna().unique())
        order = [o for o in ("Low", "Medium", "High") if o in opts]
        fields.append({"name": c, "kind": "categorical", "options": order if len(order) == len(opts) else opts,
                       "default": str(df[c].mode().iloc[0])})
    return fields


def categories_of(df):
    return {c: sorted(str(v) for v in df[c].dropna().unique()) for c in cleaning.feature_columns(df)[1]}


def summary(entry):
    r = entry["result"]
    return {k: r[k] for k in ("model", "label", "split", "accuracy", "precision", "recall", "f1", "macro_f1", "cv", "train_seconds")}


# ------------------------------------------------------------------ routes
@app.get("/api/health")
def health():
    return ok({"status": "running", "dataset_loaded": state.loaded})


@app.get("/api/status")
def status():
    df = require_data()
    return ok({"dataset": state.name, "source": state.source, "records": len(df), "preprocessed": state.preprocessed,
               "config": state.config, "trained": {k: summary(v) for k, v in state.models.items()},
               "schema": feature_schema(df), "target": TARGET, "id_column": ID_COL if ID_COL in df.columns else None,
               "models": ml.MODEL_INFO})


@app.get("/api/dataset")
def dataset():
    require_data()
    a = request.args
    source = a.get("source", "working")
    df = state.raw if source == "raw" else state.working
    result = tables.query_table(df, a.get("page", 1), a.get("page_size", 25), a.get("search", ""),
                                a.get("sort"), a.get("order", "asc"), a.get("performance", ""), a.get("flag", "all"))
    q = cleaning.quality_report(df)
    return ok({**result, "columns": cleaning.column_details(df), "source": source, "dataset": state.name,
               "info": {k: q[k] for k in ("records", "attributes", "missing_total", "duplicates", "invalid_total")},
               "classes": analytics.class_order(df[TARGET].dropna().astype(str).unique())})


@app.post("/api/upload")
def upload():
    file = request.files.get("file")
    if file is None or not file.filename:
        raise ApiError("No file received. Choose a .csv file to upload.")
    if not file.filename.lower().endswith(".csv"):
        raise ApiError("Only .csv files are supported.")
    df = cleaning.load_csv(file)        # raises DataError with a helpful message
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    state.load(df, Path(file.filename).name, "upload")
    return ok({"message": f"Loaded {len(df)} records from {file.filename}.", "quality": state.raw_quality()})


@app.post("/api/reset")
def reset():
    load_default()
    return ok({"message": "Default student_performance.csv restored."})


@app.get("/api/statistics")
def statistics():
    return ok(analytics.dashboard(require_data()))


@app.get("/api/insights")
def get_insights():
    return ok({"insights": analytics.insights(require_data())})


@app.get("/api/visualizations")
def get_visualizations():
    return ok(analytics.visualizations(require_data()))


@app.get("/api/preprocess")
def preprocess_status():
    require_data()
    return ok({"preprocessed": state.preprocessed, "config": state.config, "log": state.log,
               "before": state.raw_quality(), "after": cleaning.quality_report(state.working),
               "ranking": analytics.feature_ranking(state.working)})


@app.post("/api/preprocess")
def preprocess():
    require_data()
    body = request.get_json(silent=True) or {}
    config = {"remove_duplicates": bool(body.get("remove_duplicates", True)),
              "missing_strategy": body.get("missing_strategy", "median"),
              "fix_invalid": bool(body.get("fix_invalid", True)), "scale": bool(body.get("scale", True))}
    clean, log = cleaning.preprocess(state.raw, config["remove_duplicates"], config["missing_strategy"], config["fix_invalid"])
    if len(clean) < 50:
        raise ApiError(f"Only {len(clean)} rows would remain with these options - too few to train. Choose 'median' or 'mean' instead of 'drop'.")
    state.apply_preprocessing(clean, config, log)
    return preprocess_status()


@app.post("/api/train")
def train():
    df = require_data()
    body = request.get_json(silent=True) or {}
    key = body.get("model", "decision_tree")
    keys = list(ml.MODEL_INFO) if key == "all" else [key]
    test_size = float(body.get("test_size", 0.2))
    do_cv = bool(body.get("cross_validation", True))
    folds = int(body.get("cv_folds", 10))
    max_depth = int(body.get("max_depth", 4))
    if not 2 <= max_depth <= 8:
        raise ApiError("max_depth must be between 2 and 8.")
    if not 2 <= folds <= 20:
        raise ApiError("cv_folds must be between 2 and 20.")
    scale = state.config.get("scale", True)
    results = []
    with state.lock:
        for k in keys:
            pipe, result, baseline = ml.train_model(df, k, test_size, do_cv, folds, max_depth, scale)
            state.models[k] = {"pipeline": pipe, "result": result, "baseline": baseline,
                               "categories": categories_of(df)}
            results.append(result)
    return ok({"results": results})


@app.get("/api/model-comparison")
def model_comparison():
    require_data()
    rows = [summary(v) for v in state.models.values()]
    best = max(rows, key=lambda r: (r["accuracy"], r["f1"]))["model"] if rows else None
    return ok({"models": rows, "best": best})


@app.get("/api/confusion-matrix")
def confusion():
    key, entry = get_trained(request.args.get("model"))
    r = entry["result"]
    return ok({"model": key, "label": r["label"], "labels": r["labels"], "matrix": r["confusion_matrix"],
               "per_class": r["per_class"], "accuracy": r["accuracy"], "n_test": r["n_test"], "split": r["split"],
               "feature_importance": r["feature_importance"], "cv": r["cv"], "result": r})


@app.get("/api/decision-tree")
def decision_tree():
    if "decision_tree" not in state.models:
        raise ApiError("The Decision Tree has not been trained yet.", 404)
    entry = state.models["decision_tree"]
    out = ml.export_tree(entry["pipeline"])
    r = entry["result"]
    return ok({**out, "accuracy": r["accuracy"], "split": r["split"], "params": r["params"], "cv": r["cv"]})


@app.post("/api/predict")
def predict():
    df = require_data()
    body = request.get_json(silent=True) or {}
    key, entry = get_trained(body.get("model"))
    meta = entry["baseline"]
    row, errors = ml.validate_input(body.get("features") or {}, meta["numeric"], meta["categorical"], entry["categories"])
    if errors:
        raise ApiError("Please correct the highlighted fields.", 422, errors)
    if all(pd.isna(v) for v in row.values()):
        raise ApiError("Enter at least one value to predict.", 422)
    out = ml.predict_one(entry, row)
    bench = analytics.Benchmarks(df)
    out["support_category"] = analytics.support_category(out["prediction"], meta["classes"])
    out["suggestions"] = bench.weak_areas(row) if out["support_category"] != "Performing Well" else []
    out["model"], out["model_label"] = key, entry["result"]["label"]
    out["model_accuracy"] = entry["result"]["accuracy"]
    return ok(out)


@app.get("/api/support-insights")
def support_insights():
    df = require_data()
    key, entry = get_trained(request.args.get("model"))
    meta = entry["baseline"]
    cols = meta["numeric"] + meta["categorical"]
    data = df[df[TARGET].notna()].reset_index(drop=True)
    X, y = data[cols], data[TARGET].astype(str)
    # out-of-fold predictions: every student is predicted by a model that never saw them
    pipe = ml.build_pipeline(key, meta["numeric"], meta["categorical"], state.config.get("scale", True),
                             entry["result"]["params"].get("max_depth", 4))
    pred = cross_val_predict(pipe, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE))
    cats = [analytics.support_category(p, meta["classes"]) for p in pred]
    order = ["Performing Well", "On Track", "Needs Attention"]
    counts = {c: cats.count(c) for c in order}
    bench = analytics.Benchmarks(df)
    needs = []
    for i in [i for i, c in enumerate(cats) if c == "Needs Attention"]:
        row = data.loc[i]
        needs.append({"student": row.get(ID_COL, f"Row {i + 1}"), "predicted": pred[i],
                      "weak_areas": bench.weak_areas({c: row[c] for c in meta["numeric"]}, 3)})
    needs.sort(key=lambda n: (n["predicted"] != meta["classes"][-1], -sum(w["gap"] for w in n["weak_areas"])))
    return ok({"model": key, "label": entry["result"]["label"], "counts": counts, "total": len(data),
               "students": needs[:15], "needs_total": len(needs)})


if __name__ == "__main__":
    load_default()
    print(f"Loaded {state.name}: {len(state.working)} rows. API running on http://localhost:5000")
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
else:
    load_default()
